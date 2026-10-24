/**
 * Ongoing case pipeline: ask an external LLM for new cases in batches of
 * 20, validate every candidate, and append ONLY passers to the bank.
 *
 * Run: npx tsx scripts/generate-cases.ts [Easy|Medium|Hard|Expert]
 *   (default tier: Medium; optional second arg: number of batches, default 1)
 *
 * Endpoint: an OpenAI-compatible chat-completions endpoint. Provider is
 * chosen from the environment, in this order:
 *   1. GROQ_API_KEY  -> https://api.groq.com/openai/v1/chat/completions
 *      (model groq/llama-3.3-70b-versatile, overridable via CASE_LLM_MODEL)
 *   2. GEMINI_API_KEY -> https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 *      (model gemini-2.0-flash, overridable via CASE_LLM_MODEL)
 *   CASE_LLM_BASE_URL / CASE_LLM_MODEL override both when set.
 *
 * Keys are read from process.env ONLY. This script never reads other
 * projects' configs or env files, and never writes a key anywhere.
 * With no key configured it fails cleanly with a clear message and a
 * non-zero exit — that is the expected behaviour, not an error to work
 * around.
 *
 * Output: passers are appended to lib/content/cases/generated-<tier>.json
 * (created if missing). Rejected candidates are printed with their
 * validator errors and discarded — never appended.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase } from '../lib/cases/validator';
import type { CaseDifficulty, CaseFile } from '../lib/cases/types';

const BANK_DIR = join(__dirname, '..', 'lib', 'content', 'cases');

const SYSTEM_PROMPT = `You write original cozy mystery cases for a solo puzzle game. NEVER copy an existing published mystery, book, film or episode; every case must be your own invention with invented names.

Return ONLY a JSON array of case objects, no prose, no markdown fences. Each case object must match this shape exactly:
{
  "id": "cf-gen-<tier-lower>-NN (unique, use fresh numbers)",
  "title": "string",
  "difficulty": "<TIER>",
  "setting": "one-line scene",
  "narrative": "what happened, 2-4 sentences",
  "suspects": [{"id":"s1","name":"...","role":"...","alibi":"...","secret":"..."}],
  "clues": [{"id":"c1","kind":"physical|timing|statement|placement","text":"...","rulesOut":["sX", ...]}],
  "redHerrings": [{"id":"r1","text":"..."}],
  "solution": {"culpritId":"sX","explanation":"..."},
  "deductionPath": [{"clueId":"c1","text":"..."}]
}
Rules that decide acceptance (violations are discarded, so follow them exactly):
- Suspect counts: Easy 4, Medium 5-6, Hard 6-7, Expert 8.
- Every suspect has a non-empty name, role, alibi and secret.
- Each clue's rulesOut lists suspect ids that clue rules OUT. The culprit must NEVER appear in any rulesOut.
- The union of all clues' rulesOut must be EXACTLY every suspect except the culprit — no innocent left unruled-out, or the case is rejected.
- Every deductionPath step's clueId must be a real clue id in the case.
- Red herrings must NEVER name or identify the culprit (do not even use the culprit's first or last name in a herring).
- Red herring ids must not collide with clue ids.
- Deduction lengths: Easy 3-4 steps, Medium 4-5, Hard 5-6, Expert 8+ steps.
- Vary settings, motives, clue kinds and culprit positions. Plain human copy, no gore, no real people.`;

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

async function chatCompletions(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.9 }),
  });
  if (!res.ok) {
    throw new Error(`LLM request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned no content');
  return content;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Tolerate markdown fences around the array.
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('LLM output contained no JSON array');
    return JSON.parse(match[0]);
  }
}

async function main(): Promise<void> {
  const tier = (process.argv[2] ?? 'Medium') as CaseDifficulty;
  if (!['Easy', 'Medium', 'Hard', 'Expert'].includes(tier)) {
    console.error(`Unknown tier: ${tier}. Use Easy, Medium, Hard or Expert.`);
    process.exit(2);
  }
  const batches = Number(process.argv[3] ?? 1);
  if (!Number.isInteger(batches) || batches < 1) {
    console.error('Batch count must be a positive integer.');
    process.exit(2);
  }

  // Provider selection from process.env only.
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  let baseUrl = process.env.CASE_LLM_BASE_URL;
  let model = process.env.CASE_LLM_MODEL;
  let apiKey: string | undefined;
  if (!baseUrl) {
    if (groqKey) {
      baseUrl = 'https://api.groq.com/openai/v1';
      model ??= 'llama-3.3-70b-versatile';
      apiKey = groqKey;
    } else if (geminiKey) {
      baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
      model ??= 'gemini-2.0-flash';
      apiKey = geminiKey;
    }
  } else {
    apiKey = groqKey ?? geminiKey;
    model ??= 'llama-3.3-70b-versatile';
  }
  if (!apiKey || !baseUrl || !model) {
    console.error(
      'No LLM key configured: set GROQ_API_KEY or GEMINI_API_KEY ' +
        '(optionally CASE_LLM_BASE_URL / CASE_LLM_MODEL) and re-run.',
    );
    process.exit(1);
  }

  const outFile = join(BANK_DIR, `generated-${tier.toLowerCase()}.json`);
  const existing: CaseFile[] = existsSync(outFile)
    ? (JSON.parse(readFileSync(outFile, 'utf8')) as CaseFile[])
    : [];
  const knownIds = new Set(existing.map((c) => c.id));

  let requested = 0;
  let appended = 0;
  for (let b = 0; b < batches; b++) {
    console.log(`Batch ${b + 1}/${batches} (${tier})...`);
    const raw = await chatCompletions(baseUrl, apiKey, model, [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `Write 20 original ${tier} cases. ` +
          `Avoid these existing ids: ${[...knownIds].slice(-40).join(', ') || 'none'}.`,
      },
    ]);
    let candidates: unknown;
    try {
      candidates = extractJson(raw);
    } catch (err) {
      console.error(`  batch unparseable, skipped: ${(err as Error).message}`);
      continue;
    }
    if (!Array.isArray(candidates)) {
      console.error('  batch was not an array, skipped');
      continue;
    }
    for (const cand of candidates as CaseFile[]) {
      requested++;
      const result = validateCase(cand);
      if (!result.valid) {
        console.log(`  REJECT ${cand?.id ?? '(no id)'}: ${result.errors.join('; ')}`);
        continue;
      }
      if (knownIds.has(cand.id)) {
        console.log(`  REJECT ${cand.id}: duplicate id`);
        continue;
      }
      knownIds.add(cand.id);
      existing.push(cand);
      appended++;
    }
    console.log(`  batch done: ${appended} appended so far`);
  }

  mkdirSync(BANK_DIR, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(
    `\nDone: ${requested} candidates, ${appended} appended to ${outFile}, ` +
      `${requested - appended} discarded.`,
  );
}

main().catch((err: unknown) => {
  console.error(`generate-cases failed: ${(err as Error).message}`);
  process.exit(1);
});
