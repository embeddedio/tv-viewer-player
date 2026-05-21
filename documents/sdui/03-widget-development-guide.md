# 03 — Guide de Developpement Widget

Ce guide explique comment creer un nouveau widget de A a Z : du prototype React Native au deploiement dans l'app TV Viewer.

---

## 1. Prerequisites

- Connaissance de base de React Native (View, Text, Image, StyleSheet)
- Comprendre le systeme de flex layout
- Avoir lu `01-architecture-guide.md` et `02-json-schema-reference.md`
- Acces a une app React Native de developpement pour prototyper

---

## 2. Etape 1 — Definir l'API de donnees

Si le widget affiche des donnees dynamiques, creez d'abord la route API dans le serveur Node.js.

### Emplacement

Fichier : `server/server.js`

La route doit etre placee **avant** le bloc d'authentification (avant la ligne `if (!requireAuth(req))`), car l'app React Native n'envoie pas de cookie de session.

### Pattern

```js
if (req.method === 'GET' && pathname === '/api/widgets/mon-widget') {
  const data = getMonWidgetData(); // votre logique
  return sendJson(res, {
    items: data.items,
    updatedAt: new Date().toISOString(),
    stale: false,
  });
}
```

### Convention de reponse

```json
{
  "items": [ ... ],          // ou "rates", "messages", etc.
  "updatedAt": "ISO string", // date de derniere mise a jour
  "stale": false              // true si les donnees sont potentiellement obsoletes
}
```

### Si le widget est statique

Pas de route API necessaire. Le `ui.json` n'aura pas de `dataSource`.

---

## 3. Etape 2 — Prototyper en React Native

Creez un composant `.tsx` dans une app de developpement. Ce composant servira de reference pour la conversion en JSON.

### Regles a respecter

**Utilisez UNIQUEMENT ces composants :**
- `View` — conteneur
- `Text` — texte
- `Image` — image
- `Animated.View` — animation
- `ScrollView` — scroll
- `VideoView` (expo-video) — video

**NE PAS utiliser :**
- `FlatList` (utilisez `.map()` a la place, le moteur SDUI convertira)
- `TouchableOpacity` ou tout composant interactif (affichage TV = pas de touch)
- Composants tiers (pas de `react-native-svg`, `react-native-reanimated`, etc.)
- `useContext`, `useReducer`, ou state complexe
- Imports externes ou CDN

### Pattern de code recommande

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, Animated } from "react-native";

const BASE_URL = "http://127.0.0.1:3000";

interface Rate {
  code: string;
  label: string;
  unit: string;
  buy: string;
  sell: string;
}

export default function MonWidget() {
  const [data, setData] = useState<Rate[]>([]);
  const [logo, setLogo] = useState<{ url: string } | null>(null);

  const fetchData = useCallback(() => {
    fetch(`${BASE_URL}/api/widgets/mon-widget`)
      .then(r => r.json())
      .then(d => setData(d.rates || []))
      .catch(() => {});
  }, []);

  const fetchLogo = useCallback(() => {
    fetch(`${BASE_URL}/logo/info`)
      .then(r => r.json())
      .then(d => setLogo(d.logo))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    fetchLogo();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, fetchLogo]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {logo?.url && (
          <Image
            source={{ uri: `${BASE_URL}${logo.url}` }}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={styles.title}>Mon Widget</Text>
      </View>

      {/* Table */}
      <ScrollView style={styles.tableBody}>
        {data.map((item, index) => (
          <View
            key={item.code}
            style={[styles.row, { backgroundColor: index % 2 === 0 ? "#fff" : "#f4f6fb" }]}
          >
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.buy}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#edf1f7" },
  header: { height: "20%", backgroundColor: "#152238", flexDirection: "row", alignItems: "center", padding: 16 },
  logo: { width: 60, height: 60 },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginLeft: 16 },
  tableBody: { flex: 1 },
  row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#dde4f0" },
  label: { flex: 1, fontSize: 15, color: "#112033" },
  value: { width: 80, textAlign: "right", fontSize: 17, fontWeight: "800", color: "#c0392b" },
});
```

### Points importants

1. **Tous les styles sont inline ou dans StyleSheet** — pas de classes CSS
2. **Les couleurs sont en hex** — pas de `rgb()`, `hsl()`, ou variables CSS
3. **Les tailles sont en nombres** — pas de `clamp()`, `vw`, `vh`
4. **Les images ont `width` et `height` explicites**
5. **Le fetch utilise des chemins relatifs** (pas de domaine externe)

---

## 4. Etape 3 — Convertir en JSON

Deux options :

### Option A : Demander a l'IA

Fournir le fichier `.tsx` complet a Claude (ou un autre LLM) avec cette instruction :

> "Convertis ce composant React Native en fichier ui.json SDUI selon la specification du projet TV Viewer. Voir le document 07-ai-conversion-tutorial.md pour les regles de conversion."

L'IA generera le `ui.json` correspondant.

### Option B : Conversion manuelle

Suivre les regles de `07-ai-conversion-tutorial.md` pour mapper chaque element JSX vers un noeud JSON.

---

## 5. Etape 4 — Deployer

### 5.1 Creer la structure du widget

```
server/widgets/mon-widget/
  widget.json     # Metadonnees
  ui.json         # Definition SDUI
  assets/         # Images (optionnel)
```

### 5.2 Creer `widget.json`

```json
{
  "label": "Mon Widget",
  "description": "Description courte",
  "apiEndpoint": "/api/widgets/mon-widget",
  "refreshMs": 30000,
  "params": ["logoWidth", "headerHeight"]
}
```

### 5.3 Placer `ui.json`

Le fichier genere a l'etape 3.

### 5.4 Synchroniser et rebuild

```bash
yarn sync:server    # Copie server/ vers nodejs-assets/
yarn android        # Build et install sur Android TV
```

---

## 6. Etape 5 — Tester

### 6.1 Verifier la route API

```bash
curl http://192.168.1.108:3000/api/widgets/mon-widget
```

Doit retourner les donnees formatees.

### 6.2 Verifier le listing

```bash
curl http://192.168.1.108:3000/api/widgets
```

Doit inclure votre widget avec son `label`.

### 6.3 Verifier le ui.json

```bash
curl http://192.168.1.108:3000/widgets/mon-widget/ui.json
```

Doit retourner le JSON valide.

### 6.4 Creer une sequence avec le widget

Dans l'admin UI :
1. Page Planification → Nouvelle sequence
2. Ajouter un element Widget → Choisir "Mon Widget"
3. Enregistrer

### 6.5 Verifier l'affichage

L'app doit afficher le widget nativement. Verifier :
- Les donnees s'affichent correctement
- Le rafraichissement fonctionne (toutes les 30s)
- Le logo s'affiche
- Les couleurs sont correctes
- Le texte ne deborde pas

### 6.6 Tester le fallback

Renommer `ui.json` en `ui.json.bak`. L'app doit basculer sur le fallback WebView (si `index.html` existe).

---

## 7. Contraintes de design

### 7.1 Tailles responsives

L'app tourne sur differentes tailles d'ecran TV (720p, 1080p, 4K). Utiliser :
- `flex` pour les proportions
- `%` pour les tailles relatives
- Eviter les tailles fixes en pixels pour les conteneurs principaux
- Les tailles fixes sont OK pour les petits elements (icones, padding)

### 7.2 Couleurs

Toujours en **hexadecimal** : `"#ffffff"`, `"#c0392b"`, etc.
Pas de `rgb()`, `rgba()`, `hsl()`, ou noms CSS.

Exception : `"rgba(255,255,255,0.7)"` est accepte pour l'opacite.

### 7.3 Polices

Systeme uniquement. Pas de polices personnalisees. Utiliser :
- `fontWeight`: `"400"` (normal), `"600"` (semi-bold), `"700"` (bold), `"800"` (extra-bold)
- `fontSize`: minimum recommande `13` pour la lisibilite sur TV

### 7.4 Images

- Servies depuis `$env.baseUrl` uniquement (pas de CDN externe)
- `width` et `height` obligatoires
- Formats supportes : PNG, JPG, WEBP
- Placer les images statiques dans `assets/`

### 7.5 Animations

- Uniquement les proprietes compatibles `useNativeDriver: true` :
  - `opacity`, `translateX`, `translateY`, `scale`, `rotate`
- Pas d'animation sur `width`, `height`, `backgroundColor`, etc.

### 7.6 Pas d'interactivite

L'affichage TV n'a pas de touch/click. Ne pas utiliser de boutons, liens, ou elements interactifs.

---

## 8. Arbre de decision

```
Le widget a besoin de donnees dynamiques ?
  ├─ OUI → Creer une route API dans server.js
  │         Definir dataSource dans ui.json
  └─ NON → Pas de dataSource (widget statique)

Le widget affiche une liste de donnees ?
  ├─ OUI → Utiliser flat-list avec template
  └─ NON → Structure fixe avec view/text/image

Le widget a du contenu qui defile ?
  ├─ OUI → Utiliser animated-view avec animation loop
  └─ NON → Pas d'animation

Le widget depasse la zone visible ?
  ├─ OUI → Envelopper dans scroll-view
  └─ NON → Pas de scroll
```
