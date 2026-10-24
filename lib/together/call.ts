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

export interface CallSignal {
  type: CallSignalType;
  from: string;
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  };
}

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
