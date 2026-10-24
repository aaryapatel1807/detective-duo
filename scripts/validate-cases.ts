/**
 * Validate every case in lib/content/cases/*.json.
 *
 * Run: npx tsx scripts/validate-cases.ts
 * Exit 0 only if every case passes lib/cases/validator.ts. Failures are
 * printed per case with every error, so authors can fix and re-run.
 * This script never modifies the bank — discarding failures is a human
 * (or scripts/generate-cases.ts) decision, made explicitly.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase } from '../lib/cases/validator';
import type { CaseFile } from '../lib/cases/types';

const dir = join(__dirname, '..', 'lib', 'content', 'cases');

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();

let total = 0;
let passed = 0;
const failures: { id: string; file: string; errors: string[] }[] = [];

for (const file of files) {
  const parsed = JSON.parse(readFileSync(join(dir, file), 'utf8')) as CaseFile[];
  if (!Array.isArray(parsed)) {
    console.error(`${file}: top level is not an array`);
    failures.push({ id: '(file)', file, errors: ['top level is not an array'] });
    continue;
  }
  for (const c of parsed) {
    total++;
    const r = validateCase(c);
    if (r.valid) {
      passed++;
    } else {
      failures.push({ id: c?.id ?? '(missing id)', file, errors: r.errors });
    }
  }
}

console.log(`\n${passed}/${total} cases pass (${files.length} files).`);
if (failures.length) {
  console.log(`\n${failures.length} FAILURES:\n`);
  for (const f of failures) {
    console.log(`- ${f.id} (${f.file})`);
    for (const e of f.errors) console.log(`    * ${e}`);
  }
  process.exit(1);
}
console.log('All cases valid.');
