# tv-viewer-dev — Environnement de développement de widgets

Application Android TV pour **bureaux de change au Maroc**.  
Ce projet sert à développer et tester les widgets visuellement avec de vraies données scrapées, avant de les exporter vers l'app de production (`tv-viewer-app`).

---

## Vue d'ensemble

```
Boitier Android TV
├── React Native (react-native-tvos)    ← Affichage des widgets
└── Node.js embarqué (port 3000)        ← Serveur HTTP + scraping des taux
```

Les deux tournent **sur le même boitier**. React Native parle au serveur via `http://127.0.0.1:3000`.

---

## Architecture des widgets

### Principe : chaque widget est autonome

Un widget gère lui-même :
- Son propre `fetch` vers le serveur
- Son état de chargement
- Son rendu visuel

Pas de système centralisé de fetch — le composant fait tout.

### Fichiers impliqués

```
widgets/
└── MonWidget.tsx              ← Composant React Native (créer ici)

components/
└── WidgetRenderer.tsx         ← Registre statique (modifier ici)

server/
└── server.js                  ← Routes + liste des widgets (modifier ici)
```

---

## Ajouter un nouveau widget

### 3 modifications, 1 nouveau fichier

**Étape 1 — Créer le composant** `widgets/MonWidget.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function MonWidget({ baseUrl }: { baseUrl: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetch(`${baseUrl}/api/widgets/mon-widget`)
        .then(r => r.json())
        .then(res => { setData(res.rates || []); setLoading(false); })
        .catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30_000); // refresh toutes les 30s
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (loading) {
    return <ActivityIndicator color="#fff" style={{ flex: 1 }} />;
  }

  return (
    <View style={s.root}>
      {data.map((item, i) => (
        <Text key={i} style={s.row}>{item.label}: {item.value}</Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  row:  { color: '#fff', fontSize: 18, padding: 8 },
});
```

---

**Étape 2 — Enregistrer dans** `components/WidgetRenderer.tsx`

```tsx
// Ajouter l'import
import MonWidget from '../widgets/MonWidget';

// Ajouter dans WIDGETS
const WIDGETS = {
  'mon-widget': MonWidget,
};
```

---

**Étape 3 — Ajouter dans** `server/server.js`

```js
// Dans REGISTERED_WIDGETS (en haut du fichier) :
const REGISTERED_WIDGETS = [
  { type: 'mon-widget', label: 'Mon Widget', icon: '📊' },
];

// Ajouter la route de données :
if (req.method === 'GET' && pathname === '/api/widgets/mon-widget') {
  return sendJson(res, { rates: [...] });
}
```

---

**Résultat :** le widget apparaît automatiquement dans l'admin UI (onglet Widgets de la Planification).

---

## Widgets disponibles

| Widget | Type | Description |
|--------|------|-------------|
| *(aucun pour l'instant)* | — | — |

*Mettre à jour ce tableau quand un widget est ajouté.*

---

## Données disponibles côté serveur

Les librairies de scraping sont déjà présentes dans `server/lib/` :

| Fichier | Données | Source |
|---------|---------|--------|
| `widget-tableau-change.js` | Taux de change billets | bestchangetanger.com (scraping toutes les 30 min) |
| `widget-bkam.js` | Taux de référence officiels | bkam.ma (Bank Al-Maghrib) |

Pour les utiliser dans une route :
```js
const { getTableauChangeData, refreshTableauChange } = require('./lib/widget-tableau-change');
const { getBkamData, refreshBkam } = require('./lib/widget-bkam');
```

Structure retournée par `getTableauChangeData()` :
```json
{
  "rates": [
    { "code": "USD", "label": "Dollar US", "unit": "1", "buy": "10,05", "sell": "10,20", "icon": "..." }
  ],
  "updatedAt": 1712345678000,
  "stale": false
}
```

Structure retournée par `getBkamData()` :
```json
{
  "rates": [
    { "code": "USD", "label": "Dollar US", "unit": "1", "bkamReference": "9,85", "bkamTpe": "9,36", "icon": "..." }
  ],
  "updatedAt": 1712345678000
}
```

---

## Commandes

```bash
# Installer les dépendances (une seule fois)
yarn install

# Premier build natif sur le boitier Android TV
yarn prebuild:tv     # Regénère android/ (si nécessaire)
yarn android         # Build + installe sur le boitier (~5 min)

# Développement quotidien (après le premier yarn android)
yarn start           # Lance Metro bundler — rechargement à chaud JS

# Après modification de server/ (Node.js)
yarn sync:server     # Rebuild admin UI + copie server/ → nodejs-assets/
yarn android         # Rebuild APK nécessaire (le serveur est embarqué dans l'APK)
```

> **Important :** `yarn start` rechargement à chaud pour le JS React Native.
> Mais le serveur Node.js est embarqué dans l'APK — toute modification de `server/`
> nécessite `yarn sync:server && yarn android`.

---

## Flux de données complet

```
bestchangetanger.com
        ↓ scraping (toutes les 30 min)
server/lib/widget-tableau-change.js  ← stocke en mémoire
        ↓
server/server.js  GET /api/widgets/tableau-change
        ↓ HTTP 127.0.0.1:3000
widgets/TableauChange.tsx  useEffect → fetch → setData
        ↓
Rendu React Native sur l'écran TV
```

---

## Structure du projet

```
affichage4/tv-viewer-dev/
│
├── App.tsx                        ← Point d'entrée, démarre le serveur Node.js
├── layouts.ts                     ← Templates de layout (fullscreen, 2-col, etc.)
│
├── widgets/                       ← Composants widget (créer ici)
│   └── README.md
│
├── components/
│   ├── WidgetRenderer.tsx         ← Registre des widgets (modifier ici)
│   ├── ZoneContent.tsx            ← Rendu des zones (playlist, ticker, widget)
│   ├── LayoutRenderer.tsx         ← Rendu multi-zones
│   ├── FullscreenPlaylist.tsx     ← Lecteur media (images/vidéos)
│   ├── TickerMarquee.tsx          ← Ticker défilant
│   ├── CurrencyTickerBand.tsx     ← Bande devises
│   ├── MessageMarquee.tsx         ← Messages défilants
│   └── sdui/                      ← Moteur SDUI (export prod — ne pas toucher)
│
├── server/
│   ├── server.js                  ← Serveur HTTP + routes + REGISTERED_WIDGETS
│   ├── lib/
│   │   ├── widget-tableau-change.js  ← Scraping BestChange
│   │   ├── widget-bkam.js            ← Scraping BKAM
│   │   ├── sequences.js              ← Gestion des séquences d'affichage
│   │   ├── config.js                 ← Config persistante
│   │   ├── bridge.js                 ← Communication Node.js ↔ React Native
│   │   └── ...
│   ├── views/                     ← Admin UI (React + Vite + Tailwind)
│   └── widgets/                   ← (vide — assets widget si nécessaire)
│
├── hooks/
│   ├── useScheduler.ts            ← Fetch et résolution des séquences actives
│   └── useTvSchedule.ts
│
├── scheduler/
│   └── resolveSequence.ts         ← Logique temporelle (quelle séquence afficher)
│
├── shared/
│   ├── types.ts                   ← Interfaces TypeScript (ExchangeRate, BkamRate...)
│   └── colors.ts                  ← Palette de couleurs partagée
│
└── nodejs-assets/                 ← Miroir de server/ (généré par yarn sync:server)
    └── nodejs-project/            ← NE PAS MODIFIER DIRECTEMENT
```

---

## Admin UI (interface web)

Accessible sur `http://<IP-du-boitier>:3000` depuis n'importe quel navigateur sur le réseau.

| Page | URL | Rôle |
|------|-----|------|
| Dashboard | `#/` | Aperçu live des zones |
| Planification | `#/planification` | Créer/éditer les séquences d'affichage |
| Médias | `#/medias` | Upload images/vidéos/audio |
| Configuration | `#/configuration` | Orientation, logo, mot de passe |

**Workflow admin :**
1. Aller dans **Planification** → créer une séquence
2. Dans la sidebar droite, onglet **Widgets** → cliquer **+** sur le widget voulu
3. Cliquer **Enregistrer** → le boitier met à jour l'affichage immédiatement

---

## Contraintes techniques importantes

| Contrainte | Raison |
|------------|--------|
| `newArchEnabled=false` | `nodejs-mobile-react-native` utilise l'ancien bridge RN, incompatible avec la New Architecture |
| `react-native-tvos` | Fork TV de React Native — pas React Native standard |
| Serveur sans `npm install` | Le serveur Node.js n'a pas accès à npm sur Android — uniquement les modules natifs Node.js (`http`, `fs`, `path`, `https`, `crypto`) |
| `yarn android` obligatoire après `server/` | Le serveur est embarqué dans l'APK, pas servi à chaud par Metro |
| Expo Go ne fonctionne pas | `nodejs-mobile-react-native` est un module natif — build complète obligatoire |
