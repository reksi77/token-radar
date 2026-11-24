// Farm plans: concrete steps per protocol, generated from its own record.
//
// Every plan is five steps built from the protocol's category and its main
// chain, with what each step costs and how long it takes. Nothing here is
// a slogan: each step names an action on the protocol itself. Steps stay
// honest about what the snapshot does not say — no plan claims a points
// program exists, and every plan ends with tracking announcements, because
// a launch is announced by the protocol, never by this board.

import type { Protocol } from './model.ts';

/** Compact dollars: 2758000000 -> $2.76B, 40368186 -> $40.37M. */
export function fmtCompact(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(2)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(1)}K`;
  return `$${usd}`;
}

type Ctx = { name: string; chain: string; tvl: string };

function fill(template: string, ctx: Ctx): string {
  return template
    .replaceAll('{name}', ctx.name)
    .replaceAll('{chain}', ctx.chain)
    .replaceAll('{tvl}', ctx.tvl);
}

// Each category's five steps. {name} is the protocol, {chain} its main
// chain, {tvl} its TVL as a compact string.
const TEMPLATES: Record<string, string[]> = {
  Dexs: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test swap first to confirm the address and chain are right.',
    'Swap $50-$150 across two or three different token pairs on {name}, a few dollars of slippage at most, and leave at least one swap running through a limit or TWAP order if the protocol offers one.',
    'Provide $50-$200 of liquidity to one {name} pool on {chain} in a pair you would hold anyway, and keep the position open for at least 4 weeks so it reads as a real liquidity provider.',
    'Repeat a swap or a liquidity adjustment once a week for 6-8 weeks with varied amounts, and use a second feature of {name} (staking, routing or a new pool) at least once.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Lending: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Supply $50-$200 of a major asset (ETH, USDC or wBTC) to {name} as collateral and leave it supplied for at least 4 weeks; supplying is the lowest-risk way to appear on the protocol.',
    'Borrow $20-$80 against that collateral on {name}, use it or repay it within a week, and keep your health factor above 2 so the position never risks liquidation.',
    'Repeat a supply, borrow or repay action once a week for 6-8 weeks with varied amounts, and try a second market or collateral type on {name} at least once.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Yield: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into the highest-TVL vault on {name} and leave it deposited for at least 4 weeks; a vault holding {tvl} in total rewards patient depositors over one-day visitors.',
    'Move half of that deposit into a second vault or strategy on {name} after two weeks, so your history shows two strategies instead of one deposit and nothing else.',
    'Repeat a deposit, withdrawal or rebalance once a week for 6-8 weeks with varied amounts, and claim any yield the vault pays at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Yield Aggregator': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into the highest-TVL vault on {name} and leave it deposited for at least 4 weeks; a vault holding {tvl} in total rewards patient depositors over one-day visitors.',
    'Move half of that deposit into a second vault or strategy on {name} after two weeks, so your history shows two strategies instead of one deposit and nothing else.',
    'Repeat a deposit, withdrawal or rebalance once a week for 6-8 weeks with varied amounts, and claim any yield the vault pays at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Risk Curators': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into a curated vault on {name} and leave it deposited for at least 4 weeks; curators holding {tvl} in total are judged on steady vault deposits, not one-off visits.',
    'Allocate a second $25-$100 to a different curator vault on {name} after two weeks, and compare the two vaults\' yields and risk settings before choosing where to keep the larger share.',
    'Repeat a deposit, withdrawal or reallocation once a week for 6-8 weeks with varied amounts, and vote or signal on a curator proposal if {name} opens one.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  RWA: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Buy or mint $50-$200 of the tokenized real-world asset {name} offers on {chain}, after reading its own docs on eligibility, lock-ups and redemption, and hold it for at least 4 weeks.',
    'If {name} lets you lend, stake or use that asset as collateral, put $25-$100 of it to work in a second step, and keep the position open rather than flipping it within days.',
    'Repeat an on-chain action on {name} once a week for 6-8 weeks with varied amounts, and complete any identity or eligibility step the protocol requires well before any deadline it announces.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Onchain Capital Allocator': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into a vault or allocation product on {name} and leave it deposited for at least 4 weeks; an allocator holding {tvl} in total rewards steady capital over one-day deposits.',
    'Split a second $25-$100 across a different strategy or vault on {name} after two weeks, and read the allocator\'s own reporting on where the capital goes before adding more.',
    'Repeat a deposit, withdrawal or reallocation once a week for 6-8 weeks with varied amounts, and take part in any allocation vote or signal {name} opens.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Basis Trading': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into the basis or delta-neutral vault on {name} and leave it deposited for at least 4 weeks, after reading the vault\'s own docs on funding-rate risk.',
    'If {name} offers a second vault or a leveraged option, allocate $25-$100 there after two weeks, and keep your total exposure to an amount you can afford to hold for two months.',
    'Repeat a deposit or withdrawal once a week for 6-8 weeks with varied amounts, and claim or compound any yield the vault pays at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  CDP: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Open a collateralized position on {name} by locking $50-$200 of collateral and minting $20-$80 of its stable asset, keeping the collateral ratio well above the liquidation line.',
    'Use the minted asset somewhere real — repay it, swap it, or supply it to a {name} pool — and keep the position open for at least 4 weeks rather than closing it the same day.',
    'Repeat a mint, repay or collateral-top-up action once a week for 6-8 weeks with varied amounts, and keep your collateral ratio above 200% the whole time.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'CDP Manager': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Open a collateralized position through {name} by locking $50-$200 of collateral and minting $20-$80 of stable asset, keeping the collateral ratio well above the liquidation line.',
    'Use the minted asset somewhere real — repay it, swap it, or supply it to a pool — and keep the position open for at least 4 weeks rather than closing it the same day.',
    'Repeat a mint, repay or collateral-top-up action once a week for 6-8 weeks with varied amounts, and keep your collateral ratio above 200% the whole time.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Derivatives: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Open a small $20-$100 perpetual or derivative position on {name} with low leverage (2x at most), and set a stop so a bad week costs the position, never the wallet.',
    'Close that position after a few days, then open a second one in the opposite direction or a different market on {name}, so your history shows real trading rather than one bet.',
    'Trade once a week for 6-8 weeks with varied sizes and markets, keeping each position under $100, and never hold a leveraged position open through a weekend you cannot watch.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Restaking: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Restake $50-$200 of a liquid staking token through {name} and leave it restaked for at least 4 weeks; restaking rewards are for capital that stays, not for funds that pass through.',
    'Delegate or allocate a second $25-$100 to a different operator or vault on {name} after two weeks, and read the slashing and withdrawal terms before adding more.',
    'Repeat a restake, delegate or withdrawal action once a week for 6-8 weeks with varied amounts, and claim any restaking rewards at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Chain: [
    'Set up a fresh wallet for {name} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Bridge $50-$150 onto {name} through its official bridge and use the chain\'s own apps: swap once, supply once, and hold the native asset for at least 4 weeks.',
    'Deploy or interact with a second application on {name} after two weeks, and keep a small balance of the native asset in the wallet so you can always pay for gas.',
    'Use the chain once a week for 6-8 weeks with varied actions and amounts, and try a new application on {name} each month rather than repeating one transaction.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the chain\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Staking Pool': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Stake $50-$200 through {name} and leave it staked for at least 4 weeks; staking pools holding {tvl} in total reward stakers who stay over funds that enter and leave.',
    'If {name} offers a liquid staking token, use $25-$100 of it in a second step (supply it or provide liquidity), and keep the rest staked rather than selling it.',
    'Repeat a stake, unstake or reward-claim action once a week for 6-8 weeks with varied amounts, and claim staking rewards at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  CeDeFi: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into a CeDeFi product on {name} and leave it deposited for at least 4 weeks, after reading the product\'s own docs on custody, lock-ups and redemption.',
    'Allocate a second $25-$100 to a different product or strategy on {name} after two weeks, and keep your total exposure to an amount you can afford to hold for two months.',
    'Repeat a deposit or withdrawal once a week for 6-8 weeks with varied amounts, and complete any identity or eligibility step the protocol requires well before any deadline.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Insurance: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Buy $20-$100 of cover on {name} for a protocol or asset you actually use, for a 30-day term, and read the policy\'s own terms on what is covered before paying.',
    'If {name} lets you underwrite or stake into a cover pool, allocate $25-$100 there after two weeks, and keep the position for the full policy term.',
    'Repeat a cover purchase, renewal or underwriting action once a week for 6-8 weeks with varied amounts, and file or track any claim paperwork the protocol requires.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Payments: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test payment first to confirm the address and chain are right.',
    'Make two or three real payments of $20-$100 through {name} over the first month — paying a bill, a person or a merchant you already use — and keep the receipts.',
    'If {name} offers a card, account or recurring payment, set one up with $25-$100 and let it run for at least 4 weeks, so your history shows repeated use, not one transfer.',
    'Use {name} once a week for 6-8 weeks with varied amounts and recipients, and keep a small balance in the wallet so a payment never fails for lack of funds.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Prediction Market': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test trade first to confirm the address and chain are right.',
    'Trade $20-$100 across two or three different markets on {name}, in outcomes you have actually researched, and hold the positions until the markets resolve rather than flipping them.',
    'Add liquidity or a second market position of $25-$100 on {name} after two weeks, and keep your total exposure per market under $100.',
    'Trade once a week for 6-8 weeks with varied markets and sizes, and never put more into one market than you can afford to lose outright.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Cross Chain Bridge': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test bridge first to confirm the address and chain are right.',
    'Bridge $50-$150 through {name} to a second chain you actually use, and use the bridged funds there (swap or supply) instead of bridging them straight back.',
    'Bridge a different asset or to a third chain through {name} after two weeks, keeping each bridge over $25 so the transfer is not eaten by fees.',
    'Repeat a bridge once a week for 6-8 weeks with varied assets, amounts and destination chains, and keep a small gas balance on every chain you bridge to.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Collateral Markets': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Supply $50-$200 of collateral to a market on {name} and leave it supplied for at least 4 weeks, keeping your health factor above 2 so the position never risks liquidation.',
    'Borrow $20-$80 against that collateral on {name}, use it or repay it within a week, and try a second collateral type or market after two weeks.',
    'Repeat a supply, borrow or repay action once a week for 6-8 weeks with varied amounts, and top up collateral whenever your health factor drifts below 2.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Governance Incentives': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Lock or delegate $50-$200 through {name} for at least 4 weeks, and vote on the first live proposal, reading the proposal text before voting rather than following a crowd.',
    'Take part in a second vote or incentive round on {name} after two weeks, and keep your lock active for the full period instead of exiting early.',
    'Vote or claim incentives once a week for 6-8 weeks with varied amounts, and join the protocol\'s governance discussion at least once with a real question or view.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Stablecoin Wrapper': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test mint first to confirm the address and chain are right.',
    'Mint or wrap $50-$200 through {name} and hold the wrapped asset for at least 4 weeks, after reading the wrapper\'s own docs on backing, fees and redemption.',
    'Use $25-$100 of the wrapped asset in a second step (supply it or provide liquidity), and keep the rest wrapped rather than unwrapping it within days.',
    'Repeat a mint, unwrap or supply action once a week for 6-8 weeks with varied amounts, and redeem a small amount once to confirm the redemption path works.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Decentralized BTC': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Mint or deposit $50-$200 of BTC-backed assets through {name} and hold them for at least 4 weeks, after reading the protocol\'s own docs on custody and redemption.',
    'Use $25-$100 of the position in a second step (supply it or provide liquidity on {chain}), and keep the rest in the protocol rather than withdrawing it within days.',
    'Repeat a deposit, withdrawal or supply action once a week for 6-8 weeks with varied amounts, and redeem a small amount once to confirm the redemption path works.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Anchor BTC': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 of BTC-backed assets through {name} and hold them for at least 4 weeks, after reading the protocol\'s own docs on custody and redemption.',
    'Use $25-$100 of the position in a second step (supply it or provide liquidity on {chain}), and keep the rest in the protocol rather than withdrawing it within days.',
    'Repeat a deposit, withdrawal or supply action once a week for 6-8 weeks with varied amounts, and redeem a small amount once to confirm the redemption path works.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Leveraged Farming': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Open a $50-$150 leveraged farm on {name} at 2x leverage at most, after reading the protocol\'s own docs on liquidation, and keep the health factor above 2.',
    'Close or reduce that position after a few days, then open a second one in a different pool on {name}, so your history shows managed farming rather than one leveraged bet.',
    'Farm once a week for 6-8 weeks with varied pools and sizes, keeping each position under $150, and never hold a leveraged position open through a weekend you cannot watch.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Liquidity Manager': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into a managed liquidity position on {name} and leave it for at least 4 weeks, after reading the manager\'s own docs on ranges, fees and rebalancing.',
    'Allocate a second $25-$100 to a different pool or range on {name} after two weeks, and compare the two positions\' fees before adding more to either.',
    'Repeat a deposit, withdrawal or rebalance once a week for 6-8 weeks with varied amounts, and claim the liquidity fees the position earns at least twice.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Indexes: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test purchase first to confirm the address and chain are right.',
    'Buy $50-$200 of the index {name} offers and hold it for at least 4 weeks, after reading the index\'s own docs on its holdings, fees and rebalancing.',
    'Add a second $25-$100 to the same index or a different one on {name} after two weeks, and keep the position through at least one rebalance.',
    'Repeat a buy or sell action once a week for 6-8 weeks with varied amounts, and read the index\'s rebalancing notes each time before changing your position.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Farm: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into a farm on {name} and leave it staked for at least 4 weeks, after reading the farm\'s own docs on lock-ups and reward schedules.',
    'Move half of that deposit into a second farm or pool on {name} after two weeks, so your history shows two farms instead of one deposit and nothing else.',
    'Repeat a deposit, withdrawal or harvest once a week for 6-8 weeks with varied amounts, and harvest rewards at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'OTC Marketplace': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Complete one $50-$200 over-the-counter trade through {name}, for an asset you actually want to hold, after reading the marketplace\'s own docs on escrow and settlement.',
    'Place a second order or fill a second trade on {name} after two weeks, for a different asset or size, and keep the settled assets rather than flipping them the same day.',
    'Repeat a trade once a week for 6-8 weeks with varied assets and sizes, and leave honest feedback or a rating on the marketplace when it offers one.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Interest Rate Derivatives': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test trade first to confirm the address and chain are right.',
    'Open a $20-$100 fixed-versus-floating rate position on {name} with a 1-3 month tenor, after reading the protocol\'s own docs on how the rates settle.',
    'Close or roll that position after a few weeks, then open a second one in a different tenor or market on {name}, so your history shows real rate trading rather than one bet.',
    'Trade once a week for 6-8 weeks with varied tenors and sizes, keeping each position under $100, and never hold a position into a settlement you have not read the terms of.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Uncollateralized Lending': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'If {name} offers undercollateralized credit, complete its borrower checks and borrow $20-$80, then repay it on time and in full within the agreed term.',
    'Lend or supply $50-$200 to a credit pool on {name} after two weeks, and read the pool\'s own docs on borrower defaults before adding more.',
    'Repeat a borrow, repay or supply action once a week for 6-8 weeks with varied amounts, and keep a perfect repayment record — a late repayment costs more than any farm reward.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Dual-Token Stablecoin': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test mint first to confirm the address and chain are right.',
    'Mint $50-$200 of the stable asset through {name} by locking collateral, keeping the collateral ratio well above the liquidation line.',
    'Use the minted asset somewhere real — supply it or provide liquidity — and hold the position for at least 4 weeks rather than closing it the same day.',
    'Repeat a mint, repay or collateral-top-up action once a week for 6-8 weeks with varied amounts, and keep your collateral ratio above 200% the whole time.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Crypto Card Issuer': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Order or activate the card {name} issues, load it with $50-$200, and make two or three real purchases over the first month with merchants you already use.',
    'Keep the card funded and use it once a week for 6-8 weeks with varied amounts, so your history shows repeated spending, not one top-up.',
    'If {name} offers cashback or rewards, claim them at least twice during that period, and keep a small balance on the card so a payment never fails.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  Privacy: [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
    'Use {name} for a $20-$100 private transfer or shielded deposit, after reading the protocol\'s own docs on how the privacy set works and what it costs.',
    'Make a second private transaction of a different size on {name} after two weeks, and keep the funds in the shielded pool for at least a week each time.',
    'Repeat a private transaction once a week for 6-8 weeks with varied amounts, and never move funds straight back to the same address you sent them from.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
  'Options Vault': [
    'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test deposit first to confirm the address and chain are right.',
    'Deposit $50-$200 into an options vault on {name} and leave it for at least 4 weeks, after reading the vault\'s own docs on strikes, expiries and max loss.',
    'Allocate a second $25-$100 to a different vault or expiry on {name} after two weeks, and keep your total exposure to an amount you can afford to hold for two months.',
    'Repeat a deposit or withdrawal once a week for 6-8 weeks with varied amounts, and claim the vault\'s yield at least twice during that period.',
    'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
  ],
};

const GENERIC: string[] = [
  'Set up a fresh wallet for {name} on {chain} and fund it with about $100-$300 plus $10-$20 for network fees, then send a $5 test transaction first to confirm the address and chain are right.',
  'Make a first real on-chain action on {name} with $50-$200 — deposit, swap, supply or stake, whichever the protocol is built for — and leave the position open for at least 4 weeks.',
  'Use a second feature of {name} after two weeks (a different pool, market or vault), with $25-$100, so your history shows two real uses instead of one transaction.',
  'Repeat an on-chain action on {name} once a week for 6-8 weeks with varied amounts, and keep positions open rather than entering and exiting the same day.',
  'Keep a log of every wallet, transaction hash and date for {name}, and check the protocol\'s own announcements once a week for any points program, token or snapshot news.',
];

/** Five concrete farm steps for a protocol, from its category template. */
export function generateFarmSteps(p: Protocol): string[] {
  const ctx: Ctx = {
    name: p.name,
    chain: p.chains[0] ?? 'Ethereum',
    tvl: fmtCompact(p.tvl_usd),
  };
  const templates = TEMPLATES[p.category ?? ''] ?? GENERIC;
  return templates.map((t) => fill(t, ctx));
}

// ------------------------------------------------------------ farm costing
// What a plan costs, stated once here so the board, the dashboard and the
// method file all use the same numbers. The dollar amounts named in the
// steps are mostly DEPOSITS ($100-$300 to fund the wallet, $50-$200 per
// action): that money stays yours — it is recoverable capital, not a cost,
// and it is NOT counted here. What is counted:
//   - gas / network fees: the steps name $10-$20 for network fees; the
//     midpoint, $15, is the gas estimate for the whole plan.
//   - other fees / slippage: "a few dollars of slippage at most" in the
//     swap steps; $5 for the plan.
//   - time: 3.0 hours total — step 1 setup 0.5h, step 2 first action
//     0.75h, step 3 second position 0.5h, step 4 weekly repeats 0.75h,
//     step 5 logging / checking announcements 0.5h — valued at $25/hour
//     ($75). The plan runs 6-8 weeks of weekly check-ins, but the hands-on
//     time is about 3 hours.
// Total non-recoverable cost: $15 + $5 + $75 = $95 per protocol.
// The deposit itself (default plan size $200) is shown separately in the
// dashboard's scenario controls and only enters the verdict through the
// T-bill benchmark (see farmEconomics in model.ts).

export interface PlanCost {
  gas_usd: number;
  other_fees_usd: number;
  hours: number;
  time_usd: number;
  total_cost_usd: number;
}

export const HOURS_PER_STEP = [0.5, 0.75, 0.5, 0.75, 0.5];
export const TIME_VALUE_USD_PER_HOUR = 25;

/** The cost of farming one protocol. Same for every protocol: the steps
 *  differ by category, but the fees and the time do not. */
export function planCost(_p: Protocol): PlanCost {
  const hours = HOURS_PER_STEP.reduce((a, b) => a + b, 0);
  const timeUsd = hours * TIME_VALUE_USD_PER_HOUR;
  return {
    gas_usd: 15,
    other_fees_usd: 5,
    hours,
    time_usd: timeUsd,
    total_cost_usd: 15 + 5 + timeUsd,
  };
}
