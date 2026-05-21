# Tutoriel : Integrer un nouveau Widget

## Principe

Un widget est un **dossier autonome** (HTML + CSS + JS) place dans `server/widgets/`.
L'app l'affiche dans une WebView via l'URL `http://127.0.0.1:3000/widgets/{id-du-dossier}/`.

**Aucune modification de l'APK n'est necessaire.** Il suffit d'ajouter le dossier, relancer `yarn sync:server`, et rebuild.

---

## Structure d'un widget

```
server/widgets/mon-widget/
  widget.json       <- Obligatoire : metadonnees du widget
  index.html         <- Obligatoire : point d'entree
  app.js             <- Logique JS
  styles.css         <- Styles
  assets/            <- Images, icones, etc. (optionnel)
```

---

## 1. Creer le fichier `widget.json`

Ce fichier decrit le widget pour l'admin UI et l'app. Il est lu automatiquement par la route `GET /api/widgets`.

```json
{
  "label": "Mon Widget",
  "description": "Description courte de ce que fait le widget",
  "apiEndpoint": "/api/widgets/mon-widget",
  "refreshMs": 30000,
  "params": ["logoWidth", "headerHeight"]
}
```

| Champ          | Obligatoire | Description                                              |
|----------------|-------------|----------------------------------------------------------|
| `label`        | Oui         | Nom affiche dans l'admin UI                              |
| `description`  | Non         | Description courte                                       |
| `apiEndpoint`  | Non         | Route API serveur qui fournit les donnees au widget      |
| `refreshMs`    | Non         | Intervalle de rafraichissement en ms (defaut: 30000)     |
| `params`       | Non         | Liste des parametres URL acceptes par le widget          |

> **Convention de nommage :** L'`id` du widget est le nom du dossier. Utilisez des minuscules et des tirets : `mon-widget`, `tableau-change`, `meteo-locale`.

---

## 2. Creer `index.html`

Structure minimale :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mon Widget</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main id="widget-root">
      <!-- Contenu du widget -->
    </main>
    <script src="./app.js"></script>
  </body>
</html>
```

---

## 3. Creer `app.js`

Le JavaScript du widget suit ce pattern :

```js
(function () {
  // --- Configuration ---
  const CONFIG = {
    refreshMs: 30 * 1000, // Rafraichissement toutes les 30s
  };

  // --- Recuperer les parametres URL ---
  const params = new URLSearchParams(window.location.search);
  const logoWidth = params.get("logoWidth") || "21";

  // --- Charger le logo depuis le serveur ---
  function loadLogo() {
    fetch("/logo/info")
      .then((r) => r.json())
      .then((data) => {
        if (data?.logo?.url) {
          const img = document.getElementById("widget-logo");
          if (img) {
            img.src = data.logo.url;
            img.classList.remove("hidden");
          }
        }
      })
      .catch(() => {});
  }

  // --- Recuperer les donnees depuis l'API serveur ---
  function fetchData() {
    fetch("/api/widgets/mon-widget")
      .then((r) => r.json())
      .then((data) => {
        render(data);
      })
      .catch((err) => console.error("Fetch error:", err));
  }

  // --- Afficher les donnees ---
  function render(data) {
    // Mettre a jour le DOM avec les donnees
  }

  // --- Ecouter les messages de rafraichissement depuis l'app ---
  window.addEventListener("message", (event) => {
    try {
      const msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (msg?.type === "refresh_rates") {
        fetchData();
      }
    } catch (_) {}
  });

  // --- Initialisation ---
  loadLogo();
  fetchData();
  setInterval(fetchData, CONFIG.refreshMs);
})();
```

---

## 4. (Optionnel) Ajouter une route API serveur

Si le widget a besoin de donnees dynamiques (scraping, calculs, cache), ajoutez une route dans `server/server.js` :

```js
if (req.method === 'GET' && pathname === '/api/widgets/mon-widget') {
  // Logique de donnees
  return sendJson(res, { items: [...], updatedAt: Date.now() });
}
```

> **Important :** Placez cette route **avant** le bloc `if (!requireAuth(req))` (ligne ~483) pour qu'elle soit accessible sans authentification (l'app React Native n'envoie pas de cookie de session).

Si le widget est purement statique (pas de donnees serveur), aucune route n'est necessaire.

---

## 5. Conventions a respecter

### Fichiers statiques
Le serveur sert automatiquement tous les fichiers dans `server/widgets/{id}/` via la route `GET /widgets/{id}/*`. Aucune configuration necessaire.

### Parametres URL
L'app passe des parametres via l'URL : `/widgets/mon-widget/?logoWidth=21&headerHeight=17`.
Les widgets reconnus dans `WidgetWebView.tsx` recoivent ces parametres automatiquement.

Pour qu'un nouveau widget recoive des parametres, ajoutez son `id` dans `components/WidgetWebView.tsx` :

```tsx
if (["tableau-change", "currency-ref", "currency-bkam-ref", "mon-widget"].includes(widgetType) && widgetItem) {
```

### Messages de l'app
L'app peut envoyer des messages au widget via `postMessage`. Ecoutez-les avec :

```js
window.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg?.type === "refresh_rates") { /* ... */ }
});
```

### Zero dependance
Le widget doit etre autonome : pas de npm, pas de bundler, pas de CDN externe. Tout en vanilla HTML/CSS/JS.

---

## 6. Utiliser le widget dans une sequence

Dans l'admin UI (page Planification) :
1. Creer ou editer une sequence
2. Selectionner une zone
3. Ajouter un element de type **Widget**
4. Choisir le widget dans la liste (le `label` de `widget.json` s'affiche)
5. Configurer la duree d'affichage

Le widget apparaitra dans la zone via une WebView.

---

## 7. Deploiement

```bash
# 1. Placer le dossier du widget
cp -r mon-widget/ server/widgets/mon-widget/

# 2. Synchroniser vers l'app
yarn sync:server

# 3. Rebuild
yarn android
```

Pour un deploiement **sans rebuild APK** (futur) : uploader un ZIP via l'admin UI qui sera decompresse dans `server/widgets/`.

---

## Resume

| Etape | Fichier | Obligatoire |
|-------|---------|-------------|
| Metadonnees | `widget.json` | Oui |
| Point d'entree | `index.html` | Oui |
| Logique | `app.js` | Oui |
| Styles | `styles.css` | Recommande |
| Assets | `assets/` | Optionnel |
| Route API | `server/server.js` | Si donnees dynamiques |

---

## Widgets existants (references)

| ID | Label | Description | API |
|----|-------|-------------|-----|
| `tableau-change` | Tableau de Change | Taux de change billets (BestChange) | `/api/widgets/tableau-change` |
| `currency-ref` | Change + Ref BKAM | Taux de change + reference BKAM + TPE | `/api/widgets/currency-ref` |
| `currency-bkam-ref` | Reference BKAM | Taux de reference BKAM + TPE | `/api/widgets/currency-bkam-ref` |
