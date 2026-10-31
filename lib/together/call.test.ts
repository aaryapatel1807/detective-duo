import { describe, expect, it } from 'vitest';
import {
  buildSignal,
  callChannel,
  callReducer,
  canCall,
  flushBufferedCandidates,
  initialCallState,
  isPeerConnectionDead,
  isSubscribedStatus,
  PEER_TO_PEER_BLOCKED_MESSAGE,
  queueIceCandidate,
  shouldAnswerOffer,
  waitForSubscription,
  type IceCandidateJson,
} from './call';

const cand = (n: number): IceCandidateJson => ({
  candidate: `candidate:${n}`,
  sdpMid: '0',
  sdpMLineIndex: 0,
});

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

describe('ICE candidate buffering', () => {
  it('queues candidates in arrival order and de-duplicates re-sends', () => {
    const queue: IceCandidateJson[] = [];
    expect(queueIceCandidate(queue, cand(1))).toBe(true);
    expect(queueIceCandidate(queue, cand(2))).toBe(true);
    expect(queueIceCandidate(queue, cand(1))).toBe(false); // re-sent: never queued twice
    expect(queue.map((c) => c.candidate)).toEqual(['candidate:1', 'candidate:2']);
  });

  it('flushes in order, empties the queue, and never adds twice', async () => {
    const queue: IceCandidateJson[] = [cand(1), cand(2), cand(3)];
    const added: string[] = [];
    await flushBufferedCandidates(queue, async (c) => {
      added.push(c.candidate);
    });
    expect(added).toEqual(['candidate:1', 'candidate:2', 'candidate:3']);
    expect(queue).toEqual([]);
    // Flushing again adds nothing.
    await flushBufferedCandidates(queue, async (c) => {
      added.push(c.candidate);
    });
    expect(added).toEqual(['candidate:1', 'candidate:2', 'candidate:3']);
  });

  it('stops at a failing candidate and keeps it plus later ones queued', async () => {
    const queue: IceCandidateJson[] = [cand(1), cand(2), cand(3)];
    const added: string[] = [];
    await flushBufferedCandidates(queue, async (c) => {
      if (c.candidate === 'candidate:2') throw new Error('bad candidate');
      added.push(c.candidate);
    });
    expect(added).toEqual(['candidate:1']);
    expect(queue.map((c) => c.candidate)).toEqual(['candidate:2', 'candidate:3']);
  });
});

describe('peer-connection recreation rule', () => {
  it('treats missing, closed, and failed connections as dead', () => {
    expect(isPeerConnectionDead(null)).toBe(true);
    expect(isPeerConnectionDead(undefined)).toBe(true);
    expect(isPeerConnectionDead({ signalingState: 'closed', connectionState: 'connected' })).toBe(true);
    expect(isPeerConnectionDead({ signalingState: 'stable', connectionState: 'failed' })).toBe(true);
    expect(isPeerConnectionDead({ signalingState: 'stable', connectionState: 'closed' })).toBe(true);
  });

  it('treats live connections as reusable', () => {
    expect(isPeerConnectionDead({ signalingState: 'stable', connectionState: 'connected' })).toBe(false);
    expect(isPeerConnectionDead({ signalingState: 'stable', connectionState: 'connecting' })).toBe(false);
    expect(isPeerConnectionDead({ signalingState: 'have-local-offer', connectionState: 'new' })).toBe(false);
  });
});

describe('subscription gate', () => {
  it('resolves only on SUBSCRIBED', async () => {
    await expect(
      waitForSubscription((cb) => cb('SUBSCRIBED')),
    ).resolves.toBeUndefined();
    expect(isSubscribedStatus('SUBSCRIBED')).toBe(true);
    expect(isSubscribedStatus('CLOSED')).toBe(false);
    expect(isSubscribedStatus('CHANNEL_ERROR')).toBe(false);
  });

  it('rejects on TIMED_OUT, CLOSED, and CHANNEL_ERROR', async () => {
    for (const status of ['TIMED_OUT', 'CLOSED', 'CHANNEL_ERROR']) {
      await expect(waitForSubscription((cb) => cb(status))).rejects.toThrow(status);
    }
  });

  it('rejects when subscribe itself throws, and on timeout', async () => {
    await expect(
      waitForSubscription(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(waitForSubscription(() => undefined, 20)).rejects.toThrow(/timed out/i);
  });

  it('ignores a late failure after a successful subscribe', async () => {
    await expect(
      waitForSubscription((cb) => {
        cb('SUBSCRIBED');
        cb('CLOSED');
      }),
    ).resolves.toBeUndefined();
  });
});

describe('peer-to-peer failure wording', () => {
  it('says plainly that some mobile networks block P2P calls and the game still works', () => {
    expect(PEER_TO_PEER_BLOCKED_MESSAGE).toMatch(/mobile networks block peer-to-peer/);
    expect(PEER_TO_PEER_BLOCKED_MESSAGE).toMatch(/game still works/);
  });
});
