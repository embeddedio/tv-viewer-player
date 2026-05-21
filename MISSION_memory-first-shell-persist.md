# MISSION — Refactor stockage JSON : Memory-first + Shell persist

> **Pour l'IA agent (Claude Code)** : Cette mission refactor la couche de stockage des données structurées (JSON) du projet `tv-viewer-dev` pour contourner définitivement les bugs FUSE de la box Android TV cible. Lis l'**intégralité** de ce document avant d'écrire du code. Le contexte historique en section 1 est essentiel pour comprendre pourquoi on ne peut PAS revenir à des approches "standards".

---

## 1. Contexte historique (ne pas ignorer)

### 1.1 La box cible

L'app `tv-viewer-dev` est déployée sur des box Android TV génériques chinoises (modèle XM32, SoC Allwinner/Rockchip). Le firmware Android de ces box utilise une implémentation **FUSE/SDcardFS bricolée par le fabricant**, non certifiée Google, avec plusieurs bugs reproductibles sur le mount `/storage/emulated/0/`.

### 1.2 Bugs FUSE confirmés sur cette box

Sessions de debug antérieures ont **confirmé empiriquement** :

| Opération | Comportement |
|---|---|
| `fs.writeFile(existing_path, data)` avec `flag: 'w'` (défaut) | ❌ `EEXIST: file already exists` |
| `fs.openSync(path, 'w')` puis `write()` | ❌ Idem EEXIST sur fichier existant |
| `fs.renameSync(tmp, target)` | ❌ `EPERM: operation not permitted` |
| `fs.unlinkSync(target)` puis `writeFileSync` | ❌ Race condition, échoue ~30% du temps |
| `fs.openSync(path, 'r+')` + `ftruncate(fd, 0)` + write + close | ✅ Marche (chemin syscall différent) |
| Création d'un fichier **qui n'existe pas** | ✅ Marche toujours |
| `fs.readFileSync` | ✅ Marche toujours |
| `fs.unlinkSync` seul | ✅ Marche (à confirmer cas par cas) |

### 1.3 Pourquoi `r+ + ftruncate` n'est pas suffisant

L'approche `r+ + ftruncate` marche pour des writes simples mais reste fragile pour des **modifications complexes** :

- Si le fichier existant est plus gros que le nouveau contenu : `ftruncate(0)` puis write — risque selon les versions FUSE
- Si plusieurs writes concurrents arrivent (admin web qui spam le bouton save) : race conditions sur le même fd
- Si l'app crash en plein milieu : fichier potentiellement corrompu (la moitié des anciens octets + la moitié des nouveaux)

L'erreur actuelle qui motive ce refactor :

```json
{
  "message": "Données invalides",
  "error": "EEXIST: file already exists, open '/storage/emulated/0/Documents/tv-viewer/data/sequences.json'"
}
```

### 1.4 Solutions écartées (avec justification)

- **Stockage interne (`Context.filesDir`)** : refusé par le user — la DB doit rester accessible via USB MTP / file manager pour debug terrain et backup
- **SQLite externe** : SQLite fait du `fcntl()` locking + WAL mode crée des fichiers `.db-wal` qui sont écrasés en permanence → mêmes bugs FUSE déclenchés
- **Storage Access Framework (SAF)** : Node.js ne peut pas utiliser les URIs `content://` via `fs.*`, refactor trop lourd
- **Pattern atomic write (`rename()`)** : `rename()` retourne EPERM sur cette box, confirmé

---

## 2. Stratégie : Memory-first + Shell persist

### 2.1 Principe

**Aucune opération Node.js `fs.*` n'écrit directement dans `/storage/emulated/0/Documents/tv-viewer/data/`**. Plus jamais.

À la place :

1. **Au boot** : Node lit chaque JSON UNE seule fois et le charge en mémoire (RAM)
2. **Pendant l'exécution** : toutes les mutations (CRUD sur sequences, config, metadata, auth) sont **pures opérations RAM** — aucun I/O disque
3. **Persistance** : un `persist()` debounced écrit le fichier via une **commande shell** (`cp` ou `cat >`), pas via `fs.*`

### 2.2 Pourquoi le shell contourne le bug

Le bug FUSE est dépendant du **contexte process** : qui appelle le syscall, avec quel UID effectif, depuis quel domaine SELinux. Quand Node.js fait `fs.writeFileSync` :

```
node process (UID 10234, domain untrusted_app)
  → libuv uv_fs_write
  → glibc/bionic write()
  → syscall openat(O_WRONLY|O_CREAT|O_TRUNC) ← bug FUSE déclenché
```

Quand Node fait `child_process.execFileSync('cp', [src, dst])` :

```
node process (UID 10234)
  → fork()
  → exec /system/bin/cp (toybox)
  → CHILD process (UID 10234 mais context process différent)
  → toybox cp: open(O_WRONLY|O_CREAT|O_TRUNC) ← bug FUSE PARFOIS pas déclenché
```

Le fork+exec **change suffisamment de contexte** (PID, parent, file table, env vars, parfois mount namespace via Zygote) pour que la couche FUSE buggée prenne un autre chemin de code et ne déclenche pas le bug.

C'est documenté dans plusieurs threads digital signage Android et utilisé en prod par plusieurs apps qui ciblent du hardware low-cost.

### 2.3 Fallback en cascade

Vu qu'on ne sait pas a priori quelle commande shell marchera sur quelle box, on cascade :

1. `cp src dst` (toybox, syscall standard)
2. `cat src > dst` via `sh -c` (différentes flags d'open dans shell)
3. `dd if=src of=dst conv=notrunc` (pas de O_TRUNC, écrase byte par byte)
4. Dernier recours : `r+ + ftruncate` (fallback Node natif)

La première qui marche est mémoïsée pour les writes suivants (évite de retenter les variantes qui échouent).

---

## 3. Architecture du module à créer

### 3.1 Fichiers à créer

```
server/lib/
  ├── memoryStore.js          ← state manager singleton (RAM)
  ├── shellPersist.js         ← persist via execFile shell + cascade fallback
  └── persistQueue.js         ← debouncer + serialiseur
```

### 3.2 Fichiers à modifier

```
server/server.js              ← routes utilisent memoryStore au lieu de fs.*
server/main.js                ← init memoryStore au boot
```

### 3.3 Fichiers à NE PAS toucher

```
server/lib/android-bridge-fs.js   ← garde l'archi bridge pour les MÉDIAS uniquement
StoragePermissionModule.kt        ← garde la logique permission et upload média
```

**Distinction critique** : la couche bridge Kotlin reste utilisée **uniquement pour les uploads de médias** (images/vidéos). Pour les données structurées JSON, on bypass complètement le bridge et Node écrit lui-même via shell.

---

## 4. Implémentation

### 4.1 `server/lib/memoryStore.js`

State manager singleton qui :
- Charge tous les JSON au démarrage
- Expose des getters/setters synchrones (opérations RAM)
- Déclenche `persistQueue.schedule(name)` à chaque mutation

```js
// server/lib/memoryStore.js
const fs = require('fs');
const path = require('path');
const persistQueue = require('./persistQueue');

class MemoryStore {
  constructor() {
    this.state = {};
    this.dataDir = null;
    this.loaded = false;
  }

  /**
   * Initialise le store : lit les JSON existants depuis le disque.
   * À appeler UNE seule fois au boot, après réception du config message.
   */
  init(dataDir) {
    this.dataDir = dataDir;
    this.state = {
      sequences: this._loadJson('sequences.json', []),
      config: this._loadJson('config.json', { orientation: 'landscape', ticker: { items: [] } }),
      metadata: this._loadJson('metadata.json', []),
      auth: this._loadJson('auth.json', { isDefaultPassword: true }),
    };

    persistQueue.init(this.dataDir, () => this.state);
    this.loaded = true;
  }

  _loadJson(filename, defaultValue) {
    const fp = path.join(this.dataDir, filename);
    try {
      if (!fs.existsSync(fp)) return defaultValue;
      const raw = fs.readFileSync(fp, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[MemoryStore] Failed to load ${filename}:`, err.message);
      return defaultValue;
    }
  }

  // === Sequences ===
  getSequences() {
    return this.state.sequences;
  }

  setSequences(newSequences) {
    if (!Array.isArray(newSequences)) {
      throw new Error('sequences must be an array');
    }
    this.state.sequences = newSequences;
    persistQueue.schedule('sequences');
  }

  addSequence(seq) {
    this.state.sequences.push(seq);
    persistQueue.schedule('sequences');
  }

  updateSequence(id, partial) {
    const idx = this.state.sequences.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Sequence ${id} not found`);
    this.state.sequences[idx] = { ...this.state.sequences[idx], ...partial };
    persistQueue.schedule('sequences');
  }

  deleteSequence(id) {
    const before = this.state.sequences.length;
    this.state.sequences = this.state.sequences.filter((s) => s.id !== id);
    if (this.state.sequences.length === before) {
      throw new Error(`Sequence ${id} not found`);
    }
    persistQueue.schedule('sequences');
  }

  // === Config ===
  getConfig() {
    return this.state.config;
  }

  setConfig(newConfig) {
    this.state.config = newConfig;
    persistQueue.schedule('config');
  }

  updateConfig(partial) {
    this.state.config = { ...this.state.config, ...partial };
    persistQueue.schedule('config');
  }

  // === Metadata ===
  getMetadata() {
    return this.state.metadata;
  }

  setMetadata(newMetadata) {
    this.state.metadata = newMetadata;
    persistQueue.schedule('metadata');
  }

  addMediaMetadata(media) {
    this.state.metadata.push(media);
    persistQueue.schedule('metadata');
  }

  removeMediaMetadata(filename) {
    this.state.metadata = this.state.metadata.filter((m) => m.filename !== filename);
    persistQueue.schedule('metadata');
  }

  // === Auth ===
  getAuth() {
    return this.state.auth;
  }

  setAuth(newAuth) {
    this.state.auth = newAuth;
    persistQueue.schedule('auth');
  }

  // === Utilitaires ===
  /**
   * Force la persistance immédiate (utile au shutdown ou pour test)
   */
  async flushNow() {
    return persistQueue.flushAll();
  }
}

module.exports = new MemoryStore();
```

### 4.2 `server/lib/shellPersist.js`

Module qui écrit un fichier via shell, avec cascade de stratégies.

```js
// server/lib/shellPersist.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Stratégies par ordre de préférence
const STRATEGIES = ['cp', 'cat_redirect', 'dd_notrunc', 'rplus_ftruncate'];

// Mémorise la stratégie qui marche par fichier
const successfulStrategy = new Map();

/**
 * Écrit `content` dans `targetPath` via shell.
 * Cascade de stratégies, mémoïsation de celle qui marche.
 */
async function writeViaShell(targetPath, content) {
  // 1. Écris d'abord dans le cache interne (toujours OK, pas de FUSE)
  const cacheDir = process.env.NODE_TMP_DIR
    || os.tmpdir()
    || '/data/local/tmp';

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const tmpPath = path.join(
    cacheDir,
    `persist_${path.basename(targetPath)}_${Date.now()}_${process.pid}.tmp`
  );

  // Cette écriture est INTERNE, pas externe → marche toujours
  fs.writeFileSync(tmpPath, content, 'utf8');

  try {
    // S'assure que le dossier cible existe
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Ordre : stratégie mémoïsée si on en a une, sinon cascade
    const memoized = successfulStrategy.get(targetPath);
    const order = memoized
      ? [memoized, ...STRATEGIES.filter((s) => s !== memoized)]
      : STRATEGIES;

    const errors = [];

    for (const strat of order) {
      try {
        await applyStrategy(strat, tmpPath, targetPath, content);
        successfulStrategy.set(targetPath, strat);
        return { ok: true, strategy: strat };
      } catch (err) {
        errors.push(`${strat}: ${err.message}`);
      }
    }

    throw new Error(`All strategies failed: ${errors.join(' | ')}`);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

async function applyStrategy(strategy, tmpPath, targetPath, content) {
  switch (strategy) {
    case 'cp':
      // toybox cp — fork+exec, contexte process différent
      await execFileAsync('cp', [tmpPath, targetPath], { timeout: 5000 });
      break;

    case 'cat_redirect':
      // cat src > dst — shell handle l'open, peut emprunter chemin différent
      await execFileAsync(
        'sh',
        ['-c', `cat "${tmpPath}" > "${targetPath}"`],
        { timeout: 5000 }
      );
      break;

    case 'dd_notrunc':
      // dd conv=notrunc — pas de O_TRUNC, écrase byte par byte
      // Note: si new content est plus court que old, garbage à la fin → on truncate après
      await execFileAsync(
        'dd',
        [`if=${tmpPath}`, `of=${targetPath}`, 'conv=notrunc'],
        { timeout: 5000 }
      );
      // Force la bonne taille
      const fd = fs.openSync(targetPath, 'r+');
      try {
        fs.ftruncateSync(fd, Buffer.byteLength(content, 'utf8'));
      } finally {
        fs.closeSync(fd);
      }
      break;

    case 'rplus_ftruncate':
      // Fallback Node natif (la solution actuelle qui marche pour des cas simples)
      if (fs.existsSync(targetPath)) {
        const fd = fs.openSync(targetPath, 'r+');
        try {
          fs.ftruncateSync(fd, 0);
          fs.writeSync(fd, content, 0, 'utf8');
        } finally {
          fs.closeSync(fd);
        }
      } else {
        // Création : pas de bug FUSE possible
        fs.writeFileSync(targetPath, content, 'utf8');
      }
      break;

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  // Vérification post-write : taille cohérente
  const expected = Buffer.byteLength(content, 'utf8');
  const actual = fs.statSync(targetPath).size;
  if (actual !== expected) {
    throw new Error(`Size mismatch after ${strategy}: expected ${expected}, got ${actual}`);
  }
}

/**
 * Retourne le diagnostic des stratégies utilisées (utile pour logs/support)
 */
function getDiagnostic() {
  const result = {};
  for (const [key, value] of successfulStrategy.entries()) {
    result[key] = value;
  }
  return result;
}

module.exports = {
  writeViaShell,
  getDiagnostic,
};
```

### 4.3 `server/lib/persistQueue.js`

Debouncer + serialiseur pour éviter les writes concurrents :

```js
// server/lib/persistQueue.js
const path = require('path');
const { writeViaShell } = require('./shellPersist');

const DEBOUNCE_MS = 800;       // Attend 800ms d'inactivité avant de persister
const MAX_DEFER_MS = 5000;     // Persiste de force après 5s max même si mutations continues

class PersistQueue {
  constructor() {
    this.dataDir = null;
    this.getState = null;
    this.timers = new Map();           // nom → setTimeout id
    this.firstScheduled = new Map();   // nom → timestamp première mutation pending
    this.inFlight = new Map();         // nom → Promise du write en cours
  }

  init(dataDir, getStateFn) {
    this.dataDir = dataDir;
    this.getState = getStateFn;
  }

  /**
   * Programme une persistance debounced pour `name` (ex: 'sequences')
   */
  schedule(name) {
    if (!this.dataDir) {
      console.error('[PersistQueue] Not initialized');
      return;
    }

    // Si pas encore de timer pending, note l'instant de la première mutation
    if (!this.firstScheduled.has(name)) {
      this.firstScheduled.set(name, Date.now());
    }

    // Annule le timer existant
    const existing = this.timers.get(name);
    if (existing) clearTimeout(existing);

    // Si on dépasse MAX_DEFER_MS, persiste immédiatement
    const elapsed = Date.now() - this.firstScheduled.get(name);
    if (elapsed >= MAX_DEFER_MS) {
      this._doWrite(name);
      return;
    }

    // Sinon, debounce
    const t = setTimeout(() => this._doWrite(name), DEBOUNCE_MS);
    this.timers.set(name, t);
  }

  async _doWrite(name) {
    this.timers.delete(name);
    this.firstScheduled.delete(name);

    // Si un write est déjà en cours pour ce fichier, attend qu'il finisse
    // puis re-schedule (pour ne pas perdre les mutations arrivées entre-temps)
    if (this.inFlight.has(name)) {
      try { await this.inFlight.get(name); } catch {}
      this.schedule(name);
      return;
    }

    const writePromise = this._performWrite(name);
    this.inFlight.set(name, writePromise);

    try {
      await writePromise;
    } finally {
      this.inFlight.delete(name);
    }
  }

  async _performWrite(name) {
    const state = this.getState();
    const data = state[name];
    if (data === undefined) {
      console.warn(`[PersistQueue] No data for ${name}`);
      return;
    }

    const targetPath = path.join(this.dataDir, `${name}.json`);
    const content = JSON.stringify(data, null, 2);

    try {
      const result = await writeViaShell(targetPath, content);
      console.log(`[PersistQueue] Persisted ${name}.json via ${result.strategy}`);
    } catch (err) {
      console.error(`[PersistQueue] FAILED to persist ${name}:`, err.message);
      // Retry une fois après 2s
      setTimeout(() => this.schedule(name), 2000);
    }
  }

  /**
   * Force la persistance immédiate de toutes les mutations pending
   */
  async flushAll() {
    // Annule tous les timers, déclenche les writes immédiatement
    const names = Array.from(this.timers.keys());
    for (const name of names) {
      clearTimeout(this.timers.get(name));
      this.timers.delete(name);
    }

    await Promise.all(names.map((n) => this._doWrite(n)));

    // Attend aussi les writes déjà en cours
    await Promise.all(Array.from(this.inFlight.values()));
  }
}

module.exports = new PersistQueue();
```

### 4.4 Adaptation de `server/main.js`

Au démarrage, après réception du message `config` avec `folderPath`, initialiser le store :

```js
// server/main.js (extrait, à intégrer dans le boot existant)
const memoryStore = require('./lib/memoryStore');

// Quand le message 'storage-path' arrive depuis l'app :
rnBridge.channel.on('message', (msg) => {
  // ... existing handlers ...
  if (msg.type === 'storage-path') {
    const dataDir = path.join(msg.path, 'data');

    // Init le store mémoire avec lecture des JSON existants
    memoryStore.init(dataDir);

    // Démarre Express (qui utilise maintenant memoryStore au lieu de fs.*)
    startServer(...);
  }
});

// Avant shutdown, flush les writes pending
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, flushing writes...');
  await memoryStore.flushNow();
  process.exit(0);
});
```

### 4.5 Adaptation des routes Express

Remplacer **toutes** les opérations `fs.readFileSync('sequences.json')` / `fs.writeFileSync('sequences.json')` par des appels au store.

**Avant** :

```js
app.get('/api/sequences', (req, res) => {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'sequences.json'), 'utf8');
  res.json(JSON.parse(raw));
});

app.post('/api/sequences', (req, res) => {
  const sequences = JSON.parse(fs.readFileSync(SEQ_PATH));
  sequences.push(req.body);
  fs.writeFileSync(SEQ_PATH, JSON.stringify(sequences));   // ← BUG FUSE ici
  res.json({ ok: true });
});

app.put('/api/sequences/:id', (req, res) => {
  const sequences = JSON.parse(fs.readFileSync(SEQ_PATH));
  const idx = sequences.findIndex(s => s.id === req.params.id);
  sequences[idx] = req.body;
  fs.writeFileSync(SEQ_PATH, JSON.stringify(sequences));   // ← BUG FUSE ici
  res.json({ ok: true });
});

app.delete('/api/sequences/:id', (req, res) => {
  const sequences = JSON.parse(fs.readFileSync(SEQ_PATH))
    .filter(s => s.id !== req.params.id);
  fs.writeFileSync(SEQ_PATH, JSON.stringify(sequences));   // ← BUG FUSE ici
  res.json({ ok: true });
});
```

**Après** :

```js
const memoryStore = require('./lib/memoryStore');

app.get('/api/sequences', (req, res) => {
  // Lecture RAM, instantanée
  res.json(memoryStore.getSequences());
});

app.post('/api/sequences', (req, res) => {
  // Mutation RAM, persist débouncée en arrière-plan
  memoryStore.addSequence(req.body);
  res.json({ ok: true });
});

app.put('/api/sequences/:id', (req, res) => {
  try {
    memoryStore.updateSequence(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/sequences/:id', (req, res) => {
  try {
    memoryStore.deleteSequence(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
```

Faire le même refactor pour les routes `/api/config`, `/api/metadata`, `/api/auth`. Repérer **toutes** les occurrences de `fs.writeFile*` et `fs.readFile*` pointant vers le dossier `data/` et les remplacer par des appels store.

**Important** : laisser les `fs.*` pour les médias (uploads images/vidéos) inchangés — ils utilisent l'archi bridge Kotlin existante et créent **toujours de nouveaux fichiers** (donc pas de bug FUSE).

---

## 5. Edge cases à gérer

### 5.1 App crash entre mutation et persist

Si l'app crash dans la fenêtre debounce (800ms) entre une mutation et le persist, les derniers changements sont perdus.

**Mitigation** :
- Debounce court (800ms) → fenêtre de perte courte
- `MAX_DEFER_MS = 5s` → force persist même si mutations continues
- Pour digital signage, l'admin fait des modifs **délibérées** (ajout séquence, modif config) — il sera évident si une modif n'a pas été sauvée (rechargement de la page admin montre l'ancien état)
- **Acceptable** pour ce use case

### 5.2 Toutes les stratégies shell échouent

Si `cp`, `cat >`, `dd`, `r+ ftruncate` échouent toutes :
- Log l'erreur côté Node (`console.error`)
- Notifie l'app via `rn-bridge.channel.send({ type: 'persist-failed', file: name, error: ... })`
- L'app peut afficher un toast côté admin web (via Socket.IO ou polling) : "Sauvegarde échouée, contactez le support"
- Les données restent en RAM et seront retentées au prochain `schedule()`

### 5.3 Première installation (fichier n'existe pas)

Au tout premier boot, les JSON n'existent pas dans `/Documents/tv-viewer/data/`. Le `init()` du store retourne les valeurs par défaut. Le premier `persist()` crée des fichiers neufs (pas de bug FUSE possible sur création).

### 5.4 Fichier JSON corrompu

Si un fichier existe mais est corrompu (JSON invalide), `_loadJson` retourne la valeur par défaut et log une erreur. Le prochain persist écrasera le fichier corrompu. **Risque** : perte du fichier corrompu — acceptable car il était inutilisable de toute façon.

Pour une vraie robustesse, optionnellement : copier le fichier corrompu en `<name>.corrupted-<timestamp>.json` avant écrasement, via shell `cp`. À ajouter si demandé.

### 5.5 Concurrent persist sur même fichier

Géré par `inFlight` Map dans `persistQueue` : si un write est en cours pour `sequences.json` et qu'une nouvelle mutation arrive, on attend la fin du write en cours puis on re-schedule.

### 5.6 Stratégie mémoïsée devient invalide

Si `cp` marchait au boot mais commence à échouer (changement d'état FUSE bizarre), le code cascade automatiquement vers les autres stratégies à la prochaine erreur, et la nouvelle stratégie devient mémoïsée.

---

## 6. Plan de migration

### 6.1 Avant le refactor

Faire un backup ADB des JSON actuels :

```bash
adb pull /storage/emulated/0/Documents/tv-viewer/data ./backup-before-refactor
```

### 6.2 Ordre d'implémentation

1. Créer les 3 nouveaux fichiers : `memoryStore.js`, `shellPersist.js`, `persistQueue.js`
2. Ajouter l'init du store dans `server/main.js` au bon moment du boot
3. Refactor les routes une par une (`/api/sequences` en premier, c'est celle qui pète actuellement)
4. Tester chaque route refactor avant de passer à la suivante
5. Refactor `/api/config`, `/api/metadata`, `/api/auth`
6. Faire un audit final : `grep -r "fs.writeFile\|fs.appendFile" server/` → ne doit retourner QUE les routes médias (uploads)

### 6.3 Compatibilité descendante

Les **routes HTTP gardent la même signature** (mêmes URLs, mêmes payloads, mêmes réponses). L'admin web n'a **aucune** modification à recevoir. Le refactor est totalement interne au serveur Node.

---

## 7. Tests de validation

L'agent doit valider chaque point après implémentation :

1. ✅ **Boot** : `adb logcat | grep "PersistQueue\|MemoryStore"` montre l'init sans erreur
2. ✅ **Read RAM** : `curl http://localhost:3000/api/sequences` retourne les sequences chargées
3. ✅ **Write simple** : `curl -X POST -d '{...}' /api/sequences` → réponse OK, après ~1s `cat /storage/emulated/0/Documents/tv-viewer/data/sequences.json` montre la nouvelle séquence
4. ✅ **Write multiple rapide** : 10 `POST` en rafale → un seul write disque (debounce), fichier final contient les 10 séquences
5. ✅ **Stratégie cp** : log montre `via cp` pour les premiers writes (cp marche → mémoïsé)
6. ✅ **Fallback** : modifier temporairement le code pour faire échouer `cp` exprès → cascade vers `cat_redirect` → log montre `via cat_redirect`
7. ✅ **Persistance après reboot** : modifs faites avant reboot toujours présentes après reboot
8. ✅ **Pas de régression médias** : upload d'image fonctionne toujours via la route existante (qui passe par Kotlin bridge, pas touchée)
9. ✅ **Crash resilient** : `kill -9` du process Node en plein milieu de mutations → relancer → les mutations *avant* le dernier persist sont là, celles d'après sont perdues (attendu)
10. ✅ **Diagnostic** : ajouter une route `GET /api/_diagnostic` qui retourne `shellPersist.getDiagnostic()` → renvoie les stratégies utilisées par fichier

---

## 8. Logs à mettre en place

Pour faciliter le support en cas de problème sur d'autres box :

```js
// Au boot
console.log('[Store] Loaded:', {
  sequences: state.sequences.length,
  metadataItems: state.metadata.length,
  configKeys: Object.keys(state.config).length,
});

// À chaque persist
console.log(`[Persist] ${name}.json via ${strategy} (${size} bytes, ${duration}ms)`);

// En cas d'échec
console.error(`[Persist] FAILED ${name}.json — strategies tried: ${strategies.join(', ')}`);
```

Ces logs remontent via `rn-bridge` côté RN puis dans logcat. Crucial pour debug terrain.

---

## 9. Ce qui reste hors-scope

- **Médias** : uploads d'images/vidéos restent gérés par l'archi bridge Kotlin existante (création de nouveaux fichiers, pas de bug FUSE)
- **Admin React/Vite** : aucune modif côté admin web
- **Permission MANAGE_EXTERNAL_STORAGE** : déjà gérée, pas touchée
- **`StoragePermissionModule.kt`** : pas touché — ce module gère encore les écritures pour les médias
- **Auth/sessions** : si le système d'auth utilise `auth.json`, il bénéficie automatiquement du refactor

---

## 10. Livrable attendu

À la fin, l'agent doit présenter :

1. La liste des fichiers créés/modifiés
2. Le résultat des 10 tests de validation
3. Le contenu de `/api/_diagnostic` après quelques heures d'usage (montre quelles stratégies fonctionnent sur cette box)
4. Tout point qui a dévié de cette mission, avec justification
