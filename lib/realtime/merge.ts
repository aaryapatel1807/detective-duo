/* Deep-merge for shared-state patches.
 * Objects merge recursively; arrays and primitives replace. Never mutates inputs.
 */

export function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** Patches may also introduce new keys, hence the Record fallback. */
export function deepMerge<T>(base: T, patch: DeepPartial<T> | Record<string, unknown>): T {
  if (!isPlainObject(patch)) return patch as T;
  const out: Record<string, any> = isPlainObject(base) ? { ...(base as any) } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
