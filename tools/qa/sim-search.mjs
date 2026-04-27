// Boundary-search helper for nameSimilarityPercent (lib/util/string-similarity.ts).
// Mirrors the HARDENED algorithm (post-N-02 fix, 2026-04-26):
//   - 2-token floor on sorted-token + pairwise strategies
//   - coverage-weighted pairwise (divides by max(longer.length))
//   - length-ratio cap on direct Jaro-Winkler
// IMPORTANT: keep this file in sync with apps/backend/src/lib/util/string-similarity.ts.
//
// Usage:
//   node tools/qa/sim-search.mjs "<resolved>" [target-percent=45] [tries=2000]
//
// Prints inputs that score exactly target-1, target, target+1 against the resolved name.

const findMatches = (a, b, win) => {
  const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false);
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const s = Math.max(0, i - win), e = Math.min(i + win + 1, b.length);
    for (let j = s; j < e; j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = true; bm[j] = true; m++; break;
    }
  }
  return { am, bm, m };
};
const trans = (a, b, am, bm) => {
  let t = 0, k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  return t;
};
const jaro = (a, b) => {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const win = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const { am, bm, m } = findMatches(a, b, win);
  if (!m) return 0;
  const t = trans(a, b, am, bm);
  return (m / a.length + m / b.length + (m - t / 2) / m) / 3;
};
const jw = (a, b, p = 0.1) => {
  const j = jaro(a, b);
  const max = Math.min(4, a.length, b.length);
  let pre = 0;
  for (let i = 0; i < max; i++) { if (a[i] === b[i]) pre++; else break; }
  return j + pre * p * (1 - j);
};
const norm = (v) =>
  v.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const tk = (v) => norm(v).split(' ').filter(Boolean);

const MIN_TOKENS = 2;

const sortedScore = (a, b) => {
  const ta = tk(a), tb = tk(b);
  if (ta.length < MIN_TOKENS || tb.length < MIN_TOKENS) return 0;
  const sa = [...ta].sort((x, y) => x.localeCompare(y)).join(' ');
  const sb = [...tb].sort((x, y) => x.localeCompare(y)).join(' ');
  return jw(sa, sb);
};
// Coverage-weighted: divide by longer.length, not shorter.length. Combined with
// the multi-token floor, kills the "single matching token" exploit.
const pairScore = (a, b) => {
  const ta = tk(a), tb = tk(b);
  if (ta.length < MIN_TOKENS || tb.length < MIN_TOKENS) return 0;
  const [s, l] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set();
  let total = 0;
  for (const t of s) {
    let best = 0, bi = -1;
    for (let i = 0; i < l.length; i++) {
      if (used.has(i)) continue;
      const sc = jw(t, l[i]);
      if (sc > best) { best = sc; bi = i; }
    }
    if (bi >= 0) used.add(bi);
    total += best;
  }
  return total / l.length;
};
// Penalize direct-JW length disparity so a short prefix-match doesn't score 100%
// against a much longer resolved name.
const lengthRatioCap = (a, b) => {
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  return longer === 0 ? 0 : shorter / longer;
};
export const sim = (a, b) => {
  const na = norm(a), nb = norm(b);
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 100;
  const direct = jw(na, nb) * lengthRatioCap(na, nb);
  const sorted = sortedScore(a, b);
  const pair = pairScore(a, b);
  return Math.round(Math.max(direct, sorted, pair) * 100);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const resolved = process.argv[2];
  const target = parseInt(process.argv[3] ?? '45', 10);
  const tries = parseInt(process.argv[4] ?? '2000', 10);
  if (!resolved) {
    console.error('Usage: node tools/qa/sim-search.mjs "<resolved>" [target=45] [tries=2000]');
    process.exit(1);
  }
  const targets = new Set([target - 1, target, target + 1]);
  const found = { [target - 1]: [], [target]: [], [target + 1]: [] };

  // Hand-curated candidates first
  const handpicked = [
    'X Y', 'X Z', 'Y Z', 'X Y Z W V', 'XX YY ZZ', '1 2 3 4 5', '9999', 'XYZ', 'TEST',
  ];
  for (const c of handpicked) {
    const s = sim(c, resolved);
    if (targets.has(s)) found[s].push(c);
  }

  // Random sweep
  const alpha = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rand = (len) => {
    let s = '';
    for (let i = 0; i < len; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
    return s;
  };
  for (let i = 0; i < tries; i++) {
    const len = 2 + Math.floor(Math.random() * 6);
    const c = rand(len) + ' ' + rand(len);
    const s = sim(c, resolved);
    if (targets.has(s)) {
      if (found[s].length < 5) found[s].push(c);
    }
  }

  console.log(`Resolved: "${resolved}"  target=${target}`);
  for (const t of [target - 1, target, target + 1]) {
    console.log(`\n${t}%:`);
    for (const c of found[t].slice(0, 3)) console.log(`  ${JSON.stringify(c)}`);
    if (found[t].length === 0) console.log('  (none — increase tries=)');
  }
}
