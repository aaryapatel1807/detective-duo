/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'deduction' workstream agent.
 * Deduction games: Black Stories, Guess Who, Twenty Questions, Spot the Liar,
 * Alibi, Logic Grids.
 */
import { register } from './registry';

import { meta as blackStoriesMeta } from './black-stories/meta';
register(blackStoriesMeta, () => import('./black-stories/Game'));

import { meta as guessWhoMeta } from './guess-who/meta';
register(guessWhoMeta, () => import('./guess-who/Game'));

import { meta as twentyQuestionsMeta } from './twenty-questions/meta';
register(twentyQuestionsMeta, () => import('./twenty-questions/Game'));

import { meta as spotTheLiarMeta } from './spot-the-liar/meta';
register(spotTheLiarMeta, () => import('./spot-the-liar/Game'));

import { meta as alibiMeta } from './alibi/meta';
register(alibiMeta, () => import('./alibi/Game'));

import { meta as logicGridsMeta } from './logic-grids/meta';
register(logicGridsMeta, () => import('./logic-grids/Game'));

export {};
