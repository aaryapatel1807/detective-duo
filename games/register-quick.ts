/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'quick' workstream agent.
 * Add your register() calls below. Do NOT edit any other register-*.ts file.
 */
import { register } from './registry';

import { meta as fugitiveHuntMeta } from './fugitive-hunt/meta';
register(fugitiveHuntMeta, () => import('./fugitive-hunt/Game'));

import { meta as liarsDiceMeta } from './liars-dice/meta';
register(liarsDiceMeta, () => import('./liars-dice/Game'));

import { meta as ticTacToeMeta } from './tic-tac-toe/meta';
register(ticTacToeMeta, () => import('./tic-tac-toe/Game'));

import { meta as connect4Meta } from './connect-4/meta';
register(connect4Meta, () => import('./connect-4/Game'));

import { meta as battleshipMeta } from './battleship/meta';
register(battleshipMeta, () => import('./battleship/Game'));

import { meta as drawGuessMeta } from './draw-guess/meta';
register(drawGuessMeta, () => import('./draw-guess/Game'));

import { meta as triviaBattleMeta } from './trivia-battle/meta';
register(triviaBattleMeta, () => import('./trivia-battle/Game'));

import { meta as truthOrDareMeta } from './truth-or-dare/meta';
register(truthOrDareMeta, () => import('./truth-or-dare/Game'));

import { meta as wouldYouRatherMeta } from './would-you-rather/meta';
register(wouldYouRatherMeta, () => import('./would-you-rather/Game'));

export {};
