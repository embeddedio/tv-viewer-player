#!/usr/bin/env node
/**
 * Exporte tous les ui.json valides vers tv-viewer-app
 * Usage : node scripts/export-all.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, '..', 'exports');
if (!fs.existsSync(exportsDir)) { console.error('Dossier exports/ introuvable'); process.exit(1); }

// D'abord valider
console.log('Validation...\n');
try {
  execSync('node scripts/validate-all.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
} catch {
  console.error('\nValidation echouee. Corrigez les erreurs avant d\'exporter.');
  process.exit(1);
}

console.log('\nExport...\n');

const dirs = fs.readdirSync(exportsDir)
  .filter(d => fs.existsSync(path.join(exportsDir, d, 'ui.json')));

let success = 0;
let failed = 0;

for (const dir of dirs) {
  try {
    execSync(`node scripts/export-widget.js ${dir}`, { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    success++;
  } catch {
    failed++;
  }
  console.log('');
}

console.log(`\n${success} exporte(s), ${failed} echec(s)`);
if (success > 0) {
  console.log('\nProchaine etape: cd ../tv-viewer-app && yarn sync:server && yarn android');
}
process.exit(failed > 0 ? 1 : 0);
