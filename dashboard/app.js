// Token Launch Radar — the page. Reads window.BOARD (written by main.ts
// into data.js), renders the sortable, filterable board and the detail view
// for each protocol. No network: everything here is local data.

(function () {
  'use strict';

  var board = window.BOARD || { rows: [] };
  var rows = board.rows || [];
  var state = { q: '', cat: '', chain: '', minTvl: 0, wl: false, sort: 'rank', dir: 1 };
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
    return '$' + n;
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

  function sortRows(list) {
    var k = state.sort;
    var d = state.dir;
    return list.slice().sort(function (a, b) {
      var av = a[k], bv = b[k];
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
      if (r.tvl_usd < state.minTvl) return false;
      if (state.wl && !r.watchlist) return false;
      return true;
    });
  }

  function render() {
    var list = sortRows(filtered());
    var html = list.map(function (r) {
      var g = r.change_7d;
      var gcls = g === null ? '' : g >= 0 ? 'pos' : 'neg';
      return '<tr data-slug="' + esc(r.slug) + '"' + (selected === r.slug ? ' class="selected"' : '') + '>'
        + '<td class="num">' + r.rank + '</td>'
        + '<td class="name">' + esc(r.name)
        + (r.watchlist ? '<span class="pill wl">WATCHLIST</span>' : '')
        + '<span class="slug">' + esc(r.slug) + '</span></td>'
        + '<td>' + esc(r.category || '—') + '</td>'
        + '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>'
        + '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>'
        + '<td class="num ' + gcls + '">' + fmtPct(g) + '</td>'
        + '<td class="num">' + fmtAge(r.age_years) + '</td>'
        + '<td class="num"><b>' + fmtUsd(r.implied_value_usd) + '</b></td>'
        + '</tr>';
    }).join('');
    $('rows').innerHTML = html || '<tr><td colspan="8">No protocols match the filters.</td></tr>';
    $('count').textContent = list.length + ' of ' + rows.length + ' protocols shown — click a row for its detail and farm plan.';
    document.querySelectorAll('#board thead th').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === state.sort);
    });
  }

  function renderDetail() {
    var r = rows.find(function (x) { return x.slug === selected; });
    var panel = $('detail');
    if (!r) { panel.hidden = true; return; }
    panel.hidden = false;
    $('d-name').textContent = r.name;
    $('d-badges').innerHTML =
      '<span class="pill pre">PRE-TOKEN</span>'
      + (r.watchlist ? '<span class="pill wl">WATCHLIST</span>' : '');
    var b = r.value_breakdown;
    $('d-stats').innerHTML = [
      ['Implied value', fmtUsd(r.implied_value_usd)],
      ['TVL', fmtUsd(r.tvl_usd)],
      ['7-day change', fmtPct(r.change_7d)],
      ['Listed', r.listed_at || 'unknown'],
      ['Category', r.category || '—'],
      ['Chains', r.chains.join(', ')],
      ['Rank', '#' + r.rank + ' of ' + rows.length],
      ['Age without token', fmtAge(r.age_years)],
    ].map(function (c) {
      return '<div class="cell"><div class="k">' + c[0] + '</div><div class="v">' + esc(c[1]) + '</div></div>';
    }).join('');
    $('d-formula').textContent =
      fmtUsd(r.tvl_usd) + ' TVL × ' + b.multiple.toFixed(3) + ' category multiple'
      + ' × ' + b.growth_factor.toFixed(3) + ' growth × ' + b.age_factor.toFixed(3) + ' age'
      + ' = ' + fmtUsd(r.implied_value_usd);
    $('d-breakdown').innerHTML =
      '<tr><th>Figure</th><th>Value</th><th>Where it comes from</th></tr>'
      + '<tr><td>TVL</td><td>' + fmtUsd(b.tvl_usd) + '</td><td>Snapshot, ' + esc(board.as_of || '') + '</td></tr>'
      + '<tr><td>Category multiple</td><td>' + b.multiple.toFixed(3) + '×</td><td>Median mcap/TVL of tokenized ' + esc(r.category || 'peers') + ', shrunk to the global median</td></tr>'
      + '<tr><td>Growth factor</td><td>' + b.growth_factor.toFixed(3) + '×</td><td>7-day TVL change ' + fmtPct(r.change_7d) + ', doubled, clamped 0.70–1.50</td></tr>'
      + '<tr><td>Age factor</td><td>' + b.age_factor.toFixed(3) + '×</td><td>' + fmtAge(r.age_years) + ' listed with no token, 1 + 0.05/year, capped 1.20</td></tr>'
      + '<tr><td><b>Implied value</b></td><td><b>' + fmtUsd(r.implied_value_usd) + '</b></td><td>TVL × multiple × growth × age</td></tr>';
    $('d-steps').innerHTML = r.farm_steps.map(function (s) {
      return '<li>' + esc(s) + '</li>';
    }).join('');
  }

  function init() {
    var top = rows[0];
    $('meta').innerHTML = 'Snapshot <b>' + esc(board.as_of || '') + '</b> · floor <b>'
      + fmtUsd(board.floor_usd || 0) + '</b> · source: DefiLlama';
    var wl = rows.filter(function (r) { return r.watchlist; }).length;
    var wlTotal = board.watchlist_total || wl;
    $('stats').innerHTML = [
      ['Protocols ranked', rows.length, 'pre-token candidates'],
      ['Watchlist covered', wl + ' / ' + wlTotal, 'every watchlist protocol is ranked'],
      ['Top implied value', top ? fmtUsd(top.implied_value_usd) : '—', top ? top.name : ''],
      ['Snapshot', esc(board.as_of || ''), 'DefiLlama protocol data'],
    ].map(function (s, i) {
      return '<div class="stat"><div class="k">' + s[0] + '</div><div class="v' + (i === 1 ? ' green' : '') + '">' + s[1] + '</div><div class="s">' + esc(s[2]) + '</div></div>';
    }).join('');

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
    $('mintvl').addEventListener('change', function (e) { state.minTvl = Number(e.target.value); render(); });
    $('wl').addEventListener('change', function (e) { state.wl = e.target.checked; render(); });
    $('reset').addEventListener('click', function () {
      state = { q: '', cat: '', chain: '', minTvl: 0, wl: false, sort: 'rank', dir: 1 };
      $('q').value = ''; $('cat').value = ''; $('chain').value = '';
      $('mintvl').value = '0'; $('wl').checked = false;
      render();
    });
    document.querySelectorAll('#board thead th').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
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

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
