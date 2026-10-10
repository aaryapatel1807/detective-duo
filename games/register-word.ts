/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'word' workstream agent.
 * Word & Code Duels: 7 games. Add your register() calls below.
 * Do NOT edit any other register-*.ts file.
 */
import { register } from './registry';

import { meta as hangmanDuelMeta } from './hangman-duel/meta';
register(hangmanDuelMeta, () => import('./hangman-duel/Game'));

import { meta as wordDuelMeta } from './word-duel/meta';
register(wordDuelMeta, () => import('./word-duel/Game'));

import { meta as cipherDuelMeta } from './cipher-duel/meta';
register(cipherDuelMeta, () => import('./cipher-duel/Game'));

import { meta as ghostMeta } from './ghost/meta';
register(ghostMeta, () => import('./ghost/Game'));

import { meta as wordHuntMeta } from './word-hunt/meta';
register(wordHuntMeta, () => import('./word-hunt/Game'));

import { meta as cipherBreakerMeta } from './cipher-breaker/meta';
register(cipherBreakerMeta, () => import('./cipher-breaker/Game'));

import { meta as codenamesDuetMeta } from './codenames-duet/meta';
register(codenamesDuetMeta, () => import('./codenames-duet/Game'));

export {};
