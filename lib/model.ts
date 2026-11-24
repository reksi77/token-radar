// Token launch radar — the fitted value model and the board builder.
//
// The snapshot carries no ranking, no implied value and no farm plan, so
// deriving them is this file's work. Everything below is computed from the
// snapshot's own figures; no protocol name is ever hardcoded.
//
// The value model is FITTED at runtime from the snapshot itself (Node
// stdlib only, no network, deterministic — see fitValueModel):
//   log(mcap / TVL) = a + b * (log TVL - 17) + c * (chg / 10)
//   chg = the 7-day TVL change in percent, clipped to [-50, +50].
//   Ridge, alpha = 1.0, intercept unpenalised. Fitted on the 95 traded
//   tokens with a complete record (mcap > 0, TVL > 0, listed_at, 7-day
//   change and category known).
// On the 2026-11-14 snapshot the fit is a = 0.000, b = -0.530, c = -0.280:
// bigger TVL means a much lower multiple (that is the whole point — the
// old hand-rolled median multiple inflated giant protocols), and a rising
// 7-day change slightly lowers the multiple. Terms that were tested and
// NOT kept (category, age, chain count, size^2) are documented in
// dashboard/00-method.md with their held-out numbers.
//
// Token odds use a Weibull hazard fitted on the age profile of the
// snapshot's protocols (see fitWeibull): the hazard falls with age
// (k < 1), so a protocol that has run longer with no token is LESS likely
// to launch one in the next 2 years. Odds = P(token within 2 years |
// no token by age a) = 1 - exp(-h(a) * 2).
//
// Implied value of a pre-token protocol:
//   implied = TVL x fitted multiple x token odds (2-year forward)
//   value_if_launches = TVL x fitted multiple (the value if a token
//   launches at all). Intervals come from the 10-fold residual quantiles
//   of the fitted model, recomputed at runtime.
//
// A board row is a protocol the snapshot records as having no token, that
// is not a wrapped, staked or bridged product of one that trades, and not a
// versioned copy or an exchange's own product — the watchlist's rule,
// without its TVL floor, so the board also finds the early ones below it.

import { generateFarmSteps, planCost } from './farm.ts';

export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

export interface ValueBreakdown {
  multiple: number;
  log_multiple: number;
  log_tvl: number;
  chg_clipped: number;
  base_usd: number;
  value_if_launches_usd: number;
  token_odds_2yr: number;
  tvl_usd: number;
  p25_usd: number;
  p75_usd: number;
  p10_usd: number;
  p90_usd: number;
}

export interface FarmCost {
  gas_usd: number;
  other_fees_usd: number;
  hours: number;
  time_usd: number;
  total_cost_usd: number;
}

export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  value_if_launches_usd: number;
  token_odds_2yr: number;
  implied_p25_usd: number;
  implied_p75_usd: number;
  implied_p10_usd: number;
  implied_p90_usd: number;
  farm_steps: string[];
  farm_cost: FarmCost;
  verdict: string;
  expected_drop_usd: number;
  net_usd: number;
  net_per_hour_usd: number;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_years: number | null;
  age_unknown: boolean;
  watchlist: boolean;
  value_breakdown: ValueBreakdown;
}

export interface HeldOut {
  typ: number;
  far: number;
}

export interface FitResult {
  a: number;
  b: number;
  c: number;
  alpha: number;
  population: number;
  quantiles: { q25: number; q75: number; q10: number; q90: number };
  weibull: { lam: number; k: number; horizon_years: number };
  median_age_years: number;
  age_unknown_board_rows: number;
  heldout: {
    chosen: { loo: HeldOut; wf: HeldOut };
    flat: { loo: HeldOut; wf: HeldOut };
    old: { loo: HeldOut; wf: HeldOut };
  };
  coverage: {
    loo2575: number;
    loo1090: number;
    wf2575: number;
    wf1090: number;
    wfWithin3: number;
  };
  accounting: {
    total: number;
    ranked: number;
    tokenized: number;
    excluded_total: number;
    excluded_by_reason: { category: number; version: number; wrapped: number; exchange: number };
  };
}

export interface BoardResult {
  rows: BoardRow[];
  fit: FitResult;
}

// Categories the watchlist rule leaves out: a wrapped, staked or bridged
// product of a token that already trades is not a launch of its own.
const EXCLUDED_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

const EXCHANGE_PREFIX =
  /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
const VERSION_SUFFIX = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\bwrapped\b|\bstaked\b|\bstaking\b/i;

/** True when the snapshot records no token for the protocol. */
export function isPreToken(p: Protocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

/** True when the protocol is a wrapped, staked or bridged product, a
 *  versioned copy, or an exchange's own product — not a launch candidate. */
export function isExcludedProduct(p: Protocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return true;
  if (VERSION_SUFFIX.test(p.name)) return true;
  if (WRAPPED_WORD.test(p.name)) return true;
  if (EXCHANGE_PREFIX.test(p.name)) return true;
  return false;
}

/** A board candidate: pre-token and not an excluded product. */
export function isEligible(p: Protocol): boolean {
  return isPreToken(p) && !isExcludedProduct(p);
}

/** Which exclusion reason applies, in priority order, so every excluded
 *  protocol lands in exactly one group for the accounting section. */
export function exclusionReason(p: Protocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return 'category';
  if (VERSION_SUFFIX.test(p.name)) return 'version';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange';
  return null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Quantile with linear interpolation, the numpy default. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

function roundN(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function round3(n: number): number {
  return roundN(n, 3);
}

/** Years between the listing day and the snapshot date, null when unknown. */
export function ageYears(listedAt: string | null, asOf: string): number | null {
  if (listedAt === null) return null;
  const ms = Date.parse(asOf) - Date.parse(listedAt);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / 86_400_000 / 365.25;
}

/** 7-day change clipped to [-50, +50] percent; null scores 0. */
export function clippedChange(change7d: number | null): number {
  if (change7d === null || !Number.isFinite(change7d)) return 0;
  return Math.min(50, Math.max(-50, change7d));
}

// ------------------------------------------------------------------ ridge
// Solve (X'X + diag(0, alpha, alpha)) beta = X'y by Gaussian elimination
// on the 3x3 system. The intercept is unpenalised; the two slopes are
// penalised by alpha. Deterministic, stdlib only.

function ridgeFit(X: number[][], y: number[], alpha: number): number[] {
  const n = 3;
  const a: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b: number[] = new Array<number>(n).fill(0);
  for (let i = 0; i < X.length; i++) {
    const xi = X[i]!;
    const yi = y[i]!;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) a[r]![c]! += xi[r]! * xi[c]!;
      b[r]! += xi[r]! * yi;
    }
  }
  for (let r = 1; r < n; r++) a[r]![r]! += alpha;
  // Gaussian elimination with partial pivoting.
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[piv]![col]!)) piv = r;
    }
    [a[col], a[piv]] = [a[piv]!, a[col]!];
    [b[col], b[piv]] = [b[piv]!, b[col]!];
    for (let r = col + 1; r < n; r++) {
      const f = a[r]![col]! / a[col]![col]!;
      for (let c = col; c < n; c++) a[r]![c]! -= f * a[col]![c]!;
      b[r]! -= f * b[col]!;
    }
  }
  const beta = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]!;
    for (let c = r + 1; c < n; c++) s -= a[r]![c]! * beta[c]!;
    beta[r] = s / a[r]![r]!;
  }
  return beta;
}

function predict(beta: number[], x: number[]): number {
  return beta[0]! + beta[1]! * x[0]! + beta[2]! * x[1]!;
}

/** Deterministic shuffle: mulberry32 seeded with 7, the same seed the
 *  prototype used for its 10-fold splits. No Math.random, no Date. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

interface FitRow {
  y: number;
  x: [number, number];
  listed: string;
  cat: string;
  age: number;
  chg: number;
}

function missOf(resid: number[]): HeldOut {
  const abs = resid.map((r) => Math.abs(r)).sort((a, b) => a - b);
  return {
    typ: roundN(Math.exp(quantile(abs, 0.5)), 2),
    far: roundN(Math.exp(quantile(abs, 0.75)), 2),
  };
}

/** The old hand-rolled heuristic, for an honest held-out comparison on
 *  the same splits: category median multiple (shrunk k=4 toward the
 *  global median, clamped [0.02, 2]) x growth factor x age factor.
 *  Medians are computed on the TRAIN rows only. */
function oldHeuristicPredict(train: FitRow[], test: FitRow[]): number[] {
  const byCat = new Map<string, number[]>();
  const all: number[] = [];
  for (const r of train) {
    const ratio = Math.exp(r.y);
    all.push(ratio);
    const list = byCat.get(r.cat) ?? [];
    list.push(ratio);
    byCat.set(r.cat, list);
  }
  const global = median(all) ?? 0.2;
  return test.map((r) => {
    const lst = byCat.get(r.cat) ?? [];
    const med = lst.length > 0 ? median(lst)! : global;
    const mult = Math.min(2.0, Math.max(0.02, (lst.length * med + 4 * global) / (lst.length + 4)));
    const growth = Math.min(1.5, Math.max(0.7, 1 + (r.chg / 100) * 2));
    const ageF = 1 + 0.05 * Math.min(r.age, 4);
    return Math.log(mult * growth * ageF);
  });
}

// ---------------------------------------------------------------- Weibull
const AGE_BUCKETS: [number, number][] = [
  [0, 0.25], [0.25, 0.5], [0.5, 1], [1, 1.5],
  [1.5, 2], [2, 3], [3, 5], [5, 99],
];

/** Grid search (lam 0.2-3.0, k 0.2-2.0, step 0.05) for the Weibull CDF
 *  share(a) = 1 - exp(-(a/lam)^k) against the tokenized share in each age
 *  bucket, weighted by bucket size. Bucket midpoint uses 6yr as the cap
 *  for the open 5yr+ bucket, as in the prototype. */
export function fitWeibull(protocols: Protocol[], asOf: string): { lam: number; k: number } {
  const pts: { mid: number; share: number; n: number }[] = [];
  for (const [lo, hi] of AGE_BUCKETS) {
    const grp = protocols.filter((p) => {
      const a = ageYears(p.listed_at, asOf);
      return a !== null && a >= lo && a < hi;
    });
    if (grp.length === 0) continue;
    const tok = grp.filter((p) => !isPreToken(p)).length;
    pts.push({ mid: (lo + Math.min(hi, 6)) / 2, share: tok / grp.length, n: grp.length });
  }
  let best = { err: Infinity, lam: 2.9, k: 0.7 };
  for (let lam = 0.2; lam <= 3.001; lam += 0.05) {
    for (let k = 0.2; k <= 2.001; k += 0.05) {
      let err = 0;
      for (const pt of pts) {
        const pred = 1 - Math.exp(-((pt.mid / lam) ** k));
        err += pt.n * (pred - pt.share) ** 2;
      }
      if (err < best.err) best = { err, lam: roundN(lam, 2), k: roundN(k, 2) };
    }
  }
  return { lam: best.lam, k: best.k };
}

/** Hazard h(a) = (k/lam) * (a/lam)^(k-1), floored at age 0.05yr. */
export function hazard(a: number, lam: number, k: number): number {
  const age = Math.max(a, 0.05);
  return (k / lam) * (age / lam) ** (k - 1);
}

/** P(token within H years | no token by age a) = 1 - exp(-h(a) * H). */
export function forwardOdds(a: number, lam: number, k: number, horizonYears: number): number {
  return 1 - Math.exp(-hazard(a, lam, k) * horizonYears);
}

// ------------------------------------------------------------------- fit
/** Fit the value model, the Weibull odds and the held-out evidence from
 *  the snapshot. All deterministic. */
export function fitModel(snapshot: Snapshot): FitResult {
  const rows: FitRow[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const age = ageYears(p.listed_at, snapshot.as_of);
    if (age === null || p.change_7d === null || !p.category) continue;
    rows.push({
      y: Math.log(p.mcap_usd / p.tvl_usd),
      x: [Math.log(p.tvl_usd) - 17, clippedChange(p.change_7d) / 10],
      listed: p.listed_at!,
      cat: p.category,
      age,
      chg: clippedChange(p.change_7d),
    });
  }
  const X = rows.map((r) => [1, r.x[0], r.x[1]]);
  const y = rows.map((r) => r.y);
  const beta = ridgeFit(X, y, 1.0);

  // 10-fold CV with the seeded shuffle.
  const order = seededShuffle(rows.map((_, i) => i), 7);
  const foldOf = new Array<number>(rows.length).fill(0);
  order.forEach((idx, pos) => { foldOf[idx] = Math.floor((pos * 10) / rows.length); });
  const residCv: number[] = new Array<number>(rows.length).fill(0);
  for (let f = 0; f < 10; f++) {
    const tr = rows.filter((_, i) => foldOf[i] !== f);
    const teIdx = rows.map((_, i) => i).filter((i) => foldOf[i] === f);
    const b = ridgeFit(tr.map((r) => [1, r.x[0], r.x[1]]), tr.map((r) => r.y), 1.0);
    for (const i of teIdx) residCv[i] = rows[i]!.y - predict(b, rows[i]!.x);
  }
  const sortedResid = [...residCv].sort((a, b) => a - b);
  const quantiles = {
    q25: roundN(quantile(sortedResid, 0.25), 2),
    q75: roundN(quantile(sortedResid, 0.75), 2),
    q10: roundN(quantile(sortedResid, 0.1), 2),
    q90: roundN(quantile(sortedResid, 0.9), 2),
  };

  // Walk-forward: train on protocols listed before 2024-07-15.
  const wfTrain = rows.filter((r) => r.listed < '2024-07-15');
  const wfTest = rows.filter((r) => r.listed >= '2024-07-15');
  const betaWf = ridgeFit(wfTrain.map((r) => [1, r.x[0], r.x[1]]), wfTrain.map((r) => r.y), 1.0);
  const residWf = wfTest.map((r) => r.y - predict(betaWf, r.x));
  const flatTrainMean = wfTrain.reduce((n, r) => n + r.y, 0) / wfTrain.length;
  // The prototype's "flat" is a ridge fit on a constant only, which
  // (the constant column is centred away) predicts the TRAIN MEAN of
  // log(mcap/TVL) — not the median. Use the mean here so the runtime
  // flat numbers match the prototype's flat row.
  const flatCvResid: number[] = [];
  for (let f = 0; f < 10; f++) {
    const tr = rows.filter((_, i) => foldOf[i] !== f);
    const teIdx = rows.map((_, i) => i).filter((i) => foldOf[i] === f);
    const mean = tr.reduce((n, r) => n + r.y, 0) / tr.length;
    for (const i of teIdx) flatCvResid.push(rows[i]!.y - mean);
  }
  const flatWfResid = wfTest.map((r) => r.y - flatTrainMean);
  const oldCvResid: number[] = [];
  for (let f = 0; f < 10; f++) {
    const tr = rows.filter((_, i) => foldOf[i] !== f);
    const te = rows.filter((_, i) => foldOf[i] === f);
    const pred = oldHeuristicPredict(tr, te);
    te.forEach((r, j) => oldCvResid.push(r.y - pred[j]!));
  }
  const oldWfResid = wfTest.map((r, j) => r.y - oldHeuristicPredict(wfTrain, wfTest)[j]!);

  const q = quantiles;
  const coverage = {
    loo2575: roundN(residCv.filter((r) => r >= q.q25 && r <= q.q75).length / residCv.length, 2),
    loo1090: roundN(residCv.filter((r) => r >= q.q10 && r <= q.q90).length / residCv.length, 2),
    wf2575: roundN(residWf.filter((r) => r >= q.q25 && r <= q.q75).length / residWf.length, 2),
    wf1090: roundN(residWf.filter((r) => r >= q.q10 && r <= q.q90).length / residWf.length, 2),
    wfWithin3: roundN(residWf.filter((r) => Math.abs(r) <= Math.log(3)).length / residWf.length, 2),
  };

  const weibull = fitWeibull(snapshot.protocols, snapshot.as_of);

  // Accounting: every protocol in exactly one group.
  const tokenized = snapshot.protocols.filter((p) => !isPreToken(p)).length;
  const byReason = { category: 0, version: 0, wrapped: 0, exchange: 0 };
  let ranked = 0;
  let ageUnknownBoard = 0;
  const boardAges: number[] = [];
  for (const p of snapshot.protocols) {
    if (isEligible(p)) {
      ranked++;
      const a = ageYears(p.listed_at, snapshot.as_of);
      if (a === null) ageUnknownBoard++;
      else boardAges.push(a);
    } else if (isPreToken(p)) {
      const reason = exclusionReason(p);
      if (reason) byReason[reason as keyof typeof byReason]++;
    }
  }
  const excludedTotal = byReason.category + byReason.version + byReason.wrapped + byReason.exchange;

  return {
    a: roundN(beta[0]!, 3),
    b: roundN(beta[1]!, 3),
    c: roundN(beta[2]!, 3),
    alpha: 1.0,
    population: rows.length,
    quantiles,
    weibull: { lam: weibull.lam, k: weibull.k, horizon_years: 2 },
    median_age_years: roundN(median(boardAges) ?? 1, 2),
    age_unknown_board_rows: ageUnknownBoard,
    heldout: {
      chosen: { loo: missOf(residCv), wf: missOf(residWf) },
      flat: { loo: missOf(flatCvResid), wf: missOf(flatWfResid) },
      old: { loo: missOf(oldCvResid), wf: missOf(oldWfResid) },
    },
    coverage,
    accounting: {
      total: snapshot.protocols.length,
      ranked,
      tokenized,
      excluded_total: excludedTotal,
      excluded_by_reason: byReason,
    },
  };
}

// ------------------------------------------------------------- economics
export const DEFAULT_SCENARIO = { drop_share: 0.07, deposit_usd: 200, horizon_weeks: 12 };
export const TBILL_RATE = 0.04;
export const HOUR_VALUE_USD = 25;

/** Farm economics for one row under a scenario. Deposits are recoverable
 *  capital, not a cost; the cost is gas + fees + time (see farm.ts).
 *  Verdict: FARM when the net beats both the T-bill return on the deposit
 *  over the horizon and $25/hour for the time spent; MARGINAL when the net
 *  is positive but below that benchmark; SKIP when the net is <= 0. */
export function farmEconomics(
  impliedValueUsd: number,
  cost: FarmCost,
  scenario: { drop_share: number; deposit_usd: number; horizon_weeks: number } = DEFAULT_SCENARIO,
): { expected_drop_usd: number; net_usd: number; net_per_hour_usd: number; verdict: string; tbill_usd: number } {
  const expectedDrop = Math.round(impliedValueUsd * scenario.drop_share);
  const net = Math.round(expectedDrop - cost.total_cost_usd);
  const netPerHour = roundN(net / cost.hours, 2);
  const tbill = Math.round(scenario.deposit_usd * TBILL_RATE * (scenario.horizon_weeks / 52));
  const benchmark = tbill + HOUR_VALUE_USD * cost.hours;
  const verdict = net > benchmark ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
  return { expected_drop_usd: expectedDrop, net_usd: net, net_per_hour_usd: netPerHour, verdict, tbill_usd: tbill };
}

/** The ranked board: every eligible protocol, by implied value. */
export function buildBoard(snapshot: Snapshot): BoardResult {
  const fit = fitModel(snapshot);
  const watch = new Set(snapshot.watchlist);
  const scored = snapshot.protocols
    .filter(isEligible)
    .map((p) => {
      const logTvl = Math.log(p.tvl_usd) - 17;
      const chg = clippedChange(p.change_7d);
      const logMult = fit.a + fit.b * logTvl + fit.c * (chg / 10);
      const multiple = Math.exp(logMult);
      const valueIfLaunches = Math.max(1, Math.round(p.tvl_usd * multiple));
      const age = ageYears(p.listed_at, snapshot.as_of);
      const ageForOdds = age ?? fit.median_age_years;
      const odds = roundN(forwardOdds(ageForOdds, fit.weibull.lam, fit.weibull.k, 2), 4);
      const implied = Math.max(1, Math.round(valueIfLaunches * odds));
      const cost = planCost(p);
      const econ = farmEconomics(implied, cost);
      const q = fit.quantiles;
      const breakdown: ValueBreakdown = {
        multiple: roundN(multiple, 4),
        log_multiple: roundN(logMult, 3),
        log_tvl: roundN(logTvl, 3),
        chg_clipped: chg,
        base_usd: valueIfLaunches,
        value_if_launches_usd: valueIfLaunches,
        token_odds_2yr: odds,
        tvl_usd: p.tvl_usd,
        p25_usd: Math.max(1, Math.round(valueIfLaunches * Math.exp(q.q25))),
        p75_usd: Math.max(1, Math.round(valueIfLaunches * Math.exp(q.q75))),
        p10_usd: Math.max(1, Math.round(valueIfLaunches * Math.exp(q.q10))),
        p90_usd: Math.max(1, Math.round(valueIfLaunches * Math.exp(q.q90))),
      };
      return { p, implied, valueIfLaunches, odds, age, cost, econ, breakdown };
    });
  // Deterministic order: implied value, then TVL, then slug.
  scored.sort(
    (a, b) =>
      b.implied - a.implied ||
      b.p.tvl_usd - a.p.tvl_usd ||
      (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0),
  );
  const rows: BoardRow[] = scored.map(({ p, implied, valueIfLaunches, odds, age, cost, econ, breakdown }, i) => ({
    slug: p.slug,
    name: p.name,
    rank: i + 1,
    implied_value_usd: implied,
    value_if_launches_usd: valueIfLaunches,
    token_odds_2yr: odds,
    implied_p25_usd: Math.max(1, Math.round(breakdown.p25_usd * odds)),
    implied_p75_usd: Math.max(1, Math.round(breakdown.p75_usd * odds)),
    implied_p10_usd: Math.max(1, Math.round(breakdown.p10_usd * odds)),
    implied_p90_usd: Math.max(1, Math.round(breakdown.p90_usd * odds)),
    farm_steps: generateFarmSteps(p),
    farm_cost: cost,
    verdict: econ.verdict,
    expected_drop_usd: econ.expected_drop_usd,
    net_usd: econ.net_usd,
    net_per_hour_usd: econ.net_per_hour_usd,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    listed_at: p.listed_at,
    age_years: age === null ? null : round3(age),
    age_unknown: age === null,
    watchlist: watch.has(p.slug),
    value_breakdown: breakdown,
  }));
  return { rows, fit };
}
