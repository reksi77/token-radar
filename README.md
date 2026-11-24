# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/reksi77/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/reksi77/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar: a dashboard that ranks pre-token DeFi protocols by what
their launch would be worth, and shows how to farm each one. The board is
computed from a sealed DefiLlama snapshot (758 protocols, 14 November 2026):
every row is a protocol the snapshot records as having no token, ranked by an
implied value fitted from the snapshot itself — TVL times a fitted
market-cap-to-TVL multiple, times a 2-year forward token-launch odds from a
Weibull hazard on age — with a concrete five-step farm plan that names
costs and timeframes. The board holds 198 pre-token protocols and covers
all 40 of the snapshot's watchlist; the top implied value is $26.8M
(Steakhouse Financial, $2.75B TVL, odds 0.45), total $933M.

## How the board is ranked

`implied value = TVL × fitted multiple × token odds (2-year forward)`,
computed by `fitModel` in `lib/model.ts` from the snapshot alone —
no protocol name is hardcoded. The fitted model is
`log(mcap/TVL) = −1.375 − 0.530 × (log TVL − 17) − 0.280 × (chg / 10)`
(ridge, alpha = 1.0, on the 95 traded tokens with a complete record):
a $100M-TVL protocol's token trades at ~0.119× TVL, a $1B one at ~0.035×.
Token odds come from a Weibull hazard on no-token age (lam 2.90 yr,
k 0.70, k < 1 so the hazard falls with age): odds of a token within 2
years are 0.49 at age 1yr and 0.38 at age 3yr. Held out, the model misses
real caps by ×2.82 (10-fold) / ×2.81 (walk-forward), against ×3.59 / ×5.39
for the old hand-rolled heuristic and ×4.70 / ×4.37 for a flat median
multiple. Category, age, chain count and size² were tested and not kept:
each worsened the walk-forward test. The full method, with every
held-out number, is in `dashboard/00-method.md`.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Then open `out/dashboard/index.html`: the board sorts and filters, and
clicking a row opens its detail view with the value breakdown and farm plan.

---

<sub>Entered on [make.fun](https://make.fun/?ref=t3nmdwvx&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) — build agents and programs, enter bounties, earn USDC.</sub>
