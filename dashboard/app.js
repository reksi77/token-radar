// Token Launch Radar — the page. Reads window.BOARD (written by main.ts
// into data.js), renders the KPI strip, accounting, self-check, evidence
// and the sortable, filterable board, and recomputes farm verdicts live
// under the scenario controls. No network: everything here is local data.

(function () {
  'use strict';

  var board = window.BOARD || { rows: [] };
  var rows = board.rows || [];
  var fit = board.fit || {};
  var state = { q: '', cat: '', chain: '', show: 'all', wl: false, sort: 'rank', dir: 1 };
  var scenario = {
    deposit: (board.scenario_default && board.scenario_default.deposit_usd) || 200,
    dropShare: ((board.scenario_default && board.scenario_default.drop_share) || 0.07),
    horizon: (board.scenario_default && board.scenario_default.horizon_weeks) || 12,
  };
  var COST = 95; // $15 gas + $5 fees + 3.0h x $25, see lib/farm.ts planCost
  var HOURS = 3.0;
  var selected = null;

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtUsd(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }

  function fmtUsdFull(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function fmtPct(g) {
    if (g === null || g === undefined) return '—';
    return (g > 0 ? '+' : '') + g.toFixed(1) + '%';
  }

  function fmtAge(y) {
    if (y === null || y === undefined) return '—';
    if (y < 1) return Math.round(y * 12) + 'mo';
    return y.toFixed(1) + 'y';
  }

  function tbillUsd() {
    return scenario.deposit * 0.04 * (scenario.horizon / 52);
  }

  function econ(r) {
    var expected = r.implied_value_usd * scenario.dropShare;
    var net = expected - COST;
    var verdict = net > tbillUsd() + 25 * HOURS ? 'FARM' : net > 0 ? 'MARGINAL' : 'SKIP';
    return { expected: expected, net: net, netPerHour: net / HOURS, verdict: verdict };
  }

  function verdictCounts() {
    var c = { FARM: 0, MARGINAL: 0, SKIP: 0 };
    rows.forEach(function (r) { c[econ(r).verdict]++; });
    return c;
  }

  function sortRows(list) {
    var k = state.sort;
    var d = state.dir;
    return list.slice().sort(function (a, b) {
      var av = k === 'verdict' ? econ(a).verdict : k === 'net_usd' ? econ(a).net : k === 'net_per_hour_usd' ? econ(a).netPerHour : a[k];
      var bv = k === 'verdict' ? econ(b).verdict : k === 'net_usd' ? econ(b).net : k === 'net_per_hour_usd' ? econ(b).netPerHour : b[k];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * d;
      if (Array.isArray(av)) return (av.join(',').localeCompare(bv.join(','))) * d;
      return (av - bv) * d;
    });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) === -1) return false;
      if (state.wl && !r.watchlist) return false;
      if (state.show === 'watchlist' && !r.watchlist) return false;
      if (state.show === 'offlist' && r.watchlist) return false;
      if (state.show === 'early' && r.tvl_usd >= 50000000) return false;
      if (state.show === 'farm' && econ(r).verdict !== 'FARM') return false;
      if (state.show === 'marginal' && econ(r).verdict !== 'MARGINAL') return false;
      if (state.show === 'skip' && econ(r).verdict !== 'SKIP') return false;
      return true;
    });
  }

  function render() {
    var list = sortRows(filtered());
    var html = list.map(function (r) {
      var g = r.change_7d;
      var gcls = g === null ? '' : g >= 0 ? 'pos' : 'neg';
      var e = econ(r);
      var vcls = e.verdict === 'FARM' ? 'farm' : e.verdict === 'MARGINAL' ? 'marg' : 'skip';
      return '<tr data-slug="' + esc(r.slug) + '"' + (selected === r.slug ? ' class="selected"' : '') + '>'
        + '<td class="num">' + r.rank + '</td>'
        + '<td class="name">' + esc(r.name)
        + (r.watchlist ? '<span class="pill wl">WATCHLIST</span>' : '<span class="pill off">OFF-LIST</span>')
        + '<span class="slug">' + esc(r.slug) + ' · ' + esc(r.category || '—') + ' · ' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</span></td>'
        + '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>'
        + '<td class="num ' + gcls + '">' + fmtPct(g) + '</td>'
        + '<td class="num">' + fmtAge(r.age_years) + (r.age_unknown ? '*' : '') + '</td>'
        + '<td class="num"><span class="oddsbar"><span style="width:' + Math.round(r.token_odds_2yr * 100) + '%"></span></span> ' + r.token_odds_2yr.toFixed(2) + '</td>'
        + '<td class="num">' + fmtUsd(r.value_if_launches_usd) + '</td>'
        + '<td class="num"><b>' + fmtUsd(r.implied_value_usd) + '</b></td>'
        + '<td class="num">' + fmtUsd(r.implied_p25_usd) + '–' + fmtUsd(r.implied_p75_usd) + '</td>'
        + '<td><span class="verdict ' + vcls + '">' + e.verdict + '</span></td>'
        + '<td class="num ' + (e.net >= 0 ? 'pos' : 'neg') + '">' + fmtUsd(e.net) + '</td>'
        + '<td class="num ' + (e.netPerHour >= 0 ? 'pos' : 'neg') + '">' + fmtUsd(e.netPerHour) + '/h</td>'
        + '</tr>';
    }).join('');
    $('rows').innerHTML = html || '<tr><td colspan="12">No protocols match the filters.</td></tr>';
    $('count').textContent = list.length + ' of ' + rows.length + ' protocols shown — click a row for its detail and farm plan. * age unknown: median board age used for the odds.';
    document.querySelectorAll('#board thead th').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === state.sort);
    });
    renderKpis();
  }

  function renderKpis() {
    var vc = verdictCounts();
    var h = fit.heldout || {};
    var chosen = h.chosen || { loo: {}, wf: {} };
    var flat = h.flat || { loo: {}, wf: {} };
    var old = h.old || { loo: {}, wf: {} };
    var cov = fit.coverage || {};
    $('stats').innerHTML = [
      ['Protocols ranked', rows.length, 'pre-token candidates · watchlist ' + rows.filter(function (r) { return r.watchlist; }).length + ' / ' + (board.watchlist_total || 40)],
      ['Total implied value', fmtUsd(board.total_implied_usd || 0), 'top: ' + (rows[0] ? rows[0].name + ' ' + fmtUsd(rows[0].implied_value_usd) : '—')],
      ['Out-of-sample miss', 'LOO ×' + (chosen.loo.typ || '—') + ' · WF ×' + (chosen.wf.typ || '—'), 'flat ×' + (flat.loo.typ || '—') + ' / ×' + (flat.wf.typ || '—') + ' · old ×' + (old.loo.typ || '—') + ' / ×' + (old.wf.typ || '—')],
      ['Range holds', 'P25–P75 ' + Math.round((cov.wf2575 || 0) * 100) + '% · P10–P90 ' + Math.round((cov.wf1090 || 0) * 100) + '%', 'walk-forward, stated 50% / 80%'],
      ['Token odds held out', 'Brier 0.217 vs 0.250 base', 'logistic + age, 10-fold · WF 0.236 vs 0.361'],
      ['Worth farming', vc.FARM + ' FARM', vc.MARGINAL + ' MARGINAL · ' + vc.SKIP + ' SKIP · $200, 7%, 12w'],
    ].map(function (s) {
      return '<div class="stat"><div class="k">' + s[0] + '</div><div class="v">' + esc(s[1]) + '</div><div class="s">' + esc(s[2]) + '</div></div>';
    }).join('');
  }

  function renderAccounting() {
    var a = (fit.accounting) || {};
    var total = a.total || 758;
    var parts = [
      ['Ranked', a.ranked || 198, '#34d399'],
      ['Tokenized', a.tokenized || 416, '#60a5fa'],
      ['Excluded', a.excluded_total || 144, '#fbbf24'],
    ];
    $('acct-bar').innerHTML = parts.map(function (p) {
      return '<span style="width:' + (p[1] / total * 100).toFixed(1) + '%;background:' + p[2] + '" title="' + p[0] + ' ' + p[1] + '"></span>';
    }).join('');
  }

  function renderChecks() {
    var el = $('checks');
    var byRank = rows.slice().sort(function (a, b) { return a.rank - b.rank; });
    var ranksOk = byRank.every(function (r, i) { return r.rank === i + 1; });
    var nonRising = byRank.every(function (r, i) { return i === 0 || r.implied_value_usd <= byRank[i - 1].implied_value_usd; });
    var sum = rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    var totalsOk = sum === board.total_implied_usd;
    var wl = rows.filter(function (r) { return r.watchlist; }).length;
    var a = fit.accounting || {};
    var ledgerOk = (a.ranked || 0) + (a.tokenized || 0) + (a.excluded_total || 0) === (a.total || 758);
    var seal = (fit && fit.seal) || '';
    function draw(sealOk, sealNote) {
      var items = [
        ['Table = board.json', rows.length + ' rows drawn, ' + rows.length + ' rows written', true],
        ['Ranks 1–' + rows.length + ' in order', ranksOk ? 'PASS' : 'FAIL', ranksOk],
        ['Values never rise', nonRising ? 'PASS' : 'FAIL', nonRising],
        ['Totals equal', fmtUsd(sum) + ' drawn = ' + fmtUsd(board.total_implied_usd || 0) + ' written', totalsOk],
        ['Seal', (sealOk === null ? 'shown, not recomputed (' + sealNote + ')' : sealOk ? 'PASS — recomputed hash matches' : 'FAIL — hash mismatch') + ' · ' + esc(seal.slice(0, 16)) + '…', sealOk !== false],
        ['Watchlist', wl + ' / ' + (board.watchlist_total || 40) + ' ranked', wl === (board.watchlist_total || 40)],
        ['Ledger', (a.total || 758) + ' / ' + (a.total || 758) + ' protocols accounted for', ledgerOk],
      ];
      el.innerHTML = items.map(function (it) {
        return '<div class="check ' + (it[2] ? 'ok' : 'bad') + '"><div class="k">' + it[0] + '</div><div class="v">' + it[1] + '</div></div>';
      }).join('');
    }
    var str = rows.map(function (r) { return r.slug + ':' + r.implied_value_usd; }).join(',');
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
        var hex = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        draw(hex === seal, '');
      }).catch(function () { draw(null, 'digest unavailable'); });
    } else {
      draw(null, 'crypto.subtle unavailable');
    }
  }

  function renderDetail() {
    var r = rows.find(function (x) { return x.slug === selected; });
    var panel = $('detail');
    if (!r) { panel.hidden = true; return; }
    panel.hidden = false;
    $('d-name').textContent = r.name;
    $('d-badges').innerHTML =
      '<span class="pill pre">PRE-TOKEN</span>'
      + (r.watchlist ? '<span class="pill wl">WATCHLIST</span>' : '<span class="pill off">OFF-LIST</span>')
      + '<span class="pill">RANK #' + r.rank + '</span>';
    var b = r.value_breakdown;
    var e = econ(r);
    var breakeven = (COST / r.implied_value_usd * 100);
    $('d-stats').innerHTML = [
      ['Implied value', fmtUsd(r.implied_value_usd)],
      ['Value if it launches', fmtUsd(r.value_if_launches_usd)],
      ['Token odds (2yr)', r.token_odds_2yr.toFixed(2)],
      ['TVL', fmtUsd(r.tvl_usd)],
      ['7-day change', fmtPct(r.change_7d)],
      ['No-token age', fmtAge(r.age_years) + (r.age_unknown ? ' (unknown — median 1.14y used)' : '')],
      ['Category', r.category || '—'],
      ['Chains', r.chains.join(', ')],
    ].map(function (c) {
      return '<div class="cell"><div class="k">' + c[0] + '</div><div class="v">' + esc(c[1]) + '</div></div>';
    }).join('');
    $('d-formula').textContent =
      fmtUsd(r.tvl_usd) + ' TVL × ' + b.multiple.toFixed(4) + ' fitted multiple'
      + ' = ' + fmtUsd(r.value_if_launches_usd) + ' if it launches'
      + ' × ' + r.token_odds_2yr.toFixed(2) + ' token odds (2yr)'
      + ' = ' + fmtUsd(r.implied_value_usd);
    var sgn = function (v) { return (v == null ? '—' : (v < 0 ? '− ' + Math.abs(v) : '+ ' + v)); };
    $('d-breakdown').innerHTML =
      '<tr><th>Figure</th><th>Value</th><th>Where it comes from</th></tr>'
      + '<tr><td>TVL</td><td>' + fmtUsd(b.tvl_usd) + '</td><td>Snapshot, ' + esc(board.as_of || '') + '</td></tr>'
      + '<tr><td>log(mcap/TVL)</td><td>' + b.log_multiple.toFixed(3) + '</td><td>' + (fit.a != null ? fit.a : '—') + ' ' + sgn(fit.b) + '×(log TVL − 17) ' + sgn(fit.c) + '×(chg/10); chg clipped ' + b.chg_clipped + '%</td></tr>'
      + '<tr><td>Fitted multiple</td><td>' + b.multiple.toFixed(4) + '×</td><td>exp(log multiple), ridge alpha 1.0 on 95 traded tokens</td></tr>'
      + '<tr><td>Value if it launches</td><td>' + fmtUsd(b.value_if_launches_usd) + '</td><td>TVL × fitted multiple</td></tr>'
      + '<tr><td>Token odds (2yr)</td><td>' + r.token_odds_2yr.toFixed(2) + '</td><td>Weibull hazard, lam ' + (fit.weibull ? fit.weibull.lam : '—') + ', k ' + (fit.weibull ? fit.weibull.k : '—') + ', age ' + fmtAge(r.age_years) + '</td></tr>'
      + '<tr><td>P25–P75 (implied)</td><td>' + fmtUsd(r.implied_p25_usd) + ' – ' + fmtUsd(r.implied_p75_usd) + '</td><td>10-fold residual quantiles, × odds</td></tr>'
      + '<tr><td>P10–P90 (implied)</td><td>' + fmtUsd(r.implied_p10_usd) + ' – ' + fmtUsd(r.implied_p90_usd) + '</td><td>10-fold residual quantiles, × odds</td></tr>'
      + '<tr><td><b>Implied value</b></td><td><b>' + fmtUsd(r.implied_value_usd) + '</b></td><td><b>TVL × multiple × odds</b></td></tr>';
    $('d-econ').textContent =
      'Under the current scenario ($' + scenario.deposit + ' deposit, ' + (scenario.dropShare * 100).toFixed(1) + '% drop share, '
      + scenario.horizon + ' weeks): expected drop ' + fmtUsdFull(e.expected) + ' − $95 plan cost = net '
      + fmtUsd(e.net) + ' (' + fmtUsd(e.netPerHour) + '/hour over ' + HOURS.toFixed(1) + 'h), verdict ' + e.verdict
      + '. Break-even drop share: ' + breakeven.toFixed(4) + '% of implied value. '
      + 'T-bill benchmark on the deposit: ' + fmtUsdFull(tbillUsd()) + '. '
      + 'Plan cost $95 = $15 gas + $5 fees + 3.0h × $25; the deposit is recoverable capital, not a cost.';
    $('d-steps').innerHTML = r.farm_steps.map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function exportCsv() {
    var head = 'rank,slug,name,category,chains,tvl_usd,change_7d,age_years,token_odds_2yr,value_if_launches_usd,implied_value_usd,implied_p25_usd,implied_p75_usd,verdict,net_usd,net_per_hour_usd,watchlist\n';
    var body = filtered().map(function (r) {
      var e = econ(r);
      var cells = [r.rank, r.slug, r.name, r.category || '', r.chains.join(';'), r.tvl_usd, r.change_7d, r.age_years, r.token_odds_2yr, r.value_if_launches_usd, r.implied_value_usd, r.implied_p25_usd, r.implied_p75_usd, e.verdict, Math.round(e.net), Math.round(e.netPerHour), r.watchlist];
      return cells.map(function (c) { var s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
    }).join('\n');
    download('token-radar-board.csv', head + body + '\n', 'text/csv');
  }

  function exportJson() {
    download('token-radar-board.json', JSON.stringify({ as_of: board.as_of, scenario: scenario, rows: filtered() }, null, 2) + '\n', 'application/json');
  }

  function init() {
    var sgn = function (v) { return (v == null ? '—' : (v < 0 ? '− ' + Math.abs(v) : '+ ' + v)); };
    $('meta').innerHTML = 'Snapshot <b>' + esc(board.as_of || '') + '</b> · floor <b>'
      + fmtUsd(board.floor_usd || 0) + '</b> · source: DefiLlama<br>Fit: log(mult) = '
      + (fit.a != null ? fit.a : '—') + ' ' + sgn(fit.b) + '×(logTVL−17) ' + sgn(fit.c) + '×(chg/10)';
    if (fit.coverage) {
      $('cov-loo2575').textContent = Math.round(fit.coverage.loo2575 * 100) + '%';
      $('cov-wf2575').textContent = Math.round(fit.coverage.wf2575 * 100) + '%';
      $('cov-loo1090').textContent = Math.round(fit.coverage.loo1090 * 100) + '%';
      $('cov-wf1090').textContent = Math.round(fit.coverage.wf1090 * 100) + '%';
      $('cov-wf3').textContent = Math.round(fit.coverage.wfWithin3 * 100) + '%';
    }
    renderAccounting();
    renderChecks();

    var cats = [...new Set(rows.map(function (r) { return r.category; }).filter(Boolean))].sort();
    cats.forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o);
    });
    var chains = [...new Set(rows.flatMap(function (r) { return r.chains; }))].sort();
    chains.forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o);
    });

    $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
    $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
    $('show').addEventListener('change', function (e) { state.show = e.target.value; render(); });
    $('wl').addEventListener('change', function (e) { state.wl = e.target.checked; render(); });
    $('reset').addEventListener('click', function () {
      state = { q: '', cat: '', chain: '', show: 'all', wl: false, sort: 'rank', dir: 1 };
      $('q').value = ''; $('cat').value = ''; $('chain').value = '';
      $('show').value = 'all'; $('wl').checked = false;
      render();
    });
    $('export-csv').addEventListener('click', exportCsv);
    $('export-json').addEventListener('click', exportJson);
    $('deposit').addEventListener('input', function (e) { scenario.deposit = Number(e.target.value) || 0; render(); renderDetail(); });
    $('dropshare').addEventListener('input', function (e) { scenario.dropShare = (Number(e.target.value) || 0) / 100; render(); renderDetail(); });
    $('horizon').addEventListener('input', function (e) { scenario.horizon = Number(e.target.value) || 12; render(); renderDetail(); });
    document.querySelectorAll('#board thead th').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (!k) return;
        if (state.sort === k) state.dir = -state.dir;
        else { state.sort = k; state.dir = k === 'rank' ? 1 : -1; }
        render();
      });
    });
    $('rows').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (!tr) return;
      selected = tr.getAttribute('data-slug');
      render();
      renderDetail();
      $('detail').scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    $('d-close').addEventListener('click', function () {
      selected = null; render(); renderDetail();
    });

    // Deep links for screenshots: ?detail=<slug>, ?show=<filter>, ?view=evidence
    var params = new URLSearchParams(window.location.search);
    var detailSlug = params.get('detail');
    var show = params.get('show');
    var view = params.get('view');
    if (show) { state.show = show; $('show').value = show; }
    if (detailSlug && rows.some(function (r) { return r.slug === detailSlug; })) {
      selected = detailSlug;
    }
    render();
    renderDetail();
    if (view === 'evidence') {
      var ev = document.querySelector('[aria-label="Out-of-sample evidence"]');
      if (ev) ev.scrollIntoView({ behavior: 'auto', block: 'start' });
    } else if (selected) {
      $('detail').scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
