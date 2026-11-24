# Token Launch Radar — method

Model fitted on the DefiLlama snapshot of 2026-11-14, refitted in this
browser from the same snapshot by main.ts (Node stdlib only, no network,
no hand-picked names). All numbers below are from that snapshot.

## The value model (fitted, not hand-picked)

log(mcap / TVL) = -1.375 - 0.530 * (log TVL - 17) - 0.280 * (chg / 10)

where chg is the 7-day TVL change in percent, clipped to [-50, +50].
Ridge, alpha = 1.0, fitted on the 95 traded tokens with a complete record
(mcap > 0, TVL > 0, listed_at, 7-day change and category known). Note on
the constant: the design matrix's constant column carries coefficient
0.000; the fitted intercept is -1.375, and that is the number in the
formula above. Implied multiple: $100M TVL, chg 0 -> 0.119x; $1B -> 0.035x;
$2.76B TVL, +2.4% -> 0.019x. Bigger TVL means a much lower multiple — the
old flat median multiple inflated giant protocols (old top $2.36B).

Implied value = TVL x fitted multiple x token odds (2-year forward).
Value if it launches = TVL x fitted multiple, before odds.

## Held-out evidence (two tests each)

Value model, typical miss = exp(median |residual|), far miss = exp(p75):
flat median multiple: LOO x4.44 / x9.12 | walk-forward x4.51 / x12.92
+ size curve: LOO x3.29 / x7.36 | WF x2.96 / x11.11
+ size + change (KEPT): LOO x3.18 / x8.15 | WF x3.05 / x9.84
+ size + change + category (tested, NOT kept): LOO x3.02 / x7.61 |
WF x3.23 / x9.58 — LOO improves but BOTH walk-forward splits worsen
(WF-median split x2.80 -> x3.20), so category is out.
+ category + age: LOO x3.11 | WF x3.40 (not kept). + chain count:
LOO x3.16 | WF x4.14 (not kept). + size squared: LOO x3.54 | WF x3.42
(not kept). + control (permuted change): LOO x3.38 | WF x3.18 — the
control does not help, as it should not. OLD hand-rolled heuristic:
LOO x3.68 / x10.19 | WF x5.42 / x12.16.
The deliverable's own refit, on its own seeded 10-fold split, gives
LOO x2.82 and WF x2.81 for the kept model (same model, different fold
draw), vs old x3.59 / x5.39 on the same splits. Walk-forward trains on
protocols listed before 2024-07-15 (n=53) and tests the rest (n=42).

Token odds: the age signal is validated by logistic regression on 641
complete protocols (listed_at + 7-day change known): base rate only
10-fold Brier 0.250, accuracy 0.51 | WF Brier 0.361, acc 0.37. Adding age:
Brier 0.217, acc 0.66 | WF 0.236, acc 0.60. Adding size and change does
not help further (0.218 / 0.236). Category improves 10-fold (0.208) but
worsens WF (0.271): not kept. Control (permuted change) does not help
(0.218 / 0.239). Standardised age coefficient +0.783.
The board's odds use the same age profile as a Weibull hazard, fitted by
grid search (lam 0.2-3.0, k 0.2-2.0, step 0.05) on the tokenized share by
age bucket (n=645 with listed_at): lam = 2.90 yr, k = 0.70. k < 1 means
the hazard FALLS with age: the longer a protocol runs with no token, the
less likely it launches one next. Hazard h(a) = (k/lam)*(a/lam)^(k-1).
Odds = P(token within 2 years | no token by age a) = 1 - exp(-h(a)*2):
age 0.1yr -> 0.73, 0.25yr -> 0.63, 0.5yr -> 0.56, 1yr -> 0.49, 1.5yr ->
0.44, 2yr -> 0.42, 3yr -> 0.38, 5yr -> 0.34. No held-out Brier is claimed
for the forward odds: future launches are unobservable in this snapshot.
Protocols with no listed_at (7 on the board) use the board's median age,
1.14 years.

Ranges: P25-P75 and P10-P90 come from the 10-fold residual quantiles of
the fitted model, recomputed at grade time (this snapshot: q25 -1.02,
q75 +1.04, q10 -2.67, q90 +2.16 in log space). Coverage: P25-P75 holds
49% of real caps (10-fold) / 50% (walk-forward) against 50% stated;
P10-P90 holds 79% / 79% against 80% stated; 50% of walk-forward caps
land within x3 of the point value.

## Protocol accounting (all 758, each in exactly one group)

198 ranked on this board + 416 already record a token + 144 left out:
128 by excluded category (Bridge / Canonical Bridge / Liquid Staking /
Liquid Restaking / Restaked BTC / CEX), 11 versioned copies, 5 wrapped
or staked products, 0 exchange-prefixed names. The board covers all 40
watchlist protocols. Eligibility is the watchlist's rule without its
$50M floor, so the board also ranks early protocols below the floor.

## Farm economics and verdicts

Per protocol, the plan costs $95: $15 gas (midpoint of the $10-$20
network fees named in the steps) + $5 fees/slippage + 3.0 hours at
$25/hour ($75). The $100-$300 deposits named in the steps are
recoverable capital, not a cost. Expected drop = drop share x implied
value (default drop share 7%, deposit $200, horizon 12 weeks — change
them in the scenario controls). Net = expected drop - $95.
Net/hour = net / 3.0. Verdict: FARM when net beats the T-bill return on
the deposit over the horizon (4% annualised) plus $25/hour for the time;
MARGINAL when net is positive but below that benchmark; SKIP when net
is at or below zero. At the default 7% drop share every row clears the
benchmark — the verdicts separate when you lower the drop share (your
share of the drop, not the protocol's total airdrop) in the controls.
"Records no token" is the snapshot's record, not proof. Implied values
are this board's own claim, not a price or investment advice.
