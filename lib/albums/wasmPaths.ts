import fs from 'node:fs';
import path from 'node:path';

/**
 * Where onnxruntime-web's Node wasm backend lives at runtime.
 * Pure + unit-testable: given a list of candidate directories and an
 * exists check, return the first directory that holds BOTH files the
 * backend imports at session creation (the Emscripten .mjs wrapper
 * and its .wasm binary). Returns null when none qualifies, in which
 * case classify.ts leaves ort's default resolution alone (local dev,
 * where the package dir is on disk and the default already works).
 */
export const WASM_FILES = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'] as const;

export function pickWasmDir(
  candidates: string[],
  exists: (filePath: string) => boolean,
): string | null {
  for (const dir of candidates) {
    if (WASM_FILES.every((f) => exists(path.join(dir, f)))) return dir;
  }
  return null;
}

/** Candidate layouts: Vercel lambda root, and a local standalone build. */
export function wasmDirCandidates(cwd: string): string[] {
  return [
    path.join(cwd, 'node_modules/onnxruntime-web/dist/'),
    path.join(cwd, '.next/standalone/node_modules/onnxruntime-web/dist/'),
  ];
}

export function resolveWasmDir(cwd: string = process.cwd()): string | null {
  return pickWasmDir(wasmDirCandidates(cwd), (p) => fs.existsSync(p));
}
