/**
 * Call signaling for together rooms (Phase 6).
 *
 * WebRTC peer-to-peer, with signaling carried on the existing Supabase
 * Realtime broadcast channel `dd-call-<CODE>` only — no new server, no
 * paid service. The call itself is device-to-device; no call audio or
 * video is ever stored or sent anywhere else.
 *
 * This module is pure and unit-tested. The RTCPeerConnection wiring
 * lives in components/together/CallPanel.tsx.
 *
 * Signaling flow (two players, no glare for the common case):
 * - Each player who joins broadcasts `call-join`.
 * - A player who has already joined and has no connection yet answers a
 *   `call-join` by creating an offer. So the second joiner's message is
 *   what starts the handshake.
 * - If both join at the same instant and both offer, the polite-peer
 *   rule settles it: the host (first player in the room) ignores an
 *   incoming offer while its own offer is outstanding; the guest rolls
 *   back and answers the host's offer instead.
 */
export type CallSignalType =
  | 'call-join'
  | 'call-offer'
  | 'call-answer'
  | 'call-ice'
  | 'call-leave';

/** One ICE candidate in plain JSON form, as carried by a `call-ice` signal. */
export interface IceCandidateJson {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface CallSignal {
  type: CallSignalType;
  from: string;
  sdp?: string;
  candidate?: IceCandidateJson;
}

/**
 * Plain-language failure wording. ₹0 rule: STUN only
 * (`stun:stun.l.google.com:19302`), never a paid TURN server — so on
 * networks that block peer-to-peer traffic the honest message is that
 * the network blocked the call, not that the app broke, and the game
 * still works without it.
 */
export const PEER_TO_PEER_BLOCKED_MESSAGE =
  'The call could not connect — some mobile networks block peer-to-peer calls. The game still works fine without it.';
export const HANDSHAKE_FAILED_MESSAGE =
  'The call handshake failed. You can retry the call — the game still works fine without it.';
export const CHANNEL_CONNECT_FAILED_MESSAGE =
  'Could not connect to the call channel, so the call cannot start. The game still works fine without it.';

/** Supabase Realtime channel for one room's call signaling. */
export function callChannel(code: string): string {
  return `dd-call-${code.toUpperCase()}`;
}

export function buildSignal(
  type: CallSignalType,
  from: string,
  extra?: Partial<CallSignal>,
): CallSignal {
  return { type, from, ...extra };
}

export type CallStatus = 'idle' | 'joining' | 'in-call' | 'unavailable';

export interface CallUiState {
  status: CallStatus;
  muted: boolean;
  cameraOn: boolean;
  peerJoined: boolean;
  error: string | null;
}

export function initialCallState(): CallUiState {
  return { status: 'idle', muted: false, cameraOn: true, peerJoined: false, error: null };
}

export type CallAction =
  | { type: 'join' }
  | { type: 'joined' }
  | { type: 'leave' }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'toggle-mute' }
  | { type: 'toggle-camera' }
  | { type: 'error'; message: string }
  | { type: 'unavailable'; message: string };

export function callReducer(state: CallUiState, action: CallAction): CallUiState {
  switch (action.type) {
    case 'join':
      return { ...state, status: 'joining', error: null };
    case 'joined':
      return { ...state, status: 'in-call', error: null };
    case 'leave':
      return { ...initialCallState() };
    case 'peer-joined':
      return { ...state, peerJoined: true };
    case 'peer-left':
      return { ...state, peerJoined: false };
    case 'toggle-mute':
      return { ...state, muted: !state.muted };
    case 'toggle-camera':
      return { ...state, cameraOn: !state.cameraOn };
    case 'error':
      return { ...state, status: 'in-call', error: action.message };
    case 'unavailable':
      return { ...initialCallState(), status: 'unavailable', error: action.message };
    default:
      return state;
  }
}

/**
 * Polite-peer rule for offer glare. With no outstanding local offer,
 * anyone answers. With one outstanding, the host (first player) holds
 * its ground and ignores the incoming offer; the guest rolls back and
 * answers the host's offer instead.
 */
export function shouldAnswerOffer(isHost: boolean, hasLocalOffer: boolean): boolean {
  if (!hasLocalOffer) return true;
  return !isHost;
}

/**
 * Buffered incoming ICE candidates.
 *
 * Candidates can arrive before the remote description is set (the
 * offer/answer may still be in flight), and calling addIceCandidate
 * that early throws. So early candidates are queued here and flushed,
 * in arrival order, the moment the remote description lands — in both
 * the offer-answer path and the answer path. The queue is dropped
 * whenever the peer connection is recreated, because candidates belong
 * to the old connection's ICE session and are useless on a fresh one.
 *
 * `queueIceCandidate` de-duplicates on the candidate string, so a
 * re-sent candidate is never queued twice; `flushBufferedCandidates`
 * removes each candidate only after it was added successfully, so a
 * failed add neither loses the candidate nor adds anything twice —
 * flushing again resumes where the previous flush stopped.
 */
export function queueIceCandidate(
  queue: IceCandidateJson[],
  candidate: IceCandidateJson,
): boolean {
  if (queue.some((c) => c.candidate === candidate.candidate)) return false;
  queue.push(candidate);
  return true;
}

export async function flushBufferedCandidates(
  queue: IceCandidateJson[],
  add: (candidate: IceCandidateJson) => Promise<void>,
): Promise<IceCandidateJson[]> {
  while (queue.length > 0) {
    const next = queue[0];
    try {
      await add(next);
    } catch {
      break; // keep the failed candidate and everything behind it queued
    }
    queue.shift();
  }
  return queue;
}

/**
 * Whether a peer connection must never be reused: closed, or failed.
 * Takes a state snapshot (not the live object) so it stays pure and
 * unit-testable. A null snapshot (no connection) counts as dead.
 */
export function isPeerConnectionDead(
  pc: { signalingState?: string; connectionState?: string } | null | undefined,
): boolean {
  if (!pc) return true;
  return pc.signalingState === 'closed' || pc.connectionState === 'closed' || pc.connectionState === 'failed';
}

/** Supabase Realtime subscribe statuses (see RealtimeChannel.subscribe). */
export type ChannelSubscribeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

export function isSubscribedStatus(status: string): boolean {
  return status === 'SUBSCRIBED';
}

/**
 * Subscription gate: turns a channel's subscribe-with-callback into a
 * promise that resolves only on SUBSCRIBED and rejects on TIMED_OUT,
 * CLOSED, CHANNEL_ERROR, a subscribe() throw, or a timeout. Callers
 * must await this before sending the first `call-join` — broadcasting
 * into an unsubscribed channel silently reaches nobody.
 */
export function waitForSubscription(
  subscribe: (cb: (status: string) => void) => unknown,
  timeoutMs = 10000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('Call channel subscription timed out.'));
    }, timeoutMs);
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fn();
    };
    try {
      subscribe((status) => {
        if (isSubscribedStatus(status)) {
          finish(resolve);
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          finish(() => reject(new Error(`Call channel subscription failed: ${status}.`)));
        }
        // Any other status is ignored; the timeout above is the backstop.
      });
    } catch (err) {
      finish(() => reject(err instanceof Error ? err : new Error('Call channel subscription failed.')));
    }
  });
}

/** Capability check, safe to run anywhere (returns a reason, never throws). */
export function canCall(): { ok: boolean; reason: string | null } {
  try {
    const w = globalThis as unknown as Record<string, unknown>;
    if (typeof w.RTCPeerConnection === 'undefined') {
      return { ok: false, reason: 'This browser cannot make video calls.' };
    }
    const nav = w.navigator as { mediaDevices?: { getUserMedia?: unknown } } | undefined;
    if (!nav?.mediaDevices?.getUserMedia) {
      return { ok: false, reason: 'This browser cannot reach the microphone or camera.' };
    }
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: 'Calling is not available here.' };
  }
}
