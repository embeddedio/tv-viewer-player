# 05 — Specification du Data Binding

Ce document decrit comment les noeuds UI du JSON referencent des donnees dynamiques provenant des API, de l'environnement, et du layout.

---

## 1. Contextes de binding

Le moteur SDUI fournit ces contextes lors du rendu :

| Contexte | Disponible | Description |
|----------|------------|-------------|
| `$data` | Partout | Resultat de `dataSource` apres `transform` |
| `$item` | Dans `flat-list` template | Element courant du tableau |
| `$index` | Dans `flat-list` template | Index courant (0-based) |
| `$sources.{nom}` | Partout | Donnees des sources additionnelles |
| `$env` | Partout | Variables d'environnement |
| `$props` | Partout | Parametres du widget (`widgetItem`) |
| `$layout` | Partout (apres 1er rendu) | Dimensions mesurees du conteneur |
| `$computed.{nom}` | Partout | Valeurs calculees |

### 1.1 `$data`

Le resultat du fetch de `dataSource.url`, apres application de `dataSource.transform`.

Exemple : si l'API retourne `{ "rates": [...], "updatedAt": "..." }` et que `transform` est `"$response.rates"`, alors `$data` est le tableau `rates`.

```json
"children": "$data"          // le tableau complet
"children": "$data.length"   // nombre d'elements (ex: 17)
```

### 1.2 `$item` et `$index`

Disponibles uniquement dans le `template` d'un `flat-list`. Representent l'element et l'index courants.

```json
{
  "type": "flat-list",
  "props": {
    "data": "$data",
    "template": {
      "type": "text",
      "children": "$item.label"    // "Dollar US", "Euro", etc.
    }
  }
}
```

`$index` est un nombre : `0`, `1`, `2`, etc.

### 1.3 `$sources.{nom}`

Donnees des sources additionnelles definies dans `additionalSources`.

```json
"additionalSources": {
  "logo": { "url": "/logo/info", "transform": "$response.logo" }
}
```

Acces : `$sources.logo.url`, `$sources.logo.name`.

### 1.4 `$env`

Variables d'environnement injectees par le moteur :

| Variable | Type | Exemple | Description |
|----------|------|---------|-------------|
| `$env.baseUrl` | string | `"http://127.0.0.1:3000"` | URL de base du serveur |
| `$env.date` | string | `"06/04/2026"` | Date courante (format dd/MM/yyyy) |
| `$env.time` | string | `"14:30"` | Heure courante (format HH:mm) |
| `$env.locale` | string | `"fr-FR"` | Locale de l'app |

### 1.5 `$props`

Parametres passes depuis la configuration de zone (`ZoneWidgetItem`). Correspond aux champs `speed`, `fontSize`, `logoWidth`, `headerHeight`, etc.

```json
"style": { "width": "$props.logoWidth || 21" }
```

### 1.6 `$layout`

Dimensions mesurees du conteneur du widget (via `onLayout`) :

| Variable | Type | Description |
|----------|------|-------------|
| `$layout.width` | number | Largeur du conteneur en pixels |
| `$layout.height` | number | Hauteur du conteneur en pixels |

> Note : `$layout` est `null` au premier rendu. Le moteur fait un double rendu : le premier pour mesurer, le second avec les valeurs. Les bindings `$layout.*` retournent `0` si pas encore mesures.

### 1.7 `$computed.{nom}`

Valeurs definies dans le bloc `computed` de `ui.json`. Voir `02-json-schema-reference.md` section 8.

---

## 2. Syntaxe des expressions

### 2.1 Chemin simple

Acces direct a une propriete :

```
$data.rates          → la propriete "rates" de $data
$item.code           → la propriete "code" de l'element courant
$item.buy            → la propriete "buy"
$sources.logo.url    → propriete imbriquee
$data[0].code        → acces par index
```

### 2.2 Template literal

Interpolation de chaines avec `${...}` :

```
"${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg"
→ "http://127.0.0.1:3000/widgets/tableau-change/assets/EUR.jpg"

"${$item.code} - ${$item.label}"
→ "EUR - Euro"
```

### 2.3 Null coalescing

Valeur par defaut si null/undefined/vide :

```
$item.buy || '-'          → retourne '-' si buy est null, undefined, ou ''
$item.unit || '1'         → retourne '1' si unit est absent
$props.speed || 100       → retourne 100 si speed n'est pas defini
```

### 2.4 Ternaire

Condition avec deux branches :

```
$item.buy !== '-' ? '#c0392b' : '#94a3b8'
→ rouge si buy a une valeur, gris sinon

$index % 2 === 0 ? '#ffffff' : '#f4f6fb'
→ alternance de couleurs pair/impair
```

### 2.5 Expressions mathematiques

Operations basiques supportees :

```
$layout.width / 2
$data.length * 3000
Math.max(10000, $data.length * 3000)
-($computed.halfWidth)
$props.fontSize * 1.6
```

Fonctions supportees : `Math.max`, `Math.min`, `Math.round`, `Math.floor`, `Math.ceil`, `Math.abs`.

---

## 3. Algorithme de resolution

Le moteur SDUI resout les expressions **sans `eval()`** pour des raisons de securite. Il utilise un parser simple :

### 3.1 Detection

1. Si la valeur est un **nombre** ou un **boolean** → utiliser tel quel
2. Si la valeur est une **chaine** commencant par `$` → traiter comme expression de binding
3. Si la valeur contient `${...}` → traiter comme template literal
4. Sinon → traiter comme chaine litterale

### 3.2 Resolution de chemin

Pour `$data.rates[0].buy` :

1. Identifier le contexte racine : `$data`
2. Naviguer : `.rates` → `[0]` → `.buy`
3. Retourner la valeur ou `undefined`

### 3.3 Resolution de template literal

Pour `"${$env.baseUrl}/uploads/${$item.name}"` :

1. Trouver toutes les occurrences de `${...}`
2. Resoudre chaque expression a l'interieur
3. Concatener les parties

### 3.4 Resolution de ternaire

Pour `"$index % 2 === 0 ? '#fff' : '#f4f6fb'"` :

1. Decouper en 3 parties : condition, valeur_then, valeur_else
2. Evaluer la condition
3. Retourner la branche appropriee

---

## 4. Ou les bindings sont resolus

| Emplacement | Exemple |
|-------------|---------|
| `children` d'un noeud `text` | `"children": "$item.label"` |
| `props.source.uri` d'un `image` | `"uri": "${$env.baseUrl}/assets/${$item.code}.jpg"` |
| `props.data` d'un `flat-list` | `"data": "$data"` |
| Valeurs dans `style` | `"backgroundColor": "$index % 2 === 0 ? '#fff' : '#f4f'"` |
| `props.animation.from/to/duration` | `"to": "$computed.negHalfWidth"` |
| `conditional.if` | `"if": "$item.buy !== '-'"` |
| `computed.{nom}.expr` | `"expr": "$layout.width / 2"` |

---

## 5. Cycle de vie des donnees

```
[Mount]
  │
  ├─ Fetch ui.json
  │    GET /widgets/{type}/ui.json
  │
  ├─ Fetch dataSource.url
  │    GET /api/widgets/{type}
  │    → transform → stocker dans $data
  │
  ├─ Fetch chaque additionalSources.{nom}.url
  │    → transform → stocker dans $sources.{nom}
  │
  ├─ Premier rendu (avec $data, sans $layout)
  │    → onLayout mesure les dimensions
  │    → stocker dans $layout
  │
  ├─ Calculer $computed (avec $data + $layout)
  │
  └─ Deuxieme rendu (complet, avec tous les contextes)

[Interval]
  │
  ├─ Toutes les dataSource.refreshMs ms :
  │    Re-fetch dataSource.url → mettre a jour $data
  │    → Re-calculer $computed
  │    → React re-rend automatiquement
  │
  └─ Chaque additionalSource a son propre intervalle
```

---

## 6. Shapes des reponses API existantes

### `/api/widgets/tableau-change`

```json
{
  "rates": [
    {
      "code": "EUR",
      "label": "Euro",
      "unit": "1",
      "icon": "",
      "buy": "10.85",
      "sell": "10.95"
    }
  ],
  "updatedAt": "2026-04-06T12:00:00.000Z",
  "stale": false
}
```

### `/api/widgets/currency-ref`

```json
{
  "rates": [
    {
      "code": "EUR",
      "label": "Euro",
      "unit": "1",
      "buy": "10.85",
      "sell": "10.95",
      "bkamReference": "10.7543",
      "bkamTpe": "10.2166",
      "icon": ""
    }
  ],
  "updatedAt": "2026-04-06T12:00:00.000Z",
  "bkamUpdatedAt": "2026-04-06T10:00:00.000Z",
  "stale": false
}
```

### `/api/widgets/currency-bkam-ref`

```json
{
  "rates": [
    {
      "code": "EUR",
      "label": "Euro",
      "unit": "1",
      "bkamReference": "10.7543",
      "bkamTpe": "10.2166",
      "icon": ""
    }
  ],
  "updatedAt": "2026-04-06T10:00:00.000Z",
  "stale": false
}
```

### `/logo/info`

```json
{
  "logo": {
    "url": "/uploads/logo_1234.png",
    "name": "logo.png"
  }
}
```

Si aucun logo : `{ "logo": null }`.

---

## 7. Gestion d'erreurs

| Situation | Comportement |
|-----------|-------------|
| Fetch `dataSource.url` echoue | Conserver les anciennes donnees. Reessayer au prochain intervalle. |
| Expression `$data.X` retourne `undefined` | Rendre une chaine vide pour `text`, `null` pour `image` |
| Expression `$item.X` hors d'un `flat-list` | Retourner `undefined` (erreur du JSON, pas du moteur) |
| `$layout` pas encore mesure | Retourner `0` pour width/height |
| `$computed` depend de `$layout` non mesure | Calculer avec `0`, recalculer apres mesure |
| Division par zero dans expression | Retourner `0` |
| Template literal avec binding `undefined` | Remplacer par chaine vide |
