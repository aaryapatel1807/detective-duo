/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'coop' workstream agent.
 * Add your register() calls below. Do NOT edit any other register-*.ts file.
 */
import { register } from './registry';

import { meta as bombDefusalMeta } from './bomb-defusal/meta';
register(bombDefusalMeta, () => import('./bomb-defusal/Game'));

import { meta as heistPlannerMeta } from './heist-planner/meta';
register(heistPlannerMeta, () => import('./heist-planner/Game'));

import { meta as escapeRoomMeta } from './escape-room/meta';
register(escapeRoomMeta, () => import('./escape-room/Game'));

import { meta as mindMeldMeta } from './mind-meld/meta';
register(mindMeldMeta, () => import('./mind-meld/Game'));

export {};
