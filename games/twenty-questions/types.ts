/* Twenty Questions — one detective thinks of a person/place/thing (typed secretly),
 * the other asks up to 20 yes/no questions. Secret word stays LOCAL to the thinker.
 */

export type TwentyPhase = 'setup' | 'play' | 'won' | 'lost';

export interface TwentyQA {
  q: string;
  a: 'yes' | 'no' | null;
}

export interface TwentyShared {
  phase?: TwentyPhase;
  thinkerId?: string | null;
  category?: string;
  questionsUsed?: number;
  qa?: TwentyQA[];
  winner?: string | null;
  awarded?: Record<string, boolean>;
}
