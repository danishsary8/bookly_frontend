/**
 * Groups of km.ts that still hold English until Antigravity translates them (owner 2026-11-04: Antigravity does all
 * Khmer translation; new features ship with English text there). The "no English left in the Khmer dictionary" test
 * skips only these groups. When a group is translated, remove it from this list so the test guards it again.
 */
export const PENDING_KHMER_TRANSLATION: readonly string[] = ["sessions"];
