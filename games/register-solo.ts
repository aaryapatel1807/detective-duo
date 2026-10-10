/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'solo' workstream agent.
 * Add your register() calls below. Do NOT edit any other register-*.ts file.
 */
import { register } from './registry';

import { meta as game2048Meta } from './game-2048/meta';
register(game2048Meta, () => import('./game-2048/Game'));

import { meta as wordleMeta } from './wordle/meta';
register(wordleMeta, () => import('./wordle/Game'));

import { meta as minesweeperMeta } from './minesweeper/meta';
register(minesweeperMeta, () => import('./minesweeper/Game'));

import { meta as snakeMeta } from './snake/meta';
register(snakeMeta, () => import('./snake/Game'));

import { meta as memoryMatchMeta } from './memory-match/meta';
register(memoryMatchMeta, () => import('./memory-match/Game'));

import { meta as dailyPuzzleMeta } from './daily-puzzle/meta';
register(dailyPuzzleMeta, () => import('./daily-puzzle/Game'));

import { meta as jigsawMeta } from './jigsaw/meta';
register(jigsawMeta, () => import('./jigsaw/Game'));

import { meta as coloringMeta } from './coloring/meta';
register(coloringMeta, () => import('./coloring/Game'));
