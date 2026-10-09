import type { Fills } from './logic';

/** Persisted coloring saves: pageId -> fills + completion/award flags. */
export interface ColoringSaves {
  [pageId: string]: {
    fills: Fills;
    done: boolean;
    awarded: boolean;
  };
}
