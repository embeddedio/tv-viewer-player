export function buildTableauChangeHtml(initStyle: Record<string, number> = {}): string {
  const _s = initStyle;
  const _sc = (_s.fontScale > 0) ? _s.fontScale : 1;
  const _initCss = [
    (_s.logoWidthPct    > 0) ? `:root{--logo-width:${_s.logoWidthPct}%}` : '',
    (_s.headerHeightVh  > 0) ? `.exchange-header{flex:0 0 ${_s.headerHeightVh}vh!important}` : '',
    (_s.colHeaderFontPx > 0) ? `.exchange-cell{font-size:${(_s.colHeaderFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.titleFontPx     > 0) ? `.exchange-title{font-size:${(_s.titleFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.rowValFontPx    > 0) ? `.exchange-value{font-size:${(_s.rowValFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.rowNameFontPx   > 0) ? `.exchange-name{font-size:${(_s.rowNameFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.rowUnitFontPx   > 0) ? `.exchange-value-unit{font-size:${(_s.rowUnitFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.vdTitleFontPx   > 0) ? `.vd-title{font-size:${(_s.vdTitleFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.vdHeaderFontPx  > 0) ? `.vd-table th{font-size:${(_s.vdHeaderFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.vdUnitFontPx    > 0) ? `.vd-td-unit{font-size:${(_s.vdUnitFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.vdNameFontPx    > 0) ? `.vd-td-name{font-size:${(_s.vdNameFontPx * _sc).toFixed(1)}px!important}` : '',
    (_s.vdValFontPx     > 0) ? `.vd-td-num{font-size:${(_s.vdValFontPx * _sc).toFixed(1)}px!important}` : '',
  ].filter(Boolean).join('');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
:root {
  color-scheme: light;
  --page-bg: #edf1f7;
  --panel-bg: #ffffff;
  --header-bg: #152238;
  --header-overlay: rgba(9,16,31,0.52);
  --row-even: #ffffff;
  --row-odd: #f4f6fb;
  --border: #dde4f0;
  --title: #ffffff;
  --text: #112033;
  --muted: #5e6f84;
  --buy: #c0392b;
  --sell: #095fcf;
  --ref: #0e7c3a;
  --tpe: #b45309;
  --logo-width: 21%;
  --col-change: rgba(219,234,254,0.28);
  --col-bkam: rgba(209,250,229,0.3);
  --header-bg-url: none;
  --grid-cols: 10vw 8vw minmax(0,1fr) 14vw 14vw;
}
body[data-variant="bkam"]     { --grid-cols: 10vw minmax(0,1fr) 20vw 20vw; }
body[data-variant="combined"] { --grid-cols: 6vw minmax(0,1fr) 14.5vw 14.5vw 14.5vw 14.5vw; }

*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;background:var(--page-bg);font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;overflow:hidden}
.hidden{display:none!important}
.exchange-widget{width:100vw;height:100vh;display:flex;flex-direction:column;background:var(--panel-bg);color:var(--text)}

/* ---- Header ---- */
.exchange-header{flex:0 0 18vh;display:grid;grid-template-columns:minmax(0,var(--logo-width)) 1fr;min-height:0;overflow:hidden}
.exchange-logo-panel{display:flex;align-items:center;justify-content:center;padding:0;background:#fff;overflow:hidden;min-height:0}
.exchange-logo-shell{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:0;background:linear-gradient(180deg,#fff 0%,#f6f8fd 100%)}
.exchange-logo{display:block;width:100%;height:100%;object-fit:fill}
.exchange-logo-fallback{width:8vh;height:8vh;border-radius:1.5vh;display:grid;place-items:center;background:linear-gradient(135deg,#16345d 0%,#25497f 100%);color:#fff;font-size:4vh;font-weight:700}
.exchange-title-panel{position:relative;overflow:hidden;background:#0f1c31}
.exchange-title-panel::before{content:"";position:absolute;inset:0;background:center/cover no-repeat var(--header-bg-url);filter:brightness(0.72)}
.exchange-title-backdrop{position:absolute;inset:0;background:var(--header-overlay)}
.exchange-title-content{position:relative;z-index:1;height:100%;padding:0.5vh 2vw;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--title)}
.exchange-title{margin:0;font-size:clamp(2rem,6vh,8vw);line-height:1.1;font-weight:800;text-transform:uppercase}
.exchange-date{margin:0.5vh 0 0;font-size:clamp(1rem,3.5vh,4.5vw);font-weight:700;letter-spacing:0.08em;color:rgba(255,255,255,0.92)}

/* ---- Table shell ---- */
.exchange-table-shell{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--panel-bg)}
.exchange-table-body{flex:1;min-height:0;display:flex;flex-direction:column}

/* Grid commun à tous les headers et lignes */
.exchange-table-header,
.exchange-table-header-top,
.exchange-table-header-sub,
.exchange-row {
  display:grid;
  grid-template-columns:var(--grid-cols);
  align-items:center;
  gap:1vw;
  padding:0 1.5vw;
}

/* Combined : pas de gap ni padding (colonnes colorées bord à bord) */
body[data-variant="combined"] .exchange-table-header-top,
body[data-variant="combined"] .exchange-table-header-sub,
body[data-variant="combined"] .exchange-row { gap:0; padding:0 }

/* ---- Header simple/bkam (1 ligne) ---- */
.exchange-table-header{flex:0 0 auto;height:5.5vh;background:var(--header-bg);border-bottom:1px solid rgba(255,255,255,0.08);color:#fff}
.exchange-cell{font-size:var(--hdr-cell-fs,clamp(0.6rem,1.8vh,2.5vw));font-weight:800;letter-spacing:0.08em;text-transform:uppercase}
.exchange-cell-unit{text-align:center;padding-left:0.6vw}
.exchange-cell-buy,.exchange-cell-sell{text-align:right}
.exchange-cell-ref,.exchange-cell-tpe{text-align:center}

/* ---- Header combined top (groupes) ---- */
.exchange-table-header-top{height:5.5vh;background:var(--header-bg);border-bottom:1px solid rgba(255,255,255,0.06);color:#fff}
.exchange-table-header-top .exchange-cell{font-size:clamp(0.7rem,2.2vh,3.2vw);font-weight:900;letter-spacing:0.1em;text-transform:uppercase;text-align:center;height:100%;display:flex;align-items:center;justify-content:center}
.exchange-table-header-top .exchange-cell-name{justify-content:flex-start;padding-left:1.5vw}
.exchange-cell-group-change{grid-column:span 2;background:rgba(147,197,253,0.15)}
.exchange-cell-group-bkam{grid-column:span 2;background:rgba(110,231,183,0.15)}

/* ---- Header combined sub (colonnes) ---- */
.exchange-table-header-sub{height:3.5vh;background:#1a2d4a;border-bottom:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.85)}
.exchange-table-header-sub .exchange-cell{font-size:clamp(0.6rem,1.8vh,2.4vw);font-weight:800;letter-spacing:0.06em;text-transform:uppercase;text-align:center;height:100%;display:flex;align-items:center;justify-content:center}
.exchange-table-header-sub .exchange-cell-name{justify-content:flex-start;padding-left:1.5vw}
.exchange-table-header-sub .exchange-cell-buy,
.exchange-table-header-sub .exchange-cell-sell{background:rgba(147,197,253,0.1)}
.exchange-table-header-sub .exchange-cell-ref,
.exchange-table-header-sub .exchange-cell-tpe{background:rgba(110,231,183,0.1)}

/* ---- Séparateur 3D combined ---- */
body[data-variant="combined"] .exchange-cell-group-change,
body[data-variant="combined"] .exchange-cell-sell,
body[data-variant="combined"] .exchange-value-sell{position:relative;border-right:2px solid rgba(0,0,0,0.25)!important}
body[data-variant="combined"] .exchange-cell-group-change::after,
body[data-variant="combined"] .exchange-cell-sell::after,
body[data-variant="combined"] .exchange-value-sell::after{content:"";position:absolute;right:-4px;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.4);z-index:5}
body[data-variant="combined"] .exchange-cell-group-bkam,
body[data-variant="combined"] .exchange-cell-ref,
body[data-variant="combined"] .exchange-value-ref{box-shadow:inset 10px 0 8px -10px rgba(0,0,0,0.3)}
body[data-variant="combined"] .exchange-cell-unit,
body[data-variant="combined"] .exchange-value-unit{padding-left:1.8vw}
body[data-variant="combined"] .exchange-table-header-top .exchange-cell-group-change::after{background:rgba(255,255,255,0.15)}

/* ---- Lignes de données ---- */
.exchange-row{flex:1 1 0;min-height:0;border-bottom:1px solid var(--border)}
.exchange-row:nth-child(odd){background:var(--row-even)}
.exchange-row:nth-child(even){background:var(--row-odd)}

/* Colonnes colorées (combined uniquement) */
body[data-variant="combined"] .exchange-value-buy,
body[data-variant="combined"] .exchange-value-sell{background:var(--col-change);height:100%;display:flex;align-items:center;justify-content:center;padding:0 0.8vw}
body[data-variant="combined"] .exchange-value-ref,
body[data-variant="combined"] .exchange-value-tpe{background:var(--col-bkam);height:100%;display:flex;align-items:center;justify-content:center;padding:0 0.8vw}

/* ---- Drapeaux ---- */
.exchange-flag-wrap{display:flex;justify-content:center;align-items:center;flex-shrink:0}
.exchange-flag{width:clamp(1.2rem,4.5vh,6vw);height:auto;border-radius:0.12rem;box-shadow:0 2px 6px rgba(15,23,42,0.12)}
.exchange-flag-fallback{width:clamp(1.2rem,4.5vh,6vw);height:clamp(1.2rem,4.5vh,6vw);border-radius:999px;display:grid;place-items:center;background:#d7dfeb;color:#24354b;font-size:clamp(0.6rem,2.2vh,3vw);font-weight:800}

/* ---- Cellules nom ---- */
.exchange-name-cell{display:flex;align-items:center;gap:1vw;min-width:0;padding-left:1.5vw}
.exchange-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--row-name-fs,clamp(0.7rem,2.4vh,3vw));font-weight:800;color:var(--text)}

/* ---- Valeurs ---- */
.exchange-value{text-align:right;font-size:var(--row-val-fs,clamp(0.9rem,3.4vh,4vw));font-variant-numeric:tabular-nums}
.exchange-value-unit{text-align:center;padding-left:0.6vw;color:var(--muted);font-weight:700;font-size:var(--row-unit-fs,clamp(0.6rem,2vh,2.8vw))}
.exchange-value-buy{color:var(--buy);font-weight:600}
.exchange-value-sell{color:var(--sell);font-weight:800}
.exchange-value-ref{color:var(--ref);font-weight:700;text-align:center}
.exchange-value-tpe{color:var(--tpe);font-weight:700;text-align:center}
.exchange-empty{margin:auto;padding:2vh;text-align:center;font-size:clamp(0.8rem,2vh,3vw);color:var(--muted)}

/* ===== THEME: vertical-dark ===== */
#vd-root{display:none;position:fixed;inset:0;z-index:10}
[data-theme="vertical-dark"] #vd-root{display:block}
[data-theme="vertical-dark"] .exchange-widget{display:none!important}
.vd-screen{display:grid;grid-template-columns:17vw 1fr;width:100vw;height:100vh;overflow:hidden;background:#0e0a05;color:#f8fafc;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif}
.vd-side{display:grid;grid-template-rows:auto 1fr auto;padding:2vw 1.4vw;background:linear-gradient(180deg,#e7bb73,#815e27);color:#fff;gap:2vh;overflow:hidden;min-height:0}
.vd-logo-wrap{width:100%;aspect-ratio:10/11;display:grid;place-items:center;background:rgba(255,255,255,.14);border-radius:0.5vw;overflow:hidden;flex-shrink:0}
.vd-logo-img{width:100%;height:100%;object-fit:contain}
.vd-logo-fallback{display:grid;place-items:center;width:100%;height:100%;font-size:clamp(22px,2.8vw,44px);font-weight:900;color:rgba(255,255,255,0.85)}
.vd-title{writing-mode:vertical-rl;transform:rotate(180deg);justify-self:center;align-self:center;text-align:center;margin:0;color:#fff;font-size:var(--vd-title-fs,clamp(20px,3vw,52px));font-weight:800;text-transform:uppercase;letter-spacing:.1em;min-height:0;overflow:hidden;overflow-wrap:break-word;word-break:break-word}
.vd-meta{display:flex;flex-direction:column;gap:0.4vh;align-items:center;text-align:center}
.vd-date{font-size:clamp(11px,1.1vw,17px);font-weight:700;color:rgba(255,255,255,.8);font-variant-numeric:tabular-nums}
.vd-clock{font-size:clamp(13px,1.3vw,20px);font-weight:900;color:rgba(255,255,255,.55);font-variant-numeric:tabular-nums}
.vd-main{display:grid;grid-template-rows:8vh 1fr;min-height:0;overflow:hidden;height:100%}
.vd-top{display:flex;align-items:center;justify-content:space-between;padding:0 1.2vw;background:#171109;border-bottom:1px solid rgba(255,255,255,0.12);height:100%}
.vd-top strong{font-size:clamp(11px,1.6vw,23px);text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#98a2b3}
.vd-top span{font-size:clamp(10px,1.4vw,20px);text-transform:uppercase;letter-spacing:.12em;font-weight:700;color:#98a2b3}
.vd-table{width:100%;height:100%;table-layout:fixed;border-collapse:collapse;background:#171109}
.vd-table thead th{color:#fff;background:#e7bb73;text-transform:uppercase;letter-spacing:.12em;font-size:var(--vd-hdr-fs,clamp(10px,1.5vw,22px));font-weight:800;padding:0 .7vw;height:8vh;vertical-align:middle}
.vd-table thead th.vd-th-val{background:#b88738}
.vd-table thead th.vd-th-card{background:#7a5a1f}
.vd-table tbody tr{height:1px}
.vd-table tbody tr:nth-child(even){background:rgba(43,29,13,0.36)}
.vd-table td{padding:0 .7vw;border-bottom:1px solid rgba(255,255,255,0.12);font-weight:900;vertical-align:middle;height:inherit;overflow:hidden}
.vd-td-unit{color:#98a2b3;text-align:center;font-size:var(--vd-unit-fs,clamp(10px,1.3vw,18px))}
.vd-td-currency{overflow:hidden}
.vd-currency-inner{display:flex;align-items:center;gap:0.6vw;height:100%;overflow:hidden}
.vd-currency-inner .exchange-flag-wrap{flex-shrink:0}
.vd-td-name{text-transform:uppercase;font-size:var(--vd-name-fs,clamp(12px,1.7vw,26px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f8fafc}
.vd-td-num{text-align:center;font-size:var(--vd-val-fs,clamp(14px,2vw,30px));font-variant-numeric:tabular-nums}
.vd-td-buy{color:#d92d20}
.vd-td-sell{color:#175cd3}
.vd-td-ref{color:#067647}
.vd-td-tpe{color:#b54708}
</style>
<style id="init-style">${_initCss}</style>
</head>
<body>
<div id="dbg" style="position:fixed;top:0;left:0;right:0;background:#e11d48;color:#fff;font-size:18px;font-family:monospace;padding:6px 12px;z-index:99999;pointer-events:none">DBG: en attente...</div>
<div id="vd-root"></div>
<main class="exchange-widget">
  <header class="exchange-header">
    <section class="exchange-logo-panel">
      <div class="exchange-logo-shell">
        <img id="widget-logo" alt="Logo" class="exchange-logo hidden" />
        <div id="widget-logo-fallback" class="exchange-logo-fallback">M</div>
      </div>
    </section>
    <section class="exchange-title-panel">
      <div class="exchange-title-backdrop"></div>
      <div class="exchange-title-content">
        <h1 id="widget-title" class="exchange-title">Cours des Billets</h1>
        <p id="widget-date" class="exchange-date">--/--/----</p>
      </div>
    </section>
  </header>
  <section class="exchange-table-shell">
    <div id="exchange-table-headers"></div>
    <div id="exchange-table-body" class="exchange-table-body">
      <div class="exchange-empty">Chargement des taux...</div>
    </div>
  </section>
</main>
<script>
(function () {
  var state = { variant: 'simple', theme: 'default', flags: {}, logoUrl: null, headerBgUrl: '', style: {}, assetsBase: '', clockInterval: null, styleUrl: '', itemFontScale: 0, itemLogoSize: 0, itemHdrWeight: 0, lastRowCount: 0, stylePollTimer: null, lastRates: [] };

  var TITLES = {
    'simple':   'Cours des Billets de Banques Etrangers',
    'bkam':     'Référence BKAM',
    'combined': 'Cours des Billets de Banques Etrangers'
  };

  var tableBody    = document.getElementById('exchange-table-body');
  var tableHeaders = document.getElementById('exchange-table-headers');
  var logoImg      = document.getElementById('widget-logo');
  var logoFallback = document.getElementById('widget-logo-fallback');
  var dateNode     = document.getElementById('widget-date');
  var titleNode    = document.getElementById('widget-title');

  function escapeHtml(v) {
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function toFixed3(v) {
    var s = String(v || '-').trim();
    if (s === '-') return s;
    var n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? n.toFixed(3).replace('.', ',') : s;
  }

  function formatDate(d) {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  }

  function formatLabel(label, variant) {
    var sep = label.indexOf(' : ');
    if (sep === -1) return label;
    return variant === 'combined' ? label.slice(0, sep) : label.slice(sep + 3);
  }

  function onFlagError(el) {
    el.style.display = 'none';
    var fb = el.nextElementSibling;
    if (fb) fb.style.display = 'grid';
  }

  function flagContent(code) {
    var c = String(code || '').split('-')[0].toUpperCase();
    var src = state.flags[c] || (state.assetsBase ? state.assetsBase + c + '.jpg' : '');
    var initial = c.charAt(0) || '?';
    if (!src) return '<div class="exchange-flag-fallback">' + escapeHtml(initial) + '</div>';
    return (
      '<img class="exchange-flag" src="' + escapeHtml(src) + '" alt="' + escapeHtml(c) + '" onerror="onFlagError(this)" />' +
      '<div class="exchange-flag-fallback" style="display:none">' + escapeHtml(initial) + '</div>'
    );
  }

  function normalizeRow(item, variant) {
    if (!item || !item.code) return null;
    var code = String(item.code).trim().toUpperCase();
    if (!code) return null;
    return {
      code: code,
      label: formatLabel(String(item.label || code).trim(), variant),
      unit:  String(item.unit || '1').trim(),
      buy:   String(item.buy  || '-').trim() || '-',
      sell:  String(item.sell || '-').trim() || '-',
      bkamReference: String(item.bkamReference || '-').trim() || '-',
      bkamTpe:       String(item.bkamTpe       || '-').trim() || '-'
    };
  }

  function renderLogo(logoUrl) {
    if (logoUrl) {
      logoImg.src = logoUrl;
      logoImg.classList.remove('hidden');
      logoFallback.classList.add('hidden');
    } else {
      logoImg.classList.add('hidden');
      logoFallback.classList.remove('hidden');
    }
  }

  function renderDate() {
    dateNode.textContent = formatDate(new Date());
  }

  function renderHeader(variant) {
    if (variant === 'combined') {
      tableHeaders.innerHTML =
        '<div class="exchange-table-header exchange-table-header-top">' +
          '<div class="exchange-cell exchange-cell-unit"></div>' +
          '<div class="exchange-cell exchange-cell-name">Devises</div>' +
          '<div class="exchange-cell exchange-cell-group exchange-cell-group-change">Taux de Change</div>' +
          '<div class="exchange-cell exchange-cell-group exchange-cell-group-bkam">Achat par Carte - TPE</div>' +
        '</div>' +
        '<div class="exchange-table-header exchange-table-header-sub">' +
          '<div class="exchange-cell exchange-cell-unit">Unite</div>' +
          '<div class="exchange-cell exchange-cell-name"></div>' +
          '<div class="exchange-cell exchange-cell-buy">Achat</div>' +
          '<div class="exchange-cell exchange-cell-sell">Vente</div>' +
          '<div class="exchange-cell exchange-cell-ref">Réf BKAM</div>' +
          '<div class="exchange-cell exchange-cell-tpe">TPE (-5%)</div>' +
        '</div>';
    } else if (variant === 'bkam') {
      tableHeaders.innerHTML =
        '<div class="exchange-table-header">' +
          '<div class="exchange-cell exchange-cell-unit">Unite</div>' +
          '<div class="exchange-cell exchange-cell-name">Devises</div>' +
          '<div class="exchange-cell exchange-cell-ref">BKAM Référence</div>' +
          '<div class="exchange-cell exchange-cell-tpe">TPE (-5%)</div>' +
        '</div>';
    } else {
      tableHeaders.innerHTML =
        '<div class="exchange-table-header">' +
          '<div class="exchange-cell exchange-cell-unit">Unite</div>' +
          '<div class="exchange-cell exchange-cell-flag"></div>' +
          '<div class="exchange-cell exchange-cell-name">Devises</div>' +
          '<div class="exchange-cell exchange-cell-buy">Achat</div>' +
          '<div class="exchange-cell exchange-cell-sell">Vente</div>' +
        '</div>';
    }
  }

  function renderRows(rows, variant) {
    state.lastRowCount = rows ? rows.length : 0;
    state.lastRates = rows || [];
    if (!rows || !rows.length) {
      tableBody.innerHTML = '<div class="exchange-empty">Aucune devise disponible.</div>';
      return;
    }
    var s = state.style || {};
    var scale = (s.fontScale > 0) ? s.fontScale : 1;
    var stVal  = (s.rowValFontPx  > 0) ? ' style="font-size:' + (s.rowValFontPx  * scale) + 'px"' : '';
    var stName = (s.rowNameFontPx > 0) ? ' style="font-size:' + (s.rowNameFontPx * scale) + 'px"' : '';
    var stUnit = (s.rowUnitFontPx > 0) ? ' style="font-size:' + (s.rowUnitFontPx * scale) + 'px"' : '';
    var stHdr  = (s.colHeaderFontPx > 0) ? ' style="font-size:' + (s.colHeaderFontPx * scale) + 'px"' : '';
    tableBody.innerHTML = rows.map(function (row) {
      if (variant === 'combined') {
        return (
          '<article class="exchange-row">' +
            '<div class="exchange-value exchange-value-unit"' + stUnit + '>' + escapeHtml(row.unit) + '</div>' +
            '<div class="exchange-name-cell">' +
              '<div class="exchange-flag-wrap">' + flagContent(row.code) + '</div>' +
              '<div class="exchange-name"' + stName + ' title="' + escapeHtml(row.label) + '">' + escapeHtml(row.label) + '</div>' +
            '</div>' +
            '<div class="exchange-value exchange-value-buy"'  + stVal + '>'  + escapeHtml(row.buy)  + '</div>' +
            '<div class="exchange-value exchange-value-sell"' + stVal + '>' + escapeHtml(row.sell) + '</div>' +
            '<div class="exchange-value exchange-value-ref"'  + stVal + '>'  + escapeHtml(toFixed3(row.bkamReference)) + '</div>' +
            '<div class="exchange-value exchange-value-tpe"'  + stVal + '>'  + escapeHtml(toFixed3(row.bkamTpe))       + '</div>' +
          '</article>'
        );
      } else if (variant === 'bkam') {
        return (
          '<article class="exchange-row">' +
            '<div class="exchange-value exchange-value-unit"' + stUnit + '>' + escapeHtml(row.unit) + '</div>' +
            '<div class="exchange-name-cell">' +
              '<div class="exchange-flag-wrap">' + flagContent(row.code) + '</div>' +
              '<div class="exchange-name"' + stName + ' title="' + escapeHtml(row.label) + '">' + escapeHtml(row.label) + '</div>' +
            '</div>' +
            '<div class="exchange-value exchange-value-ref"' + stVal + '>' + escapeHtml(toFixed3(row.bkamReference)) + '</div>' +
            '<div class="exchange-value exchange-value-tpe"' + stVal + '>' + escapeHtml(toFixed3(row.bkamTpe))       + '</div>' +
          '</article>'
        );
      } else {
        return (
          '<article class="exchange-row">' +
            '<div class="exchange-value exchange-value-unit"' + stUnit + '>' + escapeHtml(row.unit) + '</div>' +
            '<div class="exchange-flag-wrap">' + flagContent(row.code) + '</div>' +
            '<div class="exchange-name"' + stName + ' title="' + escapeHtml(row.label) + '">' + escapeHtml(row.label) + '</div>' +
            '<div class="exchange-value exchange-value-buy"'  + stVal + '>'  + escapeHtml(row.buy)  + '</div>' +
            '<div class="exchange-value exchange-value-sell"' + stVal + '>' + escapeHtml(row.sell) + '</div>' +
          '</article>'
        );
      }
    }).join('');
  }

  // ── Theme Vertical Dark ───────────────────────────────────────────────────────

  function buildVdRows(rows) {
    var s = state.style || {};
    var scale = (s.fontScale > 0) ? s.fontScale : 1;
    var stVdVal  = (s.vdValFontPx  > 0) ? ' style="font-size:' + (s.vdValFontPx  * scale) + 'px"' : '';
    var stVdName = (s.vdNameFontPx > 0) ? ' style="font-size:' + (s.vdNameFontPx * scale) + 'px"' : '';
    var stVdUnit = (s.vdUnitFontPx > 0) ? ' style="font-size:' + (s.vdUnitFontPx * scale) + 'px"' : '';
    return (rows || []).map(function (row) {
      var cells =
        '<td class="vd-td-unit"'  + stVdUnit + '>'  + escapeHtml(row.unit)  + '</td>' +
        '<td class="vd-td-currency"><div class="vd-currency-inner"><div class="exchange-flag-wrap">' + flagContent(row.code) + '</div><span class="vd-td-name"' + stVdName + '>' + escapeHtml(row.label) + '</span></div></td>';
      if (state.variant === 'combined') {
        cells +=
          '<td class="vd-td-num vd-td-buy"'  + stVdVal + '>'  + escapeHtml(row.buy)  + '</td>' +
          '<td class="vd-td-num vd-td-sell"' + stVdVal + '>' + escapeHtml(row.sell) + '</td>' +
          '<td class="vd-td-num vd-td-ref"'  + stVdVal + '>'  + escapeHtml(toFixed3(row.bkamReference)) + '</td>' +
          '<td class="vd-td-num vd-td-tpe"'  + stVdVal + '>'  + escapeHtml(toFixed3(row.bkamTpe))       + '</td>';
      } else if (state.variant === 'bkam') {
        cells +=
          '<td class="vd-td-num vd-td-ref"' + stVdVal + '>' + escapeHtml(toFixed3(row.bkamReference)) + '</td>' +
          '<td class="vd-td-num vd-td-tpe"' + stVdVal + '>' + escapeHtml(toFixed3(row.bkamTpe))       + '</td>';
      } else {
        cells +=
          '<td class="vd-td-num vd-td-buy"'  + stVdVal + '>'  + escapeHtml(row.buy)  + '</td>' +
          '<td class="vd-td-num vd-td-sell"' + stVdVal + '>' + escapeHtml(row.sell) + '</td>';
      }
      return '<tr>' + cells + '</tr>';
    }).join('');
  }

  function buildVdCols() {
    var s = state.style || {};
    var u = s.vdColUnitePct  > 0 ? s.vdColUnitePct  : 0;
    var d = s.vdColDevisePct > 0 ? s.vdColDevisePct : 0;
    var v = s.vdColValPct    > 0 ? s.vdColValPct    : 0;
    var c = s.vdColCardPct   > 0 ? s.vdColCardPct   : 0;
    if (state.variant === 'combined') {
      var uw = u || 7, vw = v || 15, cw = c || 15;
      var dw = d || Math.max(1, 100 - uw - vw * 2 - cw * 2);
      return [uw, dw, vw, vw, cw, cw];
    } else if (state.variant === 'bkam') {
      var uw = u || 8, cw = c || v || 23;
      var dw = d || Math.max(1, 100 - uw - cw * 2);
      return [uw, dw, cw, cw];
    } else {
      var uw = u || 8, vw = v || 19;
      var dw = d || Math.max(1, 100 - uw - vw * 2);
      return [uw, dw, vw, vw];
    }
  }

  function renderVerticalDark(rows) {
    state.lastRowCount = rows ? rows.length : 0;
    state.lastRates = rows || [];
    var vdRoot = document.getElementById('vd-root');
    if (!vdRoot) return;

    var cols = buildVdCols();
    var colgroup = '<colgroup>' + cols.map(function(w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup>';
    var colW = function(i) { return 'style="width:' + cols[i] + '%"'; };
    var thead;
    if (state.variant === 'combined') {
      thead = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
        '<th class="vd-th-val vd-td-num" ' + colW(2) + '>Achat</th><th class="vd-th-val vd-td-num" ' + colW(3) + '>Vente</th>' +
        '<th class="vd-th-card vd-td-num" ' + colW(4) + '>Réf BKAM</th><th class="vd-th-card vd-td-num" ' + colW(5) + '>TPE -5%</th></tr>';
    } else if (state.variant === 'bkam') {
      thead = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
        '<th class="vd-th-card vd-td-num" ' + colW(2) + '>Réf BKAM</th><th class="vd-th-card vd-td-num" ' + colW(3) + '>TPE -5%</th></tr>';
    } else {
      thead = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
        '<th class="vd-th-val vd-td-num" ' + colW(2) + '>Achat</th><th class="vd-th-val vd-td-num" ' + colW(3) + '>Vente</th></tr>';
    }

    var logoHtml = state.logoUrl
      ? '<div class="vd-logo-wrap"><img class="vd-logo-img" src="' + escapeHtml(state.logoUrl) + '" alt="Logo" /></div>'
      : '<div class="vd-logo-wrap"><div class="vd-logo-fallback">M</div></div>';

    vdRoot.innerHTML =
      '<div class="vd-screen">' +
        '<aside class="vd-side">' +
          logoHtml +
          '<h1 class="vd-title">Cours des Billets</h1>' +
          '<div class="vd-meta">' +
            '<span class="vd-date">' + escapeHtml(formatDate(new Date())) + '</span>' +
            '<span class="vd-clock" id="vd-clock">--:--:--</span>' +
          '</div>' +
        '</aside>' +
        '<main class="vd-main">' +
          '<header class="vd-top">' +
            '<strong>Change de billets et achat par carte TPE</strong>' +
            '<span>Bureau de Change</span>' +
          '</header>' +
          '<table class="vd-table">' +
            colgroup +
            '<thead>' + thead + '</thead>' +
            '<tbody>' + buildVdRows(rows) + '</tbody>' +
          '</table>' +
        '</main>' +
      '</div>';

    if (state.clockInterval) clearInterval(state.clockInterval);
    var tick = function () {
      var el = document.getElementById('vd-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    };
    tick();
    state.clockInterval = setInterval(tick, 1000);
  }

  // ── Style personnalisable ─────────────────────────────────────────────────────

  function buildGridCols(style) {
    var unit = (style.colUnitePct > 0) ? style.colUnitePct + 'vw' : null;
    var val  = (style.colValPct   > 0) ? style.colValPct   + 'vw' : null;
    var cols;
    if (state.variant === 'bkam') {
      cols = (unit || '10vw') + ' minmax(0,1fr) ' + (val || '20vw') + ' ' + (val || '20vw');
    } else if (state.variant === 'combined') {
      var u = unit ? (parseFloat(unit) * 0.6 + 'vw') : '6vw';
      var v = val  || '14.5vw';
      cols = u + ' minmax(0,1fr) ' + v + ' ' + v + ' ' + v + ' ' + v;
    } else {
      var flagW = unit ? (parseFloat(unit) * 0.8 + 'vw') : '8vw';
      cols = (unit || '10vw') + ' ' + flagW + ' minmax(0,1fr) ' + (val || '14vw') + ' ' + (val || '14vw');
    }
    document.documentElement.style.setProperty('--grid-cols', cols);
  }

  function applyStyle(style) {
    if (!style) return;
    state.style = style;
    var root = document.documentElement;
    var pos  = function(v, def) { return (v && v > 0) ? v : def; };
    var scale = (style.fontScale > 0) ? style.fontScale : 1;

    root.style.setProperty('--logo-width', pos(style.logoWidthPct, 21) + '%');

    var hdrVh = pos(style.headerHeightVh, 18);
    var hdrEl = document.querySelector('.exchange-header');
    if (hdrEl) hdrEl.style.flex = '0 0 ' + hdrVh + 'vh';

    if (style.titleFontPx > 0 && titleNode)
      titleNode.style.fontSize = (style.titleFontPx * scale) + 'px';

    buildGridCols(style);

    // CSS vars (compatibilité)
    if (style.colHeaderFontPx > 0) root.style.setProperty('--hdr-cell-fs', (style.colHeaderFontPx * scale) + 'px');
    if (style.rowValFontPx   > 0) root.style.setProperty('--row-val-fs',  (style.rowValFontPx   * scale) + 'px');
    if (style.rowNameFontPx  > 0) root.style.setProperty('--row-name-fs', (style.rowNameFontPx  * scale) + 'px');
    if (style.rowUnitFontPx  > 0) root.style.setProperty('--row-unit-fs', (style.rowUnitFontPx  * scale) + 'px');
    if (style.vdTitleFontPx  > 0) root.style.setProperty('--vd-title-fs', (style.vdTitleFontPx  * scale) + 'px');
    if (style.vdHeaderFontPx > 0) root.style.setProperty('--vd-hdr-fs',   (style.vdHeaderFontPx * scale) + 'px');
    if (style.vdUnitFontPx   > 0) root.style.setProperty('--vd-unit-fs',  (style.vdUnitFontPx   * scale) + 'px');
    if (style.vdNameFontPx   > 0) root.style.setProperty('--vd-name-fs',  (style.vdNameFontPx   * scale) + 'px');
    if (style.vdValFontPx    > 0) root.style.setProperty('--vd-val-fs',   (style.vdValFontPx    * scale) + 'px');

    // Règles CSS concrètes avec !important — fiable sur tous WebViews Android
    var css = '';
    if (style.colHeaderFontPx > 0) css += '.exchange-cell{font-size:' + (style.colHeaderFontPx * scale) + 'px!important}';
    if (style.rowValFontPx   > 0) css += '.exchange-value{font-size:' + (style.rowValFontPx   * scale) + 'px!important}';
    if (style.rowNameFontPx  > 0) css += '.exchange-name{font-size:'  + (style.rowNameFontPx  * scale) + 'px!important}';
    if (style.rowUnitFontPx  > 0) css += '.exchange-value-unit{font-size:' + (style.rowUnitFontPx * scale) + 'px!important}';
    if (style.vdTitleFontPx  > 0) css += '.vd-title{font-size:'   + (style.vdTitleFontPx  * scale) + 'px!important}';
    if (style.vdHeaderFontPx > 0) css += '.vd-table th{font-size:' + (style.vdHeaderFontPx * scale) + 'px!important}';
    if (style.vdUnitFontPx   > 0) css += '.vd-td-unit{font-size:' + (style.vdUnitFontPx   * scale) + 'px!important}';
    if (style.vdNameFontPx   > 0) css += '.vd-td-name{font-size:' + (style.vdNameFontPx   * scale) + 'px!important}';
    if (style.vdValFontPx    > 0) css += '.vd-td-num{font-size:'  + (style.vdValFontPx    * scale) + 'px!important}';
    var dynEl = document.getElementById('dyn-style');
    if (!dynEl) { dynEl = document.createElement('style'); dynEl.id = 'dyn-style'; document.head.appendChild(dynEl); }
    dynEl.textContent = css;

    var dbgEl = document.getElementById('dbg');
    if (dbgEl) dbgEl.textContent = 'applyStyle rv:' + (style.rowValFontPx||0) + ' rn:' + (style.rowNameFontPx||0) + ' vn:' + (style.vdNameFontPx||0) + ' sc:' + scale.toFixed(2) + ' css:' + (css||'vide');

    if (state.theme === 'vertical-dark') {
      var vdThead = document.querySelector('#vd-root .vd-table thead');
      var vdColgroup = document.querySelector('#vd-root .vd-table colgroup');
      if (vdThead && vdColgroup) {
        var cols = buildVdCols();
        var colW = function(i) { return 'style="width:' + cols[i] + '%"'; };
        vdColgroup.outerHTML = '<colgroup>' + cols.map(function(w) { return '<col style="width:' + w + '%">'; }).join('') + '</colgroup>';
        var theadRow;
        if (state.variant === 'combined') {
          theadRow = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
            '<th class="vd-th-val vd-td-num" ' + colW(2) + '>Achat</th><th class="vd-th-val vd-td-num" ' + colW(3) + '>Vente</th>' +
            '<th class="vd-th-card vd-td-num" ' + colW(4) + '>Réf BKAM</th><th class="vd-th-card vd-td-num" ' + colW(5) + '>TPE -5%</th></tr>';
        } else if (state.variant === 'bkam') {
          theadRow = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
            '<th class="vd-th-card vd-td-num" ' + colW(2) + '>Réf BKAM</th><th class="vd-th-card vd-td-num" ' + colW(3) + '>TPE -5%</th></tr>';
        } else {
          theadRow = '<tr><th ' + colW(0) + '>Unité</th><th ' + colW(1) + '>Devise</th>' +
            '<th class="vd-th-val vd-td-num" ' + colW(2) + '>Achat</th><th class="vd-th-val vd-td-num" ' + colW(3) + '>Vente</th></tr>';
        }
        vdThead.innerHTML = theadRow;
      }
    }
  }

  function applyAutoFont(rowCount) {
    if (!rowCount) return;
    var s     = state.style || {};
    var hdrVh = (s.headerHeightVh > 0) ? s.headerHeightVh : 18;
    var tblVh = (state.variant === 'combined') ? 9 : 5.5;
    var avail = 100 - hdrVh - tblVh;
    var rowVh = avail / rowCount;
    var root  = document.documentElement;
    var scale = (Number(s.fontScale) > 0) ? Number(s.fontScale) : 1;
    var autoCss = '';
    if (!(s.rowValFontPx  > 0)) { var v = 'clamp(' + (0.7*scale).toFixed(2)  + 'rem,' + (Math.min(rowVh*0.40,3.4)*scale).toFixed(2) + 'vh,' + (4*scale).toFixed(2)   + 'vw)'; root.style.setProperty('--row-val-fs',  v); autoCss += '.exchange-value{font-size:' + v + '}'; }
    if (!(s.rowNameFontPx > 0)) { var v = 'clamp(' + (0.6*scale).toFixed(2)  + 'rem,' + (Math.min(rowVh*0.32,2.4)*scale).toFixed(2) + 'vh,' + (3*scale).toFixed(2)   + 'vw)'; root.style.setProperty('--row-name-fs', v); autoCss += '.exchange-name{font-size:' + v + '}'; }
    if (!(s.rowUnitFontPx > 0)) { var v = 'clamp(' + (0.55*scale).toFixed(2) + 'rem,' + (Math.min(rowVh*0.30,2.0)*scale).toFixed(2) + 'vh,' + (2.8*scale).toFixed(2) + 'vw)'; root.style.setProperty('--row-unit-fs', v); autoCss += '.exchange-value-unit{font-size:' + v + '}'; }
    if (!(s.colHeaderFontPx > 0)) { var v = 'clamp(' + (0.55*scale).toFixed(2) + 'rem,' + (Math.min(rowVh*0.28,1.8)*scale).toFixed(2) + 'vh,' + (2.5*scale).toFixed(2) + 'vw)'; root.style.setProperty('--hdr-cell-fs', v); autoCss += '.exchange-cell{font-size:' + v + '}'; }
    var autoEl = document.getElementById('auto-style');
    if (!autoEl) { autoEl = document.createElement('style'); autoEl.id = 'auto-style'; document.head.appendChild(autoEl); }
    autoEl.textContent = autoCss;
  }

  // ── Application directe sur les nœuds DOM (la plus fiable sur Android WebView) ─

  function applyConcreteStyle(style) {
    if (!style) return;
    var scale = (style.fontScale > 0) ? style.fontScale : 1;
    var nFound = 0;
    function setPx(sel, px) {
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) {
        els[i].setAttribute('style', (els[i].getAttribute('style') || '') + ';font-size:' + px + '!important');
        nFound++;
      }
    }
    if (style.rowValFontPx   > 0) setPx('.exchange-value',      (style.rowValFontPx   * scale) + 'px');
    if (style.rowNameFontPx  > 0) setPx('.exchange-name',       (style.rowNameFontPx  * scale) + 'px');
    if (style.rowUnitFontPx  > 0) setPx('.exchange-value-unit', (style.rowUnitFontPx  * scale) + 'px');
    if (style.colHeaderFontPx > 0) setPx('.exchange-cell',      (style.colHeaderFontPx * scale) + 'px');
    if (style.vdNameFontPx   > 0) setPx('.vd-td-name',          (style.vdNameFontPx   * scale) + 'px');
    if (style.vdValFontPx    > 0) setPx('.vd-td-num',           (style.vdValFontPx    * scale) + 'px');
    if (style.vdUnitFontPx   > 0) setPx('.vd-td-unit',          (style.vdUnitFontPx   * scale) + 'px');
    if (style.vdTitleFontPx  > 0) setPx('.vd-title',            (style.vdTitleFontPx  * scale) + 'px');
    if (style.vdHeaderFontPx > 0) setPx('.vd-table th',         (style.vdHeaderFontPx * scale) + 'px');
    if (style.titleFontPx    > 0 && titleNode) {
      titleNode.setAttribute('style', (titleNode.getAttribute('style') || '') + ';font-size:' + (style.titleFontPx * scale) + 'px!important');
    }
    var gridCols = document.documentElement.style.getPropertyValue('--grid-cols');
    if (gridCols) {
      var gels = document.querySelectorAll('.exchange-row,.exchange-table-header,.exchange-table-header-top,.exchange-table-header-sub');
      for (var j = 0; j < gels.length; j++) {
        gels[j].setAttribute('style', (gels[j].getAttribute('style') || '') + ';grid-template-columns:' + gridCols + '!important');
      }
    }
    var dbgEl = document.getElementById('dbg');
    var rows_n = tableBody ? tableBody.querySelectorAll('.exchange-row').length : 0;
    if (dbgEl) dbgEl.textContent = 'RDR rows=' + rows_n + ' rv=' + (state.style.rowValFontPx||0) + ' rn=' + (state.style.rowNameFontPx||0) + ' sc=' + scale.toFixed(2);
  }

  // ── Style polling direct (WebView → serveur) ─────────────────────────────────

  function mergeAndApplyStyle(raw) {
    if (!raw) return;
    var s = raw;
    var merged = {
      logoWidthPct:    state.itemLogoSize  > 0 ? state.itemLogoSize  * (s.logoWidthPct || 21) / 100 : (s.logoWidthPct  || 21),
      headerHeightVh:  state.itemHdrWeight > 0 ? state.itemHdrWeight * 4.5                           : (s.headerWeight  ? s.headerWeight * 4.5 : 18),
      colUnitePct:     s.colUnitePct     || 0,
      colValPct:       s.colValPct       || 0,
      colHeaderFontPx: s.colHeaderFontPx || 0,
      titleFontPx:     s.titleFontPx     || 0,
      rowUnitFontPx:   s.rowUnitFontPx   || 0,
      rowNameFontPx:   s.rowNameFontPx   || 0,
      rowValFontPx:    s.rowValFontPx    || 0,
      fontScale:       state.itemFontScale > 0 ? state.itemFontScale : (s.fontScale || 1),
      vdTitleFontPx:   s.vdTitleFontPx   || 0,
      vdHeaderFontPx:  s.vdHeaderFontPx  || 0,
      vdUnitFontPx:    s.vdUnitFontPx    || 0,
      vdNameFontPx:    s.vdNameFontPx    || 0,
      vdValFontPx:     s.vdValFontPx     || 0,
      vdColUnitePct:   s.vdColUnitePct   || 0,
      vdColDevisePct:  s.vdColDevisePct  || 0,
      vdColValPct:     s.vdColValPct     || 0,
      vdColCardPct:    s.vdColCardPct    || 0,
    };
    applyStyle(merged);
    // Re-render rows so inline styles are rebuilt from the new merged style
    if (state.theme === 'vertical-dark') {
      var vdTbody = document.querySelector('#vd-root .vd-table tbody');
      if (vdTbody) vdTbody.innerHTML = buildVdRows(state.lastRates);
    } else {
      renderRows(state.lastRates, state.variant);
      applyAutoFont(state.lastRowCount);
    }
    applyConcreteStyle(merged);
  }

  function startStylePoll() {
    if (state.stylePollTimer) { clearInterval(state.stylePollTimer); state.stylePollTimer = null; }
    if (!state.styleUrl) return;
    var lastSig = '';
    var pollCount = 0;
    state.stylePollTimer = setInterval(function() {
      pollCount++;
      fetch(state.styleUrl)
        .then(function(r) { return r.json(); })
        .then(function(raw) {
          var sig = JSON.stringify(raw);
          var changed = sig !== lastSig;
          var dbgEl = document.getElementById('dbg');
          if (dbgEl) dbgEl.textContent = 'POLL#' + pollCount + (changed?' NEW':' same') + ' rv=' + (raw.rowValFontPx||0) + ' rn=' + (raw.rowNameFontPx||0) + ' nk=' + Object.keys(raw).length;
          if (!changed) return;
          lastSig = sig;
          mergeAndApplyStyle(raw);
        })
        .catch(function(e) {
          var dbgEl = document.getElementById('dbg');
          if (dbgEl) dbgEl.textContent = 'POLL ERR#' + pollCount + ': ' + (e && e.message ? e.message : 'fetch failed');
        });
    }, 5000);
  }

  // ── Messages ──────────────────────────────────────────────────────────────────

  function processMsg(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'init') {
      state.variant       = msg.variant     || 'simple';
      state.theme         = msg.theme       || 'default';
      state.flags         = msg.flags       || {};
      state.logoUrl       = msg.logoUrl     || null;
      state.headerBgUrl   = msg.headerBgUrl || '';
      state.style         = {};
      state.styleUrl      = msg.styleUrl     || '';
      state.itemFontScale = msg.itemFontScale || 0;
      state.itemLogoSize  = msg.itemLogoSize  || 0;
      state.itemHdrWeight = msg.itemHdrWeight || 0;
      startStylePoll();

      document.body.setAttribute('data-variant', state.variant);
      document.body.setAttribute('data-theme',   state.theme);

      var rows = (msg.rates || []).map(function (r) { return normalizeRow(r, state.variant); }).filter(Boolean);

      if (state.theme === 'vertical-dark') {
        applyStyle(msg.style || {});
        renderVerticalDark(rows);
        applyConcreteStyle(state.style);
      } else {
        applyStyle(msg.style || {});
        if (state.headerBgUrl)
          document.documentElement.style.setProperty('--header-bg-url', 'url(' + state.headerBgUrl + ')');
        titleNode.textContent = TITLES[state.variant] || TITLES['simple'];
        renderLogo(state.logoUrl);
        renderDate();
        renderHeader(state.variant);
        renderRows(rows, state.variant);
        applyAutoFont(rows.length);
        applyConcreteStyle(state.style);
      }

    } else if (msg.type === 'update') {
      var rows2 = (msg.rates || []).map(function (r) { return normalizeRow(r, state.variant); }).filter(Boolean);
      state.lastRates = rows2;
      if (state.theme === 'vertical-dark') {
        var vdTbody = document.querySelector('#vd-root .vd-table tbody');
        if (vdTbody) vdTbody.innerHTML = buildVdRows(rows2);
      } else {
        renderRows(rows2, state.variant);
      }

    } else if (msg.type === 'logo') {
      state.logoUrl = msg.logoUrl || null;
      renderLogo(state.logoUrl);
    }
  }

  // Fallback postMessage (moins fiable sur Android avec HTML inline)
  function handleMessage(e) {
    var msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    processMsg(msg);
  }

  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage);

  window.__tvReceive = processMsg;
})();
</script>
<script>
(function () {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
  var m = window.location.pathname.match(/\/widgets\/([^\/]+)\//);
  var widgetType = m ? m[1] : '';
  if (!widgetType) return;
  var base = window.location.origin;
  var assets = base + '/widgets/' + widgetType + '/assets/';
  var FLAG_CODES = ['AED','BHD','CAD','CHF','DKK','EUR','GBP','GIP','JPY','KWD','NOK','OMR','QAR','SAR','SEK','USD'];
  var flags = {};
  FLAG_CODES.forEach(function(c) { flags[c] = assets + c + '.jpg'; });
  var params  = new URLSearchParams(window.location.search);
  var variant = params.get('variant') || 'simple';
  var theme   = params.get('theme')   || 'default';

  function buildRates(bcRates, bkamMap) {
    if (variant === 'bkam') {
      return bcRates.map(function(r) {
        var b = bkamMap[r.code.toLowerCase()] || {};
        return { code: r.code, label: r.label, unit: r.unit, icon: r.icon,
                 bkamReference: b.reference || '-', bkamTpe: b.tpe || '-' };
      });
    }
    if (variant === 'combined') {
      return bcRates.map(function(r) {
        var b = bkamMap[r.code.toLowerCase()] || {};
        return { code: r.code, label: r.label, unit: r.unit, icon: r.icon,
                 buy: r.buy, sell: r.sell,
                 bkamReference: b.reference || '-', bkamTpe: b.tpe || '-' };
      });
    }
    return bcRates; // simple
  }

  function fetchData() {
    fetch(base + '/api/widgets/' + widgetType)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var bcRates = data.rates || [];
        var bkamMap = data.bkamByCode || {};
        if (!bcRates.length) return;
        if (typeof window.__tvReceive === 'function') {
          window.__tvReceive({
            type: 'init', variant: variant, theme: theme,
            rates: buildRates(bcRates, bkamMap),
            logoUrl: null, flags: flags,
            headerBgUrl: assets + 'argents.jpg',
            style: {},
          });
        }
      })
      .catch(function() {});
  }
  fetchData();
  setInterval(fetchData, 30000);
})();
</script>
</body>
</html>`;
}

export const TABLEAU_CHANGE_HTML = buildTableauChangeHtml();
