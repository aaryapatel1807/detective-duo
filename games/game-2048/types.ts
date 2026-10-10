import type { Grid } from './logic';

/** 2048 solo file — state shape for the UI layer. */
export interface Game2048Ui {
  grid: Grid;
  score: number;
  best: number;
  over: boolean;
  won: boolean;
  keepGoing: boolean;
}
