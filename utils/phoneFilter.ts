/**
 * Phone number filter — detects Indian mobile numbers (10 digits starting 6–9)
 * even when written with tricks:
 *   - Digit word substitutions in English, Hinglish, Hindi, Tamil, Telugu,
 *     Punjabi, Malayalam, Bengali, Kannada, Assamese, and Marathi
 *   - Spaces / separators between digits
 *   - Leet-speak lookalike characters
 *   - Mixed tricks (e.g. "nau aath sat six fiv")
 */

// ── Digit-word map ────────────────────────────────────────────────────────────
// Each entry: [regex, replacement digit string]
// Words are matched as whole words (word boundary) to reduce false positives.

const WORD_DIGIT_MAP: Array<[RegExp, string]> = [
  // ── 0 ────────────────────────────────────────────────────────────────────
  [/\b(zero|zer|z3ro|shunya|shuny|sifar|poojiyam|poojyam|pujyam|soonam|soonya)\b/gi, '0'],

  // ── 1 ────────────────────────────────────────────────────────────────────
  // English · Hindi/Hinglish · Tamil · Telugu · Punjabi · Bengali · Kannada · Assamese
  [/\b(one|won|w0n|0ne|ek|ik|ikk|onnu|onu|okati|oka|eku|ondu)\b/gi, '1'],

  // ── 2 ────────────────────────────────────────────────────────────────────
  // English · Hindi · Tamil/Telugu · Bengali · Kannada · Marathi
  [/\b(two|tu|tw0|do|doh|dui|rendu|randu|irandu|eradu|don)\b/gi, '2'],

  // ── 3 ────────────────────────────────────────────────────────────────────
  // English · Hindi · Punjabi · Tamil/Malayalam · Telugu · Kannada · Assamese
  [/\b(three|tre|thr33|teen|tin|tinn|moonu|mundru|mudu|moodu|munnu|mooru|muru|tini)\b/gi, '3'],

  // ── 4 ────────────────────────────────────────────────────────────────────
  // English · Hindi/Punjabi · Tamil/Telugu/Kannada/Malayalam
  [/\b(four|for|f0ur|fwr|char|chaar|naalu|naal|nalugu)\b/gi, '4'],

  // ── 5 ────────────────────────────────────────────────────────────────────
  // English · Hindi · Punjabi · Tamil · Telugu · Malayalam · Bengali · Kannada · Assamese · Marathi
  [/\b(five|fiv|f1ve|fyv|paanch|panch|panj|aindu|anju|aidu|ayidu|aidhu|anchu|ainchu|pach|pash|paach)\b/gi, '5'],

  // ── 6 ────────────────────────────────────────────────────────────────────
  // English · Hindi · Tamil/Telugu/Kannada/Malayalam/Punjabi · Bengali · Marathi
  [/\b(six|s1x|s!x|chheh|chhe|aaru|aru|chhoy|choy|saha)\b/gi, '6'],

  // ── 7 ────────────────────────────────────────────────────────────────────
  // English · Hindi/Punjabi/Marathi/Assamese · Tamil/Malayalam · Telugu · Kannada
  [/\b(seven|sevn|svn|s3ven|saat|sat|satt|ezhu|elu|edu|yedu|yelu)\b/gi, '7'],

  // ── 8 ────────────────────────────────────────────────────────────────────
  // English · Hindi/Punjabi/Marathi · Tamil · Telugu · Kannada · Bengali/Assamese
  [/\b(eight|eith|eit|egt|e1ght|aath|ath|atth|ettu|enimidi|entu|aat)\b/gi, '8'],

  // ── 9 ────────────────────────────────────────────────────────────────────
  // English · Hindi/Punjabi/Marathi · Tamil · Telugu · Malayalam · Bengali/Assamese · Kannada
  [/\b(nine|nin|nyne|n1ne|nein|nau|onbadu|ombadu|tommidi|onpathu|ombathu|noy|ombattu)\b/gi, '9'],
];

// ── Leet-speak lookalike map ──────────────────────────────────────────────────
// Applied on a COPY only (for detection), not on display text.
// Kept conservative to avoid too many false positives.
const LEET_MAP: Array<[RegExp, string]> = [
  [/o/gi, '0'],   // o → 0
  [/[il|!]/gi, '1'], // i/l/| → 1
  [/[zZ]/g, '2'],
  [/[eE]/g, '3'],
  [/[aA@]/g, '4'],
  [/[sS$]/g, '5'],
  [/[gG]/g, '6'],
  [/[tT]/g, '7'],
  [/[bB]/g, '8'],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeWords(text: string): string {
  let t = text;
  for (const [pattern, digit] of WORD_DIGIT_MAP) {
    t = t.replace(pattern, digit);
  }
  return t;
}

function normalizeLeet(text: string): string {
  let t = text;
  for (const [pattern, digit] of LEET_MAP) {
    t = t.replace(pattern, digit);
  }
  return t;
}

/** Strip separators so spaced-out numbers collapse into digit runs */
function stripSeparators(text: string): string {
  return text.replace(/[\s\-.()+,_/\\]/g, '');
}

/** True if the digits string contains an Indian mobile or a suspicious partial number */
function hasIndianMobile(digits: string): boolean {
  // With country code 91 → 12-digit block
  if (/91[6-9]\d{9}/.test(digits)) return true;
  // Direct 10-digit mobile
  if (/[6-9]\d{9}/.test(digits)) return true;
  // Partial: 7+ digits starting with 6–9 (split-number trick)
  if (/[6-9]\d{6,}/.test(digits)) return true;
  // Any run of 8+ digits (regardless of start — UPI IDs, account numbers etc.)
  if (/\d{8,}/.test(digits)) return true;
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the message likely contains a phone number.
 *
 * Covers: numeric, word-spelled, Hinglish, Hindi, Tamil, Telugu,
 *         Punjabi, Malayalam, Bengali, leet-speak, and separator tricks.
 */
export function containsPhoneNumber(text: string): boolean {
  // Pass 1 — word-normalized only (most common trick)
  const wordNorm = normalizeWords(text);
  if (hasIndianMobile(stripSeparators(wordNorm))) return true;

  // Pass 2 — raw digits with separators stripped (spaces/dashes trick)
  if (hasIndianMobile(stripSeparators(text))) return true;

  // Pass 3 — leet-speak on top of word-normalized (combined trick)
  const leet = normalizeLeet(wordNorm);
  if (hasIndianMobile(stripSeparators(leet))) return true;

  return false;
}
