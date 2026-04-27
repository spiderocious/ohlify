// Jaro-Winkler similarity in [0, 1].
// Tuned for short strings (people names). Good at catching transpositions and
// minor typos, weights common prefixes more heavily than plain Levenshtein.

const findMatches = (
  a: string,
  b: string,
  matchWindow: number,
): { aMatches: boolean[]; bMatches: boolean[]; matches: number } => {
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  return { aMatches, bMatches, matches };
};

const countTranspositions = (
  a: string,
  b: string,
  aMatches: boolean[],
  bMatches: boolean[],
): number => {
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  return transpositions;
};

const jaro = (a: string, b: string): number => {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const { aMatches, bMatches, matches } = findMatches(a, b, matchWindow);
  if (matches === 0) return 0;

  const transpositions = countTranspositions(a, b, aMatches, bMatches);
  const m = matches;
  return (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;
};

const jaroWinkler = (a: string, b: string, prefixScale = 0.1): number => {
  const j = jaro(a, b);
  const maxPrefix = Math.min(4, a.length, b.length);
  let prefix = 0;
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * prefixScale * (1 - j);
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (value: string): string[] => normalize(value).split(' ').filter(Boolean);

// Two-token minimum is required for the multi-token strategies (sorted-token
// and pairwise-token). Without it, a single-token user_name can score 100%
// against any resolved name that contains that token — e.g. user_name="TEST"
// passes "TEST ACCOUNT 1101011940" trivially. Direct Jaro-Winkler is still
// applied to single-token names, which gives a fair partial-string score.
const MIN_TOKENS_FOR_MULTI_TOKEN_STRATEGIES = 2;

const sortedTokenScore = (a: string, b: string): number => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (
    ta.length < MIN_TOKENS_FOR_MULTI_TOKEN_STRATEGIES ||
    tb.length < MIN_TOKENS_FOR_MULTI_TOKEN_STRATEGIES
  ) {
    return 0;
  }
  const sortedA = [...ta].sort((x, y) => x.localeCompare(y)).join(' ');
  const sortedB = [...tb].sort((x, y) => x.localeCompare(y)).join(' ');
  return jaroWinkler(sortedA, sortedB);
};

// Pairwise score: for each token in the shorter side, find its best match in
// the longer side. Coverage-weighted: divides by max(shorter, longer) so a
// 1-of-4 token match caps at 25%, not 100%. Combined with the multi-token
// floor, this kills the "user_name = single matching token" exploit.
const bestPairwiseTokenScore = (a: string, b: string): number => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (
    ta.length < MIN_TOKENS_FOR_MULTI_TOKEN_STRATEGIES ||
    tb.length < MIN_TOKENS_FOR_MULTI_TOKEN_STRATEGIES
  ) {
    return 0;
  }
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let totalScore = 0;
  for (const tokenA of shorter) {
    let best = 0;
    let bestIdx = -1;
    for (let i = 0; i < longer.length; i++) {
      if (used.has(i)) continue;
      const score = jaroWinkler(tokenA, longer[i]!);
      if (score > best) {
        best = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) used.add(bestIdx);
    totalScore += best;
  }
  return totalScore / longer.length;
};

// When the two strings are very different lengths, plain Jaro-Winkler can
// over-credit the short string for matching a prefix of the long string —
// e.g. "test" vs "test account 1101011940" scores ~83% on JW alone. Penalize
// length disparity proportionally: if the shorter is 50% the length of the
// longer, that's the soft cap on the direct-JW score. Tokenized strategies
// already encode length disparity via coverage weighting, so they're
// untouched.
const lengthRatioCap = (a: string, b: string): number => {
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 0;
  return shorter / longer;
};

// Compares two name strings. Returns a similarity score in [0, 100] (percent).
// Uses the best of three strategies:
//   1. Full-string Jaro-Winkler, capped by length-ratio (works on single-token
//      names without letting a short prefix-match score perfectly against a
//      much longer resolved name).
//   2. Sorted-token Jaro-Winkler (handles re-ordered names: "John Doe" vs "Doe John").
//      Requires ≥2 tokens on both sides.
//   3. Best-pairwise-token average, divided by max(shorter, longer).length
//      (handles middle-name additions/omissions while requiring proportional
//      coverage). Requires ≥2 tokens on both sides.
//
// The multi-token floor + coverage weighting + length-ratio cap together block
// the single-token bypass flagged by QA in N-02.
export const nameSimilarityPercent = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na.length === 0 || nb.length === 0) return 0;
  if (na === nb) return 100;

  const direct = jaroWinkler(na, nb) * lengthRatioCap(na, nb);
  const sorted = sortedTokenScore(a, b);
  const pairwise = bestPairwiseTokenScore(a, b);
  const best = Math.max(direct, sorted, pairwise);
  return Math.round(best * 100);
};
