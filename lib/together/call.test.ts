import { describe, expect, it } from 'vitest';
import {
  buildSignal,
  callChannel,
  callReducer,
  canCall,
  initialCallState,
  shouldAnswerOffer,
} from './call';

describe('call signaling', () => {
  it('names one channel per room code', () => {
    expect(callChannel('abcd')).toBe('dd-call-ABCD');
    expect(callChannel('wxyz')).not.toBe(callChannel('abcd'));
  });

  it('builds signals with type + sender', () => {
    const s = buildSignal('call-join', 'u1');
    expect(s.type).toBe('call-join');
    expect(s.from).toBe('u1');
    const offer = buildSignal('call-offer', 'u1', { sdp: 'v=0' });
    expect(offer.sdp).toBe('v=0');
  });

  it('walks the UI states: join -> joined -> mute/camera -> peer leave -> leave', () => {
    let s = initialCallState();
    expect(s.status).toBe('idle');
    s = callReducer(s, { type: 'join' });
    expect(s.status).toBe('joining');
    s = callReducer(s, { type: 'joined' });
    expect(s.status).toBe('in-call');
    s = callReducer(s, { type: 'peer-joined' });
    expect(s.peerJoined).toBe(true);
    s = callReducer(s, { type: 'toggle-mute' });
    expect(s.muted).toBe(true);
    s = callReducer(s, { type: 'toggle-camera' });
    expect(s.cameraOn).toBe(false);
    s = callReducer(s, { type: 'peer-left' });
    expect(s.peerJoined).toBe(false);
    s = callReducer(s, { type: 'leave' });
    expect(s).toEqual(initialCallState());
  });

  it('keeps an error visible without dropping the call', () => {
    let s = callReducer(initialCallState(), { type: 'joined' });
    s = callReducer(s, { type: 'error', message: 'Mic denied' });
    expect(s.status).toBe('in-call');
    expect(s.error).toBe('Mic denied');
  });

  it('marks unsupported browsers unavailable with a reason', () => {
    const s = callReducer(initialCallState(), {
      type: 'unavailable',
      message: 'No WebRTC here',
    });
    expect(s.status).toBe('unavailable');
    expect(s.error).toBe('No WebRTC here');
  });

  it('applies the polite-peer rule for offer glare', () => {
    // Nobody has an offer out: anyone answers.
    expect(shouldAnswerOffer(true, false)).toBe(true);
    expect(shouldAnswerOffer(false, false)).toBe(true);
    // Both offered at once: the host holds, the guest yields + answers.
    expect(shouldAnswerOffer(true, true)).toBe(false);
    expect(shouldAnswerOffer(false, true)).toBe(true);
  });

  it('reports unavailability in a node test env (no WebRTC globals)', () => {
    const r = canCall();
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe('string');
  });
});
