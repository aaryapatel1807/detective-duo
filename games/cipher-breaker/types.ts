/* Shared-state types for Cipher Breaker (mirrors room.shared.games['cipher-breaker']). */

export interface CipherBreakerShared {
  /** cipherId -> playerId of the first solver. */
  solvedBy?: Record<string, string>;
  /** cipherId currently opened by me (ephemeral-ish; harmless in shared). */
  openId?: string | null;
}
