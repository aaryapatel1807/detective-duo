/* Black Stories — shared types. */

export type Answer = 'yes' | 'no' | 'irrelevant';

export interface QAEntry {
  q: string;
  a: Answer | null;
  from: string;
}

export type BlackStoriesPhase = 'pick-roles' | 'pick-story' | 'questioning' | 'solved' | 'surrendered';

export interface BlackStoriesShared {
  hostId?: string | null;
  storyId?: string | null;
  phase?: BlackStoriesPhase;
  qa?: QAEntry[];
  askedCount?: number;
  awarded?: Record<string, boolean>;
  claimedBy?: string | null;
}
