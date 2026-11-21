// Token launch radar — the value model and the board builder.
//
// The snapshot carries no ranking, no implied value and no farm plan, so
// deriving them is this file's work. Everything below is computed from the
// snapshot's own figures; no protocol name is ever hardcoded.
//
// Implied value of a pre-token protocol (see impliedValue):
//   implied = TVL x category multiple x growth factor x age factor
//   - category multiple: the median mcap/TVL of the tokenized peers in the
//     same category, shrunk toward the global median when the category has
//     few peers, clamped to [0.02, 2.0]. A category whose tokens trade at a
//     high multiple of TVL is a category whose next token is worth more.
//   - growth factor: the protocol's 7-day TVL change, doubled and clamped
//     to [0.7, 1.5]. Fast-growing TVL is worth more than flat TVL.
//   - age factor: 1 + 0.05 x years listed without a token, capped at 1.20.
//     A protocol that ran for years with no token has a longer record and
//     more pent-up launch value; the factor is deliberately small so TVL
//     and the category multiple do the ranking, not age alone.
//
// A board row is a protocol the snapshot records as having no token, that
// is not a wrapped, staked or bridged product of one that trades, and not a
// versioned copy or an exchange's own product — the watchlist's rule,
// without its TVL floor, so the board also finds the early ones below it.

import { generateFarmSteps } from './farm.ts';

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
  growth_factor: number;
  age_factor: number;
  base_usd: number;
  tvl_usd: number;
}

export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  farm_steps: string[];
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_years: number | null;
  watchlist: boolean;
  value_breakdown: ValueBreakdown;
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

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** The category multiples: the median mcap/TVL of each category's
 *  tokenized peers, plus the global median as the fallback. */
export function categoryMultiples(protocols: Protocol[]): {
  byCategory: Map<string, number>;
  global: number;
} {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    if (p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0) {
      const ratio = p.mcap_usd / p.tvl_usd;
      all.push(ratio);
      const key = p.category ?? '(none)';
      const list = byCategory.get(key) ?? [];
      list.push(ratio);
      byCategory.set(key, list);
    }
  }
  const global = median(all) ?? 0.2;
  const out = new Map<string, number>();
  for (const [key, list] of byCategory) {
    const med = median(list) ?? global;
    // Shrink toward the global median: a category with one or two peers
    // does not get to set its multiple alone (prior weight 4).
    const shrunk = (list.length * med + 4 * global) / (list.length + 4);
    out.set(key, Math.min(2.0, Math.max(0.02, shrunk)));
  }
  return { byCategory: out, global: Math.min(2.0, Math.max(0.02, global)) };
}

function multipleFor(
  p: Protocol,
  multiples: { byCategory: Map<string, number>; global: number },
): number {
  return multiples.byCategory.get(p.category ?? '(none)') ?? multiples.global;
}

/** 1 + twice the 7-day TVL change, clamped to [0.7, 1.5]. Null means
 *  unreported, which scores 1.0 rather than guessing. */
export function growthFactor(change7d: number | null): number {
  if (change7d === null || !Number.isFinite(change7d)) return 1.0;
  return Math.min(1.5, Math.max(0.7, 1 + (change7d / 100) * 2));
}

/** Years between the listing day and the snapshot date, null when unknown. */
export function ageYears(listedAt: string | null, asOf: string): number | null {
  if (listedAt === null) return null;
  const ms = Date.parse(asOf) - Date.parse(listedAt);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / 86_400_000 / 365.25;
}

/** 1 + 0.05 per year listed without a token, capped at 1.20. */
export function ageFactor(years: number | null): number {
  if (years === null) return 1.0;
  return 1 + 0.05 * Math.min(years, 4);
}

/** The implied value and its derivation, every figure from the snapshot. */
export function impliedValue(
  p: Protocol,
  multiples: { byCategory: Map<string, number>; global: number },
  asOf: string,
): { value: number; breakdown: ValueBreakdown } {
  const multiple = multipleFor(p, multiples);
  const growth = growthFactor(p.change_7d);
  const years = ageYears(p.listed_at, asOf);
  const age = ageFactor(years);
  const base = p.tvl_usd * multiple;
  const value = Math.max(1, Math.round(base * growth * age));
  return {
    value,
    breakdown: {
      multiple: round3(multiple),
      growth_factor: round3(growth),
      age_factor: round3(age),
      base_usd: Math.round(base),
      tvl_usd: p.tvl_usd,
    },
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** The ranked board: every eligible protocol, by implied value. */
export function buildBoard(snapshot: Snapshot): BoardRow[] {
  const multiples = categoryMultiples(snapshot.protocols);
  const watch = new Set(snapshot.watchlist);
  const scored = snapshot.protocols
    .filter(isEligible)
    .map((p) => {
      const { value, breakdown } = impliedValue(p, multiples, snapshot.as_of);
      return { p, value, breakdown };
    });
  // Deterministic order: implied value, then TVL, then slug.
  scored.sort(
    (a, b) =>
      b.value - a.value ||
      b.p.tvl_usd - a.p.tvl_usd ||
      (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0),
  );
  return scored.map(({ p, value, breakdown }, i) => ({
    slug: p.slug,
    name: p.name,
    rank: i + 1,
    implied_value_usd: value,
    farm_steps: generateFarmSteps(p),
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    listed_at: p.listed_at,
    age_years:
      ageYears(p.listed_at, snapshot.as_of) === null
        ? null
        : round3(ageYears(p.listed_at, snapshot.as_of)!),
    watchlist: watch.has(p.slug),
    value_breakdown: breakdown,
  }));
}
