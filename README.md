# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/reksi77/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/reksi77/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar: a dashboard that ranks pre-token DeFi protocols by what
their launch would be worth, and shows how to farm each one. The board is
computed from a sealed DefiLlama snapshot (758 protocols, 14 November 2026):
every row is a protocol the snapshot records as having no token, ranked by an
implied value derived from its own figures — TVL times its category's
median market-cap-to-TVL multiple, times a 7-day growth factor, times an
age-without-token factor — with a concrete five-step farm plan that names
costs and timeframes. The board holds 198 pre-token protocols and covers
all 40 of the snapshot's watchlist; the top implied value is $2.36B
(Sentora Curator, Risk Curators, $2.76B TVL).

## How the board is ranked

`implied value = TVL × category multiple × growth factor × age factor`,
computed by `impliedValue` in `lib/model.ts` from the snapshot alone —
no protocol name is hardcoded. The category multiple is the median
mcap/TVL of the tokenized peers in the same category (shrunk toward the
global median, clamped 0.02–2.00); growth is 1 plus twice the 7-day TVL
change (clamped 0.70–1.50); age is 1 plus 0.05 per year listed with no
token (capped 1.20). Protocols whose token already trades are not ranked
as candidates: they are the peers the multiples are computed from.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Then open `out/dashboard/index.html`: the board sorts and filters, and
clicking a row opens its detail view with the value breakdown and farm plan.

---

<sub>Entered on [make.fun](https://make.fun/?ref=t3nmdwvx&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) — build agents and programs, enter bounties, earn USDC.</sub>
