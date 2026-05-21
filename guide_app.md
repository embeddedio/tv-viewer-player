# Guide Architecture — TV Viewer Dev2
## Document de référence — à lire avant tout travail sur le projet

---

## 1. Vue d'ensemble

**TV Viewer** est une application Android TV pour bureaux de change au Maroc. Elle affiche des zones de contenu programmées (tableaux de taux, sliders d'images/vidéos, menus, etc.) selon un planning configurable depuis une interface admin web.

L'application est composée de **deux processus distincts qui cohabitent dans le même APK** :

| Processus | Technologie | Rôle |
|-----------|-------------|------|
| App React Native | `react-native-tvos` | Affichage à l'écran TV |
| Serveur embarqué | `nodejs-mobile-react-native` (port 3000) | Admin web, config, listing widgets |

Ces deux processus communiquent via **HTTP** et **rn-bridge**. Ils partagent également un accès commun au **stockage externe Android** (`Documents/tv-viewer/`).

---

## 2. Stack technique

- **React Native** : `react-native-tvos` (fork TV — pas react-native standard, Expo Go ne fonctionne pas)
- **Serveur embarqué** : `nodejs-mobile-react-native` — Node.js tourne dans l'APK, port 3000
- **`newArchEnabled=false`** obligatoire — incompatible avec la New Architecture
- **Build natif obligatoire** : `yarn android` (~5 min), pas de hot reload pour le serveur
- **Metro** : hot reload JS uniquement pour le code RN (pas le serveur)
- **Zéro dépendance npm côté serveur** : modules Node.js natifs uniquement (http, fs, path, crypto)

---

## 3. Séparation fondamentale des rôles

### RÈGLE ABSOLUE : Le serveur est neutre

Le serveur Node.js **ne contient aucun code ni fichier spécifique à un widget**. Il est générique. Il sait lire des fichiers et servir des routes HTTP — c'est tout.

```
✅ server/lib/        → logique métier générique (auth, config, media, scheduler)
✅ server/views/      → admin UI React (générique, schema-driven)
✅ server/widgets/    → assets statiques servis par HTTP (images, fonts) — PAS de logique widget
❌ server/server.js   → NE DOIT PAS contenir de logique spécifique à un widget
```

### RÈGLE ABSOLUE : Les widgets sont autonomes

Chaque widget **possède tout ce qui le concerne**. Il ne dépend pas du serveur pour son code.

```
✅ Widget possède : ui.json, manifest.json, settings.html, assets
✅ Widget déclare : sa source de données, son intervalle de refresh, ses paramètres
❌ Widget ne doit PAS : appeler le serveur pour son code (seulement pour ses données)
```

---

## 4. Stockage externe — source de vérité des widgets

Les widgets vivent dans le **stockage externe Android**, accessible à la fois par Node.js (via `fs`) et par React Native (via `StorageModule`) :

```
/storage/emulated/0/Documents/tv-viewer/widgets/
  tableau-change/
    manifest.json       ← métadonnées du widget
    ui.json             ← définition UI (arbre JSON SDUI)
    settings.html       ← page de configuration (iframe admin)
    assets/             ← images, fonts spécifiques au widget
  video-slider/
    manifest.json
    ui.json
    settings.html
  restaurant-menu/
    manifest.json
    ui.json
    settings.html
```

**Pourquoi le stockage externe ?**
- Node.js lit directement avec `fs.readFileSync()` — aucun pont nécessaire
- React Native lit via `StorageModule.readFile()` — déjà en place
- **Zéro rebuild APK pour ajouter ou modifier un widget**
- Un widget peut être déployé en déposant simplement ses fichiers dans ce dossier

---

## 5. Anatomie d'un widget

### 5.1 `manifest.json` — Carte d'identité du widget

Lu par **Node.js** au démarrage pour construire la liste des widgets disponibles.

```json
{
  "type": "restaurant-menu",
  "label": "Menu Restaurant",
  "icon": "🍽️",
  "settingsPages": {
    "zone":    "/widgets/restaurant-menu/settings.html",
    "sidebar": "/widgets/restaurant-menu/settings-sidebar.html"
  },
  "dataSource": {
    "url": "/api/widgets/restaurant-menu/data",
    "refreshMs": 300000
  }
}
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `type` | Oui | Identifiant unique (kebab-case) |
| `label` | Oui | Nom affiché dans l'admin |
| `icon` | Oui | Emoji affiché dans la liste |
| `settingsPages.zone` | Non | URL de la page de config (engrenage zone planification) |
| `settingsPages.sidebar` | Non | URL de la page de config (engrenage sidebar) |
| `dataSource.url` | Non | Route API qui fournit les données |
| `dataSource.refreshMs` | Non | Fréquence de refresh des données (défaut : 30 min) |

### 5.2 `ui.json` — Définition UI (système SDUI)

Lu par **React Native** via HTTP. Décrit l'arbre de composants natifs à rendre.

```json
{
  "version": 1,
  "widget": "restaurant-menu",
  "dataSource": {
    "url": "/api/widgets/restaurant-menu/data",
    "refreshMs": 300000,
    "transform": "$response.items"
  },
  "root": {
    "type": "flat-list",
    "style": { "flex": 1 },
    "template": {
      "type": "view",
      "style": { "flexDirection": "row", "padding": 8 },
      "children": [
        { "type": "text", "style": { "flex": 1 }, "children": "$item.nom" },
        { "type": "text", "children": "$item.prix" }
      ]
    }
  }
}
```

**Composants natifs disponibles dans `ui.json` :**

| Type JSON | Composant RN | Usage |
|-----------|-------------|-------|
| `view` | `<View>` | Conteneur flex |
| `text` | `<Text>` | Texte (supporte numberOfLines, ellipsizeMode) |
| `image` | `<Image>` | Image avec URI et resizeMode |
| `animated-view` | `<Animated.View>` | Animations (opacity, translateX/Y, scale) |
| `video` | `<VideoViewWrapper>` | Lecteur vidéo natif (expo-video) |
| `scroll-view` | `<ScrollView>` | Conteneur scrollable |
| `flat-list` | map avec template | Liste data-driven ($item, $index) |
| `spacer` | `<View>` | Espacement fixe |

**Contextes de données disponibles dans les bindings :**

| Contexte | Description |
|----------|-------------|
| `$data` | Résultat de `dataSource` après `transform` |
| `$item` | Élément courant (dans `flat-list`) |
| `$index` | Index courant (dans `flat-list`) |
| `$sources.{nom}` | Sources additionnelles déclarées |
| `$env.baseUrl` | URL de base du serveur (`http://127.0.0.1:3000`) |
| `$props.{key}` | Paramètres passés au widget (variant, fontScale...) |

### 5.3 `settings.html` — Page de configuration

Servie par Node.js, affichée dans un **iframe** dans l'admin React. Page HTML **autonome** (vanilla JS, zéro dépendance) qui :
- Appelle directement les routes API du serveur (`/api/widgets/{type}/style`, etc.)
- Supporte jusqu'à 2 pages : `settings.html` (zone planification) et `settings-sidebar.html` (sidebar)
- Signale la fermeture au parent via `window.parent.postMessage({ type: 'widget-settings-close' }, '*')`

---

## 6. Système SDUI — NativeWidgetRenderer

### Pourquoi SDUI et pas WebView ?

| Critère | WebView HTML | SDUI natif |
|---------|-------------|------------|
| Mémoire | ~50MB par WebView | ~5MB |
| Animations | CSS (non fluides TV) | `Animated` natif |
| Vidéo | `<video>` HTML limité | `expo-video` natif |
| Images | Rendu navigateur | Optimisé RN |
| Déployable sans rebuild | ✅ | ✅ (via ui.json dans Documents) |

### Pipeline de rendu

```
Documents/.../widgets/{type}/ui.json
    ↓ fetch HTTP (via Node.js)
NativeWidgetRenderer
    ↓ parse JSON + résout bindings ($data, $item...)
componentRegistry (renderNode)
    ↓ crée View, Text, Image, Video...
Écran Android TV
```

### Fallback automatique

Si `ui.json` est absent ou invalide → fallback sur WebView HTML (compatibilité ascendante).

```tsx
<NativeWidgetRenderer
  widgetType="mon-widget"
  baseUrl={baseUrl}
  fallback={<WebView source={{ uri: `${baseUrl}/widgets/mon-widget/` }} />}
/>
```

---

## 7. Architecture de communication

### 7.1 Schéma général

```
┌─────────────────────────────────────────────────────────────┐
│                      APK Android                            │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │  React Native    │◄──────►│  Node.js (port 3000)     │  │
│  │  (affichage TV)  │ bridge  │  (admin + config)        │  │
│  └──────────────────┘  HTTP   └──────────────────────────┘  │
│          │                              │                    │
│          └──────────────┬───────────────┘                    │
│                         │ fs / StorageModule                 │
│                         ▼                                    │
│          /storage/emulated/0/Documents/tv-viewer/            │
│          └── widgets/ (manifests, ui.json, settings)         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 HTTP — Communication principale

React Native fetche depuis `http://127.0.0.1:3000` :

| Route | Sens | Usage |
|-------|------|-------|
| `GET /api/widgets` | RN ← Node.js | Liste des widgets découverts |
| `GET /widgets/{type}/ui.json` | RN ← Node.js | Définition UI du widget |
| `GET /api/widgets/{type}/data` | RN ← Node.js | Données dynamiques |
| `GET /api/widgets/{type}/style` | Admin ← Node.js | Style sauvegardé |
| `POST /api/widgets/{type}/style` | Admin → Node.js | Sauvegarder style |
| `GET /widgets/{type}/settings.html` | Admin ← Node.js | Page de config (iframe) |

### 7.3 rn-bridge — Communication push (Node.js → RN)

Pour les événements immédiats (changement de config, nouveau widget...), Node.js **pousse** un message vers RN sans que RN ait à poller.

**Message générique — identique pour tous les widgets :**

```json
{ "type": "widget-update", "widgetType": "restaurant-menu", "scope": "config" }
{ "type": "widget-update", "widgetType": "video-slider",    "scope": "data"   }
{ "type": "widget-update", "widgetType": "tableau-change",  "scope": "all"    }
```

| Scope | Déclencheur | Action RN |
|-------|-------------|-----------|
| `config` | Settings modifiés dans l'admin | Re-fetch `ui.json` + style → re-rend |
| `data` | Données fraîches disponibles | Re-fetch données API → re-rend |
| `all` | Widget mis à jour (nouveau ui.json) | Re-fetch tout → re-rend |

**Côté Node.js (après sauvegarde settings) :**
```js
bridge.channel.send(JSON.stringify({
  type: 'widget-update',
  widgetType: req.params.type,   // générique — aucun widget hardcodé
  scope: 'config'
}));
```

**Côté React Native (écoute universelle) :**
```tsx
// Un seul listener pour tous les widgets
RNBridge.channel.addListener('message', (msg) => {
  const { type, widgetType, scope } = JSON.parse(msg);
  if (type === 'widget-update') {
    refreshWidget(widgetType, scope);  // trouve la zone active + re-fetche
  }
});
```

### 7.4 Refresh périodique des données

Chaque widget déclare son `refreshMs` dans `manifest.json`. Le `NativeWidgetRenderer` gère le polling automatiquement via `setInterval` — sans code spécifique par widget.

### 7.5 Détection de changement de fichier (overrides)

Pour les cas où l'admin écrit directement dans un fichier JSON (overrides de taux), RN poll `StorageModule.readFile()` toutes les 5 secondes et compare le contenu. Si changement → reload.

---

## 8. Rôle de Node.js — Auto-discovery

Au démarrage, Node.js scanne `Documents/tv-viewer/widgets/` et construit dynamiquement la liste des widgets :

```js
// Scan au démarrage — aucun widget hardcodé
const widgets = fs.readdirSync(widgetsDir)
  .filter(entry => fs.statSync(path.join(widgetsDir, entry)).isDirectory())
  .reduce((acc, name) => {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(widgetsDir, name, 'manifest.json'), 'utf8')
      );
      if (manifest.type) acc.push(manifest);
    } catch (_) {}
    return acc;
  }, []);
```

Node.js sert les fichiers widget via :
```
GET /widgets/{type}/ui.json       → fs.createReadStream depuis Documents
GET /widgets/{type}/settings.html → fs.createReadStream depuis Documents
GET /api/widgets                  → JSON.stringify(widgets)
```

---

## 9. Rôle de React Native — Rendu

React Native **ne contient aucun composant spécifique à un widget** (hormis les widgets legacy existants). Un seul composant générique `NativeWidgetRenderer` gère tous les widgets via SDUI.

**Flux au démarrage :**
1. App démarre → Node.js démarre
2. App fetche `GET /api/widgets` → reçoit la liste
3. Scheduler charge la séquence active
4. Pour chaque zone widget → `NativeWidgetRenderer` fetche `ui.json` + données
5. Rendu natif à l'écran

**Flux lors d'un changement de config :**
1. Admin ouvre `settings.html` (iframe)
2. Admin modifie → POST `/api/widgets/{type}/style`
3. Node.js sauvegarde → envoie `widget-update` via bridge
4. RN re-fetche config → `NativeWidgetRenderer` re-rend

---

## 10. Admin UI — Interface de configuration

L'interface admin est une SPA React (Vite + Tailwind) servie par Node.js sur port 3000. Elle est **générique** — elle ne connaît pas les widgets.

**Engrenage zone planification :**
1. Clic sur ⚙ → admin fetche `/widgets/{type}/manifest.json`
2. `manifest.settingsPages.zone` existe → ouvre un iframe vers l'URL déclarée
3. La page `settings.html` du widget gère tout (tabs, formulaires, API calls)
4. Fermeture via `postMessage({ type: 'widget-settings-close' })`

**Engrenage sidebar :**
Même principe avec `manifest.settingsPages.sidebar`.

**Si pas de settingsPages → fallback** : affichage d'un StyleTab générique schema-driven (lit `/widget-schemas/{type}.json`).

---

## 11. Ajouter un nouveau widget — Procédure complète

### Ce qu'il faut créer (zéro modification de l'APK) :

```
Documents/tv-viewer/widgets/mon-widget/
  manifest.json    ← obligatoire
  ui.json          ← obligatoire
  settings.html    ← si le widget a des paramètres configurables
  assets/          ← optionnel
```

### Étape 1 — `manifest.json`

```json
{
  "type": "mon-widget",
  "label": "Mon Widget",
  "icon": "📊",
  "settingsPages": {
    "zone": "/widgets/mon-widget/settings.html"
  },
  "dataSource": {
    "url": "/api/widgets/mon-widget/data",
    "refreshMs": 60000
  }
}
```

### Étape 2 — `ui.json`

Décrire l'UI comme un arbre de composants natifs. Utiliser `$data` pour les bindings dynamiques.

```json
{
  "version": 1,
  "widget": "mon-widget",
  "dataSource": {
    "url": "/api/widgets/mon-widget/data",
    "refreshMs": 60000,
    "transform": "$response.items"
  },
  "root": {
    "type": "view",
    "style": { "flex": 1, "backgroundColor": "#000" },
    "children": [
      {
        "type": "flat-list",
        "template": {
          "type": "text",
          "style": { "color": "#fff", "fontSize": 24 },
          "children": "$item.label"
        }
      }
    ]
  }
}
```

### Étape 3 — Route API dans `server/server.js` (si données dynamiques)

```js
if (req.method === 'GET' && pathname === '/api/widgets/mon-widget/data') {
  return sendJson(res, { items: [{ label: 'exemple', valeur: '1,23' }] });
}
```

### Étape 4 — `settings.html` (si configurable)

Page HTML autonome avec tabs, formulaires, appels API directs. Fermeture via `postMessage`.

### Étape 5 — Déployer sur le boîtier

Le widget développé doit être copié dans le stockage externe du boîtier Android TV. Trois méthodes :

**En développement (via ADB) :**
```bash
# Pousser un widget spécifique
adb push widgets/MonWidget/ /storage/emulated/0/Documents/tv-viewer/widgets/mon-widget/

# Ou via le script dédié du projet
yarn export mon-widget      # scripts/export-widget.js
yarn export:all             # scripts/export-all.js — pousse tous les widgets
```

**En production (via l'admin UI) :**
- Uploader un ZIP contenant le dossier widget via l'interface admin
- Node.js décompresse automatiquement dans `Documents/tv-viewer/widgets/`
- Le widget est immédiatement disponible sans aucun rebuild

**Flux complet résumé :**
```
Développement                Export               Runtime boîtier
─────────────                ──────               ───────────────
widgets/MonWidget/           adb push /           Documents/tv-viewer/
  manifest.json       →→→   yarn export   →→→    widgets/mon-widget/
  ui.json                   ou ZIP admin           manifest.json
  settings.html                                    ui.json
                                                   settings.html
                                                        ↓
                                                   Node.js découvre
                                                   RN rend nativement
```

### Résultat

- Node.js découvre le widget au démarrage (scan automatique)
- Admin voit le widget dans la liste → peut l'ajouter à une séquence
- RN fetche `ui.json` → rend nativement
- **Zéro rebuild APK**

---

## 12. Contraintes importantes

| Contrainte | Raison |
|------------|--------|
| `newArchEnabled=false` | `nodejs-mobile-react-native` utilise l'ancien bridge RN |
| Serveur sans npm | Modules Node.js natifs uniquement sur Android |
| `react-native-tvos` | Fork TV — pas react-native standard |
| `StyleSheet.create()` pour % | Les inline `{ width: '10%' }` causent TS2769 |
| **Ne jamais lancer `yarn android` ou `yarn sync:server` automatiquement** | L'utilisateur décide quand builder |
| **Ne jamais faire `git commit` automatiquement** | L'utilisateur décide quand committer |
| **`server/` ne contient pas de fichiers widget** | Le serveur est neutre |
| **Les widgets vivent dans le stockage externe** | Déployable sans rebuild |

---

## 13. Fichiers clés du projet

| Fichier | Rôle |
|---------|------|
| `components/WidgetRenderer.tsx` | Registre widgetType → composant (widgets legacy) |
| `components/ZoneContent.tsx` | Rendu des zones (playlist / ticker / widget / logo) |
| `components/sdui/NativeWidgetRenderer.tsx` | Rendu générique SDUI depuis ui.json |
| `components/sdui/componentRegistry.tsx` | Map type JSON → composant React Native |
| `components/sdui/resolveBindings.ts` | Résolution des expressions ($data, $item...) |
| `server/server.js` | Serveur HTTP, routes, auto-discovery widgets |
| `server/lib/config.js` | Cache mémoire + sync JSON config |
| `server/lib/sequences.js` | CRUD séquences (planning affichage) |
| `server/lib/scheduler.js` | `resolveActiveDisplay()` — séquence active |
| `server/lib/auth.js` | Sessions HMAC-SHA256 |
| `server/views/src/pages/Planification/WidgetSettingsModal.jsx` | Modal settings (iframe ou fallback) |
| `shared/types.ts` | Interfaces TypeScript partagées |
| `widgets/TableauChange/` | Widget legacy (RN natif, en cours de migration SDUI) |

---

## 14. Commandes

```bash
yarn start            # Metro bundler — hot reload JS/RN uniquement
yarn sync:server      # Rebuild admin UI + copie server/ → nodejs-assets/
yarn android          # Build APK + installe sur le boitier (~5 min)
```

**Quand rebuilder :**
- Modif `server/` → `yarn sync:server && yarn android`
- Modif composants RN uniquement → `yarn start` suffit
- Ajout/modif widget (ui.json, manifest.json) → dépôt direct dans Documents, **pas de rebuild**

---

## 15. Vision long terme

L'objectif final est qu'**aucun code natif ne soit nécessaire pour ajouter un widget**. Cycle de vie complet d'un widget :

```
┌─────────────────────────────────────────────────────────────┐
│                  CYCLE DE VIE D'UN WIDGET                   │
│                                                             │
│  1. DÉVELOPPEMENT                                           │
│     Créer MonWidget.tsx (React Native natif)                │
│     OU écrire directement ui.json + manifest.json           │
│                  ↓                                          │
│  2. CONVERSION (si TSX → JSON)                              │
│     IA (Claude) convertit le composant TSX en ui.json       │
│     selon le schéma SDUI                                    │
│                  ↓                                          │
│  3. EXPORT                                                  │
│     yarn export mon-widget   (ADB push)                     │
│     OU upload ZIP via admin UI                              │
│                  ↓                                          │
│  4. STOCKAGE EXTERNE                                        │
│     Documents/tv-viewer/widgets/mon-widget/                 │
│       manifest.json  ui.json  settings.html                 │
│                  ↓                                          │
│  5. DÉCOUVERTE AUTOMATIQUE                                  │
│     Node.js scanne au démarrage → liste widgets             │
│     Admin voit le widget → peut le planifier                │
│                  ↓                                          │
│  6. AFFICHAGE                                               │
│     NativeWidgetRenderer fetche ui.json                     │
│     Rend nativement avec composants RN (View, Image, Video) │
│                  ↓                                          │
│  7. MISE À JOUR (sans rebuild APK)                          │
│     Re-export les fichiers modifiés → écrase dans Documents │
│     bridge envoie widget-update → RN re-rend               │
└─────────────────────────────────────────────────────────────┘
```

**Les widgets sont des plugins** — l'APK est le moteur, les widgets sont les modules. On ne rebuilde jamais l'APK pour ajouter ou modifier un widget.

Les widgets legacy (TableauChange, TickerDevises) seront progressivement migrés vers ce système SDUI. Le fallback WebView garantit la compatibilité pendant la transition.
