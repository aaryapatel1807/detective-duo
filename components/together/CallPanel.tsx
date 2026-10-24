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
  initialCallState,
  shouldAnswerOffer,
  type CallSignal,
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

  const send = useCallback((sig: CallSignal) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: sig });
  }, []);

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection({
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
    pcRef.current = pc;
    return pc;
  }, [meUid, send]);

  const handleSignal = useCallback(
    async (sig: CallSignal) => {
      if (!joinedRef.current) return;
      try {
        if (sig.type === 'call-join') {
          dispatch({ type: 'peer-joined' });
          if (!pcRef.current) {
            const pc = createPc();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send(buildSignal('call-offer', meUid, { sdp: offer.sdp ?? '' }));
          }
          return;
        }
        if (sig.type === 'call-leave') {
          pcRef.current?.close();
          pcRef.current = null;
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
          const pc = pcRef.current ?? createPc();
          if (pc.signalingState !== 'stable') {
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription({ type: 'offer', sdp: sig.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send(buildSignal('call-answer', meUid, { sdp: answer.sdp ?? '' }));
          return;
        }
        if (sig.type === 'call-answer' && sig.sdp && pcRef.current) {
          if (pcRef.current.signalingState !== 'stable') {
            await pcRef.current.setRemoteDescription({ type: 'answer', sdp: sig.sdp });
          }
          return;
        }
        if (sig.type === 'call-ice' && sig.candidate && pcRef.current) {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate({
              candidate: sig.candidate.candidate,
              sdpMid: sig.candidate.sdpMid,
              sdpMLineIndex: sig.candidate.sdpMLineIndex,
            }),
          );
        }
      } catch {
        // A failed handshake just means no call; the game is unaffected.
      }
    },
    [createPc, meUid, send],
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
    ch.subscribe();
    return () => {
      void sb.removeChannel(ch);
      channelRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      joinedRef.current = false;
    };
  }, [code, meUid, handleSignal]);

  const join = useCallback(async () => {
    dispatch({ type: 'join' });
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        // Audio-only is better than nothing.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        dispatch({ type: 'toggle-camera' }); // camera was on; now it is off.
      }
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      joinedRef.current = true;
      dispatch({ type: 'joined' });
      send(buildSignal('call-join', meUid));
    } catch {
      dispatch({
        type: 'unavailable',
        message:
          'Microphone or camera permission was denied, so the call cannot start. The game still works fine without it.',
      });
    }
  }, [meUid, send]);

  const leave = useCallback(() => {
    send(buildSignal('call-leave', meUid));
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    joinedRef.current = false;
    dispatch({ type: 'leave' });
  }, [meUid, send]);

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
          {state.error && <p className="mt-1 text-sm">{state.error}</p>}
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
