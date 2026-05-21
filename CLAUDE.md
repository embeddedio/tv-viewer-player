# CLAUDE.md — tv-viewer-player

Player Android TV **sans widgets hardcodés**. Les widgets sont découverts et chargés dynamiquement depuis le stockage externe (`Documents/tv-viewer/widgets/`).

Voir `guide_app.md` pour l'architecture complète (SDUI, widgets autonomes, communication bridge).

## Rôle de ce projet

- **Ce projet** : APK installé sur les boîtiers TV. Affiche les layouts, gère les médias, expose l'admin UI. Ne contient aucun code widget-spécifique.
- **tv-viewer-dev2** : Développement et export des widgets. Les widgets exportés sont copiés dans `Documents/tv-viewer/widgets/` via ADB.

## Règle fondamentale

**Le serveur est neutre.** Il ne contient aucun code widget-spécifique.
Chaque widget est autonome : `manifest.json`, `ui.json`, `settings.html`, `api.js`.
Le serveur découvre les widgets depuis le stockage externe au démarrage.

## Comment les widgets arrivent

```
tv-viewer-dev2 (dev)
  → yarn export → widget.zip
  → ADB push → /sdcard/Documents/tv-viewer/widgets/{type}/
    → manifest.json    (déclaration)
    → ui.json          (composants RN sérialisés)
    → settings.html    (page de configuration)
    → api.js           (données/scraping)
```

## Architecture de discovery

```
App.tsx
  → StorageModule.initFolder("tv-viewer") → chemin Documents
  → bridge.send({ type: 'storage-path', path })

server.js
  → reçoit storage-path
  → widgetsStoragePath = path + '/widgets'
  → scanne widgets/* pour manifest.json → liste
  → charge api.js de chaque widget → routes dynamiques

NativeWidgetRenderer
  → fetch ${baseUrl}/widgets/{type}/ui.json
  → render natif (renderNode via componentRegistry)
  → fallback → WidgetWebView si ui.json absent
```

## Stack technique

- **React Native** : `react-native-tvos` (fork TV)
- **Serveur embarqué** : `nodejs-mobile-react-native` (Node.js dans l'APK, port 3000)
- **`newArchEnabled=false`** obligatoire
- **Expo Go ne fonctionne pas** — build natif complet (`yarn android`)

## Commandes

```bash
yarn install          # Une seule fois
yarn start            # Metro bundler (rechargement à chaud JS)
yarn sync:server      # Rebuild admin UI + copie server/ → nodejs-assets/
yarn android          # Build APK + installe sur le boîtier (~5 min)
```

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `components/ZoneContent.tsx` | Rendu des zones — utilise NativeWidgetRenderer + WidgetWebView fallback |
| `components/sdui/NativeWidgetRenderer.tsx` | Rendu générique depuis ui.json |
| `components/sdui/componentRegistry.tsx` | Map type JSON → composant RN |
| `components/WidgetWebView.tsx` | Fallback WebView si pas de ui.json |
| `server/server.js` | Serveur HTTP, discovery depuis Documents, routes dynamiques |
| `server/lib/sequences.js` | CRUD séquences |
| `server/lib/scheduler.js` | Séquence active selon horaire |
| `server/lib/config.js` | Config app (orientation, ticker, widgetStyles) |

## Routes API widgets (génériques)

| Route | Description |
|-------|-------------|
| `GET /api/widgets` | Liste des widgets découverts depuis Documents |
| `GET /widgets/{type}/ui.json` | Sert ui.json depuis Documents |
| `GET /widgets/{type}/settings.html` | Sert la page de settings depuis Documents |
| `GET /api/widgets/{type}/...` | Routes dynamiques chargées depuis api.js du widget |
| `GET /api/widgets/{type}/style` | Style sauvegardé en config |
| `POST /api/widgets/{type}/style` | Sauvegarde style + bridge widget-update |
