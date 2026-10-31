'use client';

/**
 * CallPanel: opt-in video + voice calling inside a together room.
 *
 * WebRTC peer-to-peer; signaling rides the existing Supabase Realtime
 * broadcast channel `dd-call-<CODE>` (see lib/together/call.ts). The
 * call is never auto-started — one tap on "Join call" — and it never
 * records or stores anything. If permission is denied or the browser
 * cannot call, a clear message says so and the game works fully
 * without it.
 *
 * In local-only mode (no Supabase configured) there is no second
 * device to call, so the panel says so plainly instead of pretending.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Video } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  buildSignal,
  callChannel,
  callReducer,
  canCall,
  CHANNEL_CONNECT_FAILED_MESSAGE,
  flushBufferedCandidates,
  HANDSHAKE_FAILED_MESSAGE,
  initialCallState,
  isPeerConnectionDead,
  PEER_TO_PEER_BLOCKED_MESSAGE,
  queueIceCandidate,
  shouldAnswerOffer,
  waitForSubscription,
  type CallSignal,
  type IceCandidateJson,
} from '@/lib/together/call';

export default function CallPanel({
  code,
  meUid,
  isHost,
}: {
  code: string;
  meUid: string;
  isHost: boolean;
}) {
  const [state, dispatch] = useReducer(callReducer, undefined, initialCallState);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getSupabase>>['channel']
  > | null>(null);
  const joinedRef = useRef(false);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  // ICE candidates that arrived before the remote description was set.
  const pendingIceRef = useRef<IceCandidateJson[]>([]);
  // Call-channel subscription gate: call-join must never be sent until
  // this promise has resolved (see the mount effect and join()).
  const subscribedRef = useRef(false);
  const subscribePromiseRef = useRef<Promise<void> | null>(null);
  // Mirror of state.cameraOn for the booth event listeners (registered
  // once, so they cannot read fresh reducer state directly).
  const cameraOnRef = useRef(true);
  cameraOnRef.current = state.cameraOn;

  const send = useCallback((sig: CallSignal) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: sig });
  }, []);

  /**
   * Close any existing connection, null the ref, and drop buffered
   * candidates — never reuse a closed/failed RTCPeerConnection, and
   * never flush one session's candidates into the next.
   */
  const resetPeerConnection = useCallback(() => {
    const old = pcRef.current;
    pcRef.current = null;
    pendingIceRef.current = [];
    if (old) {
      try {
        old.onicecandidate = null;
        old.ontrack = null;
        old.onconnectionstatechange = null;
        old.close();
      } catch {
        // Closing an already-dead connection must not break teardown.
      }
    }
  }, []);

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection({
      // ₹0: STUN only, no paid TURN server (see call.ts).
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    const stream = streamRef.current;
    stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send(
          buildSignal('call-ice', meUid, {
            candidate: {
              candidate: e.candidate.candidate,
              sdpMid: e.candidate.sdpMid,
              sdpMLineIndex: e.candidate.sdpMLineIndex,
            },
          }),
        );
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0] ?? null;
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        dispatch({ type: 'error', message: PEER_TO_PEER_BLOCKED_MESSAGE });
      }
    };
    pcRef.current = pc;
    return pc;
  }, [meUid, send]);

  /** Recreate cleanly: close/null/clear first, then build a fresh pc. */
  const recreatePc = useCallback(() => {
    resetPeerConnection();
    return createPc();
  }, [createPc, resetPeerConnection]);

  /** Reuse a live connection, or recreate cleanly if it is dead. */
  const getOrRecreatePc = useCallback(() => {
    const existing = pcRef.current;
    if (existing && !isPeerConnectionDead(existing)) return existing;
    return recreatePc();
  }, [recreatePc]);

  const handleSignal = useCallback(
    async (sig: CallSignal) => {
      if (!joinedRef.current) return;
      try {
        if (sig.type === 'call-join') {
          dispatch({ type: 'peer-joined' });
          // A re-join means the peer started a fresh session: the old
          // connection (if any) belongs to their dead session, so
          // recreate cleanly instead of renegotiating over it.
          const pc = recreatePc();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send(buildSignal('call-offer', meUid, { sdp: offer.sdp ?? '' }));
          return;
        }
        if (sig.type === 'call-leave') {
          resetPeerConnection();
          dispatch({ type: 'peer-left' });
          return;
        }
        if (sig.type === 'call-offer' && sig.sdp) {
          const hasLocalOffer = pcRef.current
            ? pcRef.current.signalingState !== 'stable'
            : false;
          if (pcRef.current && !shouldAnswerOffer(isHostRef.current, hasLocalOffer)) {
            return; // host holds its own offer; the guest yields.
          }
          const pc = getOrRecreatePc();
          if (pc.signalingState !== 'stable') {
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription({ type: 'offer', sdp: sig.sdp });
          await flushBufferedCandidates(pendingIceRef.current, async (c) => {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send(buildSignal('call-answer', meUid, { sdp: answer.sdp ?? '' }));
          return;
        }
        if (sig.type === 'call-answer' && sig.sdp && pcRef.current) {
          const pc = pcRef.current;
          if (isPeerConnectionDead(pc)) return; // failure already surfaced; retry restarts it.
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription({ type: 'answer', sdp: sig.sdp });
            await flushBufferedCandidates(pendingIceRef.current, async (c) => {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            });
          }
          return;
        }
        if (sig.type === 'call-ice' && sig.candidate) {
          const pc = pcRef.current;
          if (!pc || !pc.remoteDescription) {
            // Too early: adding now would throw. Buffer and flush once
            // the remote description lands (offer or answer path above).
            queueIceCandidate(pendingIceRef.current, sig.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
            } catch {
              queueIceCandidate(pendingIceRef.current, sig.candidate);
            }
          }
        }
      } catch {
        // Surface the failure with a retry instead of silently dropping
        // the call; the game itself is unaffected.
        dispatch({ type: 'error', message: HANDSHAKE_FAILED_MESSAGE });
      }
    },
    [getOrRecreatePc, meUid, recreatePc, resetPeerConnection, send],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      dispatch({
        type: 'unavailable',
        message: 'Calls need the shared project — in local-only mode there is no second device to call.',
      });
      return;
    }
    const cap = canCall();
    if (!cap.ok) {
      dispatch({ type: 'unavailable', message: cap.reason ?? 'Calling is not available here.' });
      return;
    }
    const sb = getSupabase()!;
    const ch = sb.channel(callChannel(code), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = ch;
    ch.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const sig = payload as CallSignal | undefined;
      if (!sig || sig.from === meUid) return;
      void handleSignal(sig);
    });
    // Confirm the subscription before anyone is allowed to announce a
    // call-join: broadcasting into an unsubscribed channel reaches
    // nobody, and must surface as a failure, not a silent non-call.
    let cancelled = false;
    const gate = waitForSubscription((cb) => {
      ch.subscribe(cb);
    });
    subscribePromiseRef.current = gate;
    gate.then(
      () => {
        if (!cancelled) subscribedRef.current = true;
      },
      () => {
        if (cancelled) return;
        subscribedRef.current = false;
        dispatch({ type: 'unavailable', message: CHANNEL_CONNECT_FAILED_MESSAGE });
      },
    );
    return () => {
      cancelled = true;
      void sb.removeChannel(ch);
      channelRef.current = null;
      subscribedRef.current = false;
      subscribePromiseRef.current = null;
      resetPeerConnection();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      joinedRef.current = false;
    };
  }, [code, meUid, handleSignal, resetPeerConnection]);

  /**
   * Booth interplay (contract: the booth dispatches these window
   * events; this panel only listens). Booth-open pauses local video so
   * the booth owns the camera, audio keeps running. Booth-close
   * restores video only if the call's camera is on — if the user
   * switched it off, it stays off. No stream, no tracks, no problem:
   * every access is guarded and never throws.
   */
  useEffect(() => {
    const onBoothOpen = () => {
      try {
        streamRef.current?.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      } catch {
        // No stream yet: nothing to pause.
      }
    };
    const onBoothClose = () => {
      try {
        if (!cameraOnRef.current) return;
        streamRef.current?.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      } catch {
        // No stream yet: nothing to restore.
      }
    };
    window.addEventListener('sachi:booth-open', onBoothOpen);
    window.addEventListener('sachi:booth-close', onBoothClose);
    return () => {
      window.removeEventListener('sachi:booth-open', onBoothOpen);
      window.removeEventListener('sachi:booth-close', onBoothClose);
    };
  }, []);

  /** Shared subscription gate: true only once the channel is confirmed. */
  const awaitSubscription = useCallback(async (): Promise<boolean> => {
    try {
      const gate = subscribePromiseRef.current;
      if (!gate) return false;
      await gate;
      return subscribedRef.current;
    } catch {
      return false;
    }
  }, []);

  const join = useCallback(async () => {
    dispatch({ type: 'join' });
    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        // Audio-only is better than nothing.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        dispatch({ type: 'toggle-camera' }); // camera was on; now it is off.
      }
    } catch {
      dispatch({
        type: 'unavailable',
        message:
          'Microphone or camera permission was denied, so the call cannot start. The game still works fine without it.',
      });
      return;
    }
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    // Gate: never announce a call-join until the channel subscription
    // is confirmed. On failure, release the mic/camera and say so —
    // do not claim to have joined a call that nobody can hear.
    if (!(await awaitSubscription())) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      dispatch({ type: 'unavailable', message: CHANNEL_CONNECT_FAILED_MESSAGE });
      return;
    }
    joinedRef.current = true;
    dispatch({ type: 'joined' });
    send(buildSignal('call-join', meUid));
  }, [awaitSubscription, meUid, send]);

  /** Retry after a handshake/connection failure: clean pc, re-announce. */
  const retry = useCallback(async () => {
    resetPeerConnection();
    dispatch({ type: 'joined' }); // clears the stale error, stays in-call
    if (!(await awaitSubscription())) {
      dispatch({ type: 'unavailable', message: CHANNEL_CONNECT_FAILED_MESSAGE });
      return;
    }
    send(buildSignal('call-join', meUid));
  }, [awaitSubscription, resetPeerConnection, send]);

  const leave = useCallback(() => {
    send(buildSignal('call-leave', meUid));
    resetPeerConnection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    joinedRef.current = false;
    dispatch({ type: 'leave' });
  }, [meUid, resetPeerConnection, send]);

  const toggleMute = useCallback(() => {
    const next = !state.muted;
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    dispatch({ type: 'toggle-mute' });
  }, [state.muted]);

  const toggleCamera = useCallback(() => {
    const next = !state.cameraOn;
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    dispatch({ type: 'toggle-camera' });
  }, [state.cameraOn]);

  return (
    <section className="panel p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Video size={18} aria-hidden /> Call
      </h2>
      {state.status === 'idle' && (
        <>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Voice and video, just the two of you, inside this room. Never recorded,
            never stored — and the game works fine without it.
          </p>
          <button type="button" className="btn btn-primary mt-3" onClick={() => void join()}>
            <Video size={18} aria-hidden /> Join call
          </button>
        </>
      )}
      {state.status === 'joining' && (
        <p className="mt-1 text-sm text-[var(--ink-dim)]">Joining the call…</p>
      )}
      {state.status === 'unavailable' && (
        <>
          <p className="mt-1 text-sm">{state.error}</p>
          <button type="button" className="btn mt-3" onClick={() => dispatch({ type: 'leave' })}>
            Try again
          </button>
        </>
      )}
      {state.status === 'in-call' && (
        <>
          {state.error && (
            <div className="mt-1">
              <p className="text-sm">{state.error}</p>
              <button type="button" className="btn mt-2" onClick={() => void retry()}>
                Retry call
              </button>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full rounded-xl bg-black object-cover"
                aria-label="Your camera"
              />
              <p className="mt-1 text-center text-xs text-[var(--ink-dim)]">You</p>
            </div>
            <div>
              {state.peerJoined ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="aspect-video w-full rounded-xl bg-black object-cover"
                  aria-label="Your partner's camera"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black/10 p-2 text-center text-xs text-[var(--ink-dim)]">
                  Waiting for your partner to join the call…
                </div>
              )}
              <p className="mt-1 text-center text-xs text-[var(--ink-dim)]">Your partner</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={toggleMute}>
              {state.muted ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
              {state.muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" className="btn" onClick={toggleCamera}>
              {state.cameraOn ? <Camera size={18} aria-hidden /> : <CameraOff size={18} aria-hidden />}
              {state.cameraOn ? 'Camera off' : 'Camera on'}
            </button>
            <button type="button" className="btn" onClick={leave}>
              <PhoneOff size={18} aria-hidden /> Leave call
            </button>
          </div>
        </>
      )}
    </section>
  );
}
