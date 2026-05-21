#!/usr/bin/env node
/**
 * Exporte un widget complet vers tv-viewer-app :
 *   - ui.json (description SDUI)
 *   - widget.json (metadonnees serveur)
 *   - index.html (fallback genere si absent)
 *
 * Usage : node scripts/export-widget.js <widget-name>
 */

const fs = require('fs');
const path = require('path');

const VALID_NODE_TYPES = ['view', 'text', 'image', 'animated-view', 'video', 'scroll-view', 'flat-list', 'spacer'];

const FALLBACK_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Widget</title></head>
<body style="margin:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
<p>Ce widget utilise le rendu natif SDUI (ui.json)</p>
</body></html>`;

const widgetName = process.argv[2];
if (!widgetName) {
  console.error('Usage: node scripts/export-widget.js <widget-name>');
  console.error('Exemple: node scripts/export-widget.js tableau-change');
  process.exit(1);
}

const exportsDir = path.join(__dirname, '..', 'exports', widgetName);
const uiPath = path.join(exportsDir, 'ui.json');
const metaPath = path.join(exportsDir, 'widget.json');
const destDir = path.join(__dirname, '..', '..', 'tv-viewer-app', 'server', 'widgets', widgetName);

// --- 1. Verifier ui.json ---
if (!fs.existsSync(uiPath)) {
  console.error(`\x1b[31mERREUR\x1b[0m exports/${widgetName}/ui.json introuvable`);
  const exDir = path.join(__dirname, '..', 'exports');
  if (fs.existsSync(exDir)) {
    console.error('Widgets disponibles:');
    fs.readdirSync(exDir)
      .filter(d => fs.existsSync(path.join(exDir, d, 'ui.json')))
      .forEach(d => console.error(`  - ${d}`));
  }
  process.exit(1);
}

let uiJson;
try {
  uiJson = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
} catch (e) {
  console.error(`\x1b[31mERREUR\x1b[0m ui.json invalide: ${e.message}`);
  process.exit(1);
}

// Validation ui.json
const uiErrors = [];
if (typeof uiJson.version !== 'number') uiErrors.push('version manquant (nombre)');
if (typeof uiJson.widget !== 'string') uiErrors.push('widget manquant (string)');
if (!uiJson.root) uiErrors.push('root manquant');
else if (!VALID_NODE_TYPES.includes(uiJson.root.type)) uiErrors.push(`root.type invalide: "${uiJson.root.type}"`);

if (uiErrors.length > 0) {
  console.error(`\x1b[31mERREUR\x1b[0m ui.json invalide:`);
  uiErrors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// --- 2. Verifier widget.json ---
if (!fs.existsSync(metaPath)) {
  console.error(`\x1b[31mERREUR\x1b[0m exports/${widgetName}/widget.json introuvable`);
  console.error('Chaque widget doit avoir un widget.json avec au minimum :');
  console.error('  { "label": "Mon Widget", "description": "...", "apiEndpoint": "/api/widgets/' + widgetName + '", "refreshMs": 30000 }');
  process.exit(1);
}

let widgetMeta;
try {
  widgetMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
} catch (e) {
  console.error(`\x1b[31mERREUR\x1b[0m widget.json invalide: ${e.message}`);
  process.exit(1);
}

const metaErrors = [];
if (!widgetMeta.label) metaErrors.push('label manquant');
if (!widgetMeta.apiEndpoint) metaErrors.push('apiEndpoint manquant');
if (metaErrors.length > 0) {
  console.error(`\x1b[31mERREUR\x1b[0m widget.json incomplet:`);
  metaErrors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// --- 3. Creer le dossier destination si absent ---
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`\x1b[33mCREE\x1b[0m ${destDir}`);
}

// --- 4. Copier ui.json + widget.json ---
fs.copyFileSync(uiPath, path.join(destDir, 'ui.json'));
fs.copyFileSync(metaPath, path.join(destDir, 'widget.json'));

// --- 5. Generer index.html fallback si absent ---
const indexPath = path.join(destDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, FALLBACK_HTML, 'utf8');
  console.log(`\x1b[33mGENERE\x1b[0m index.html (fallback SDUI)`);
}

// --- 6. Verifier coherence dataSource / apiEndpoint ---
if (uiJson.dataSource?.url && widgetMeta.apiEndpoint) {
  if (uiJson.dataSource.url !== widgetMeta.apiEndpoint) {
    console.log(`\x1b[33mATTENTION\x1b[0m dataSource.url (${uiJson.dataSource.url}) != widget.json apiEndpoint (${widgetMeta.apiEndpoint})`);
  }
}

// --- 7. Verifier si api.js existe dans le dossier widget destination ---
if (uiJson.dataSource?.url) {
  const apiJsPath = path.join(destDir, 'api.js');
  if (!fs.existsSync(apiJsPath)) {
    console.log(`\x1b[33mATTENTION\x1b[0m api.js manquant pour l'endpoint "${uiJson.dataSource.url}"`);
    console.log(`         Creez tv-viewer-app/server/widgets/${widgetName}/api.js avec exports.getData`);
  }
}

// --- 8. Resume ---
function countNodes(node) {
  if (!node || typeof node !== 'object') return 0;
  let c = 1;
  if (Array.isArray(node.children)) node.children.forEach(ch => { c += countNodes(ch); });
  if (node.props?.template) c += countNodes(node.props.template);
  return c;
}

const nodes = countNodes(uiJson.root);
const uiSize = fs.statSync(path.join(destDir, 'ui.json')).size;

console.log('');
console.log(`\x1b[32mEXPORTE\x1b[0m ${widgetName} → tv-viewer-app`);
console.log(`  Label:      ${widgetMeta.label}`);
console.log(`  Version:    ${uiJson.version}`);
console.log(`  Noeuds:     ${nodes}`);
console.log(`  DataSource: ${uiJson.dataSource?.url || '(aucun)'}`);
console.log(`  Refresh:    ${(widgetMeta.refreshMs || 30000) / 1000}s`);
console.log(`  Taille:     ${(uiSize / 1024).toFixed(1)} KB`);
console.log(`  Fichiers:   ui.json + widget.json + index.html`);
console.log(`  Dest:       ${destDir}`);
console.log('');
console.log('Prochaine etape:');
console.log('  cd ../tv-viewer-app && yarn sync:server && yarn android');
