import { describe, expect, it } from 'vitest';
import { pickWasmDir } from './wasmPaths';

describe('pickWasmDir', () => {
  it('returns the first dir holding both the .mjs wrapper and the .wasm binary', () => {
    const present = new Set(['/a/ort-wasm-simd-threaded.mjs', '/b/ort-wasm-simd-threaded.wasm', '/b/ort-wasm-simd-threaded.mjs']);
    expect(pickWasmDir(['/a', '/b'], (p) => present.has(p))).toBe('/b');
  });

  it('returns null when no dir holds both files', () => {
    const present = new Set(['/a/ort-wasm-simd-threaded.wasm']);
    expect(pickWasmDir(['/a'], (p) => present.has(p))).toBeNull();
  });

  it('returns null for an empty candidate list', () => {
    expect(pickWasmDir([], () => true)).toBeNull();
  });
});
