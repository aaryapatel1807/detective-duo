/**
 * Case Files validator — the single gate every case must pass.
 *
 * A case passes ONLY if:
 *  (a) UNIQUE SOLUTION: model each suspect against every clue. A
 *      suspect survives iff no clue rules them out. The culprit must be
 *      the ONLY survivor. (This is the consistency checker: it needs no
 *      semantics beyond each clue's declared rulesOut set.)
 *  (b) every deduction-path step references a real clue id in the case.
 *  (c) shape checks: culprit is among suspects, 4-8 suspects, >= 1 clue,
 *      >= 1 deduction step, ids unique, rulesOut ids are real suspects,
 *      no clue rules out the culprit, red herrings never name the
 *      culprit and never share an id with a clue.
 *
 * No exceptions, no "close enough": validateCase returns every failure
 * found so authors can fix the case, and callers treat any error as a
 * rejection (see scripts/validate-cases.ts, which discards failures).
 */
import type { CaseFile } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Suspects left standing after all clues are applied. */
export function survivingSuspects(c: CaseFile): string[] {
  const ruledOut = new Set<string>();
  for (const clue of c.clues) {
    for (const id of clue.rulesOut) ruledOut.add(id);
  }
  return c.suspects.filter((s) => !ruledOut.has(s.id)).map((s) => s.id);
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/** Name tokens of a suspect, for the "herring must not name culprit" check. */
function nameTokens(name: string): string[] {
  return name
    .split(/[\s-]+/)
    .map((t) => t.replace(/[^A-Za-z]/g, '').toLowerCase())
    .filter((t) => t.length >= 3);
}

export function validateCase(c: CaseFile): ValidationResult {
  const errors: string[] = [];
  const push = (msg: string) => errors.push(msg);

  if (!c || typeof c !== 'object') return { valid: false, errors: ['case is not an object'] };
  if (!isNonEmpty(c.id)) push('missing id');
  if (!isNonEmpty(c.title)) push('missing title');
  if (!isNonEmpty(c.setting)) push('missing setting');
  if (!isNonEmpty(c.narrative)) push('missing narrative');
  if (!['Easy', 'Medium', 'Hard', 'Expert'].includes(c.difficulty)) {
    push(`unknown difficulty: ${String(c.difficulty)}`);
  }
  if (!Array.isArray(c.suspects) || c.suspects.length < 4 || c.suspects.length > 8) {
    push(`suspect count must be 4-8, got ${Array.isArray(c.suspects) ? c.suspects.length : 'not-an-array'}`);
  }
  if (!Array.isArray(c.clues) || c.clues.length < 1) push('at least 1 clue is required');
  if (!Array.isArray(c.redHerrings)) push('redHerrings must be an array');
  if (!Array.isArray(c.deductionPath) || c.deductionPath.length < 1) {
    push('at least 1 deduction step is required');
  }
  if (!c.solution || !isNonEmpty(c.solution.culpritId)) push('missing solution.culpritId');
  if (!c.solution || !isNonEmpty(c.solution.explanation)) push('missing solution.explanation');
  if (errors.length) return { valid: false, errors };

  // --- id uniqueness across suspects, clues, herrings -------------------
  const suspectIds = new Set<string>();
  for (const s of c.suspects) {
    if (!isNonEmpty(s.id)) push('suspect with missing id');
    else if (suspectIds.has(s.id)) push(`duplicate suspect id: ${s.id}`);
    else suspectIds.add(s.id);
    if (!isNonEmpty(s.name)) push(`suspect ${s.id} missing name`);
    if (!isNonEmpty(s.role)) push(`suspect ${s.id} missing role`);
    if (!isNonEmpty(s.alibi)) push(`suspect ${s.id} missing alibi`);
    if (!isNonEmpty(s.secret)) push(`suspect ${s.id} missing secret`);
  }
  const clueIds = new Set<string>();
  for (const clue of c.clues) {
    if (!isNonEmpty(clue.id)) push('clue with missing id');
    else if (clueIds.has(clue.id)) push(`duplicate clue id: ${clue.id}`);
    else clueIds.add(clue.id);
    if (!isNonEmpty(clue.text)) push(`clue ${clue.id} missing text`);
    if (!['physical', 'timing', 'statement', 'placement'].includes(clue.kind)) {
      push(`clue ${clue.id} has unknown kind: ${String(clue.kind)}`);
    }
    if (!Array.isArray(clue.rulesOut)) {
      push(`clue ${clue.id} rulesOut must be an array`);
      continue;
    }
    for (const id of clue.rulesOut) {
      if (!suspectIds.has(id)) push(`clue ${clue.id} rules out unknown suspect: ${id}`);
      if (id === c.solution.culpritId) {
        push(`clue ${clue.id} rules out the culprit — inconsistent case`);
      }
    }
    if (new Set(clue.rulesOut).size !== clue.rulesOut.length) {
      push(`clue ${clue.id} lists a suspect twice in rulesOut`);
    }
  }
  const herringIds = new Set<string>();
  const culprit = c.suspects.find((s) => s.id === c.solution.culpritId);
  const culpritTokens = culprit ? nameTokens(culprit.name) : [];
  for (const h of c.redHerrings) {
    if (!isNonEmpty(h.id)) push('red herring with missing id');
    else if (clueIds.has(h.id) || herringIds.has(h.id)) {
      push(`red herring id collides with another evidence id: ${h.id}`);
    } else herringIds.add(h.id);
    if (!isNonEmpty(h.text)) push(`red herring ${h.id} missing text`);
    if (culprit && isNonEmpty(h.text)) {
      const hay = h.text.toLowerCase();
      for (const tok of culpritTokens) {
        // Whole-word match only: "may" must not flag "maybe".
        if (new RegExp(`\\b${tok}\\b`).test(hay)) {
          push(`red herring ${h.id} names the culprit (${culprit.name}) — solution-revealing`);
          break;
        }
      }
    }
  }

  // --- (c) culprit must be among suspects --------------------------------
  if (!culprit) push(`culprit ${c.solution.culpritId} is not among the suspects`);

  // --- (b) deduction path references real clues --------------------------
  for (let i = 0; i < c.deductionPath.length; i++) {
    const step = c.deductionPath[i];
    if (!clueIds.has(step.clueId)) {
      push(`deduction step ${i + 1} references nonexistent clue: ${step.clueId}`);
    }
    if (!isNonEmpty(step.text)) push(`deduction step ${i + 1} missing text`);
  }

  // --- (a) uniqueness: exactly the culprit survives ----------------------
  if (culprit) {
    const survivors = survivingSuspects(c);
    if (survivors.length !== 1 || survivors[0] !== c.solution.culpritId) {
      const names = (ids: string[]) =>
        ids.map((id) => c.suspects.find((s) => s.id === id)?.name ?? id).join(', ');
      push(
        `solution is not unique: survivors are [${names(survivors)}], ` +
          `expected only [${culprit.name}]`,
      );
      const neverRuledOut = c.suspects
        .filter((s) => s.id !== c.solution.culpritId && survivors.includes(s.id))
        .map((s) => s.name);
      if (neverRuledOut.length) {
        push(`no clue rules out: ${neverRuledOut.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
