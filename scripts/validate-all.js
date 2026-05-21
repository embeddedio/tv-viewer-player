#!/usr/bin/env node
/**
 * Valide tous les widgets dans exports/ (ui.json + widget.json)
 * Usage : node scripts/validate-all.js
 */

const fs = require('fs');
const path = require('path');

const VALID_NODE_TYPES = ['view', 'text', 'image', 'animated-view', 'video', 'scroll-view', 'flat-list', 'spacer'];
const VALID_ROOTS = ['$data', '$item', '$index', '$env', '$sources', '$props', '$layout', '$computed', '$response'];

const exportsDir = path.join(__dirname, '..', 'exports');

// --- Validators ---

function validateDataSource(src, p, errors) {
  if (typeof src !== 'object' || src === null) { errors.push({ path: p, msg: 'doit etre un objet', sev: 'ERR' }); return; }
  if (typeof src.url !== 'string' || !src.url) errors.push({ path: `${p}/url`, msg: 'requis', sev: 'ERR' });
  else if (!src.url.startsWith('/')) errors.push({ path: `${p}/url`, msg: 'doit commencer par /', sev: 'WARN' });
  if (src.refreshMs != null && typeof src.refreshMs !== 'number') errors.push({ path: `${p}/refreshMs`, msg: 'doit etre un nombre', sev: 'ERR' });
}

function validateNode(node, p, errors) {
  if (typeof node !== 'object' || node === null) { errors.push({ path: p, msg: 'doit etre un objet', sev: 'ERR' }); return; }
  if (!node.type) { errors.push({ path: `${p}/type`, msg: 'requis', sev: 'ERR' }); return; }
  if (!VALID_NODE_TYPES.includes(node.type)) errors.push({ path: `${p}/type`, msg: `type inconnu "${node.type}"`, sev: 'ERR' });
  if (node.style != null && typeof node.style !== 'object') errors.push({ path: `${p}/style`, msg: 'doit etre un objet', sev: 'ERR' });
  if (node.props != null && typeof node.props !== 'object') errors.push({ path: `${p}/props`, msg: 'doit etre un objet', sev: 'ERR' });
  if (node.conditional && typeof node.conditional.if !== 'string') errors.push({ path: `${p}/conditional/if`, msg: 'doit etre un string', sev: 'ERR' });

  if (node.children != null) {
    if (typeof node.children === 'string') {
      const refs = node.children.match(/\$[a-zA-Z_]+/g) || [];
      for (const ref of refs) {
        if (!VALID_ROOTS.includes(ref.split('.')[0])) errors.push({ path: `${p}/children`, msg: `ref inconnue "${ref}"`, sev: 'WARN' });
      }
    } else if (Array.isArray(node.children)) {
      node.children.forEach((c, i) => validateNode(c, `${p}/children[${i}]`, errors));
    }
  }

  if (node.type === 'flat-list' && node.props) {
    if (!node.props.data) errors.push({ path: `${p}/props/data`, msg: 'flat-list necessite "data"', sev: 'ERR' });
    if (!node.props.template) errors.push({ path: `${p}/props/template`, msg: 'flat-list necessite "template"', sev: 'ERR' });
    else validateNode(node.props.template, `${p}/props/template`, errors);
    if (node.props.separator) validateNode(node.props.separator, `${p}/props/separator`, errors);
  }
}

function countNodes(node) {
  if (!node || typeof node !== 'object') return 0;
  let c = 1;
  if (Array.isArray(node.children)) node.children.forEach(ch => { c += countNodes(ch); });
  if (node.props?.template) c += countNodes(node.props.template);
  if (node.props?.separator) c += countNodes(node.props.separator);
  return c;
}

function validateUiJson(json) {
  const errors = [];
  if (typeof json !== 'object' || json === null) { errors.push({ path: '/', msg: 'doit etre un objet JSON', sev: 'ERR' }); return errors; }
  if (typeof json.version !== 'number') errors.push({ path: '/version', msg: 'requis (nombre)', sev: 'ERR' });
  if (typeof json.widget !== 'string' || !json.widget) errors.push({ path: '/widget', msg: 'requis (string)', sev: 'ERR' });
  if (!json.root) { errors.push({ path: '/root', msg: 'requis', sev: 'ERR' }); return errors; }
  if (json.dataSource) validateDataSource(json.dataSource, '/dataSource', errors);
  if (json.additionalSources) for (const [k, s] of Object.entries(json.additionalSources)) validateDataSource(s, `/additionalSources/${k}`, errors);
  validateNode(json.root, '/root', errors);
  return errors;
}

function validateWidgetJson(json) {
  const errors = [];
  if (typeof json !== 'object' || json === null) { errors.push({ path: '/', msg: 'doit etre un objet JSON', sev: 'ERR' }); return errors; }
  if (!json.label) errors.push({ path: '/label', msg: 'requis (nom affiche dans l\'admin)', sev: 'ERR' });
  if (!json.apiEndpoint) errors.push({ path: '/apiEndpoint', msg: 'requis (ex: /api/widgets/mon-widget)', sev: 'ERR' });
  else if (!json.apiEndpoint.startsWith('/')) errors.push({ path: '/apiEndpoint', msg: 'doit commencer par /', sev: 'WARN' });
  if (json.refreshMs != null && typeof json.refreshMs !== 'number') errors.push({ path: '/refreshMs', msg: 'doit etre un nombre', sev: 'ERR' });
  return errors;
}

// --- Main ---

if (!fs.existsSync(exportsDir)) { console.error('Dossier exports/ introuvable'); process.exit(1); }

const dirs = fs.readdirSync(exportsDir).filter(d => fs.statSync(path.join(exportsDir, d)).isDirectory());

let totalErrors = 0;
let totalWarnings = 0;
let widgetCount = 0;

for (const dir of dirs) {
  const uiPath = path.join(exportsDir, dir, 'ui.json');
  const metaPath = path.join(exportsDir, dir, 'widget.json');

  if (!fs.existsSync(uiPath)) continue;
  widgetCount++;

  const allErrors = [];

  // --- Valider ui.json ---
  let uiJson;
  try {
    uiJson = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
    allErrors.push(...validateUiJson(uiJson).map(e => ({ ...e, file: 'ui.json' })));
  } catch (e) {
    allErrors.push({ path: '/', msg: `JSON invalide: ${e.message}`, sev: 'ERR', file: 'ui.json' });
  }

  // --- Valider widget.json ---
  if (!fs.existsSync(metaPath)) {
    allErrors.push({ path: '/', msg: 'widget.json manquant (requis pour l\'admin)', sev: 'ERR', file: 'widget.json' });
  } else {
    try {
      const metaJson = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      allErrors.push(...validateWidgetJson(metaJson).map(e => ({ ...e, file: 'widget.json' })));

      // Coherence dataSource.url <-> apiEndpoint
      if (uiJson?.dataSource?.url && metaJson.apiEndpoint) {
        if (uiJson.dataSource.url !== metaJson.apiEndpoint) {
          allErrors.push({
            path: '/dataSource.url',
            msg: `ui.json "${uiJson.dataSource.url}" != widget.json "${metaJson.apiEndpoint}"`,
            sev: 'WARN',
            file: 'coherence',
          });
        }
      }
    } catch (e) {
      allErrors.push({ path: '/', msg: `JSON invalide: ${e.message}`, sev: 'ERR', file: 'widget.json' });
    }
  }

  const errs = allErrors.filter(e => e.sev === 'ERR');
  const warns = allErrors.filter(e => e.sev === 'WARN');
  totalErrors += errs.length;
  totalWarnings += warns.length;

  const nodes = uiJson ? countNodes(uiJson.root) : 0;
  const ds = uiJson?.dataSource?.url || '(aucun)';

  if (errs.length === 0) {
    const warnStr = warns.length ? ` | ${warns.length} warning(s)` : '';
    console.log(`\x1b[32m  OK  \x1b[0m ${dir}/ — v${uiJson?.version || '?'} | ${nodes} noeuds | ${ds}${warnStr}`);
  } else {
    console.log(`\x1b[31m FAIL \x1b[0m ${dir}/ — ${errs.length} erreur(s), ${warns.length} warning(s)`);
  }

  for (const e of allErrors) {
    const color = e.sev === 'ERR' ? '\x1b[31m' : '\x1b[33m';
    console.log(`       ${color}${e.sev}\x1b[0m [${e.file}] ${e.path} — ${e.msg}`);
  }
}

console.log('');
console.log(`${widgetCount} widget(s) | ${totalErrors} erreur(s) | ${totalWarnings} warning(s)`);
process.exit(totalErrors > 0 ? 1 : 0);
