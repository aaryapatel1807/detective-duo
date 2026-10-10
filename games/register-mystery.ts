/* Workstream registration fragment — OWNED EXCLUSIVELY by the 'mystery' workstream agent.
 * Add your register() calls below. Do NOT edit any other register-*.ts file.
 */
import { register } from './registry';

import { meta as crimeMysteryMeta } from './crime-mystery/meta';
register(crimeMysteryMeta, () => import('./crime-mystery/Game'));

export {};
