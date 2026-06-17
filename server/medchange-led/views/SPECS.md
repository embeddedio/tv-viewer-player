# Document Explicatif - Application d'Affichage Dynamique (Version AngularJS)

## 1. Vue d'Ensemble
L'application est un tableau de bord numérique (Digital Signage) destiné aux bureaux de change. Elle affiche en temps réel les taux de change, des médias promotionnels (images/vidéos) et un bandeau d'information défilant.

Cette version sera développée en **AngularJS (v1.x)** avec **Bootstrap 4** pour le style, remplaçant la version actuelle en React/Tailwind.

## 2. Architecture & Technologies
*   **Framework JS :** AngularJS 1.8.x (Legacy)
*   **Framework CSS :** Bootstrap 4.6.x + CSS personnalisé (pour les animations et le style "Dark/Neon").
*   **Communication :**
    *   **API REST :** Chargement initial de la configuration et des taux (`/api/data`).
    *   **WebSockets (Socket.io) :** Mises à jour en temps réel (taux modifiés par le scraper serveur, changement de configuration).
*   **Structure de fichiers cible (`views/`) :**
    *   `index.html` : Point d'entrée unique.
    *   `app.js` : Module principal et configuration.
    *   `services/` : Gestion API et Socket.
    *   `controllers/` : Logique de vue (`DashboardController`).
    *   `directives/` : Composants réutilisables (`exchangeCard`, `mediaSlider`, `marquee`).
    *   `assets/` : Styles CSS et images.

## 3. Fonctionnalités Détaillées

### A. Mode Tableau de Bord (Dashboard)
C'est la vue principale visible par les clients.

1.  **Section Média (Gauche)**
    *   Carrousel d'images et de vidéos.
    *   Rotation automatique selon un intervalle défini (`mediaRotationInterval`).
    *   Supporte les vidéos avec lecture automatique (muet).
    *   Largeur configurable en pourcentage de l'écran (`mediaSectionWidth`).

2.  **Grille des Taux (Droite)**
    *   Affichage des devises sous forme de cartes (Drapeau, Code, Achat, Vente).
    *   **Grille dynamique :** Nombre de colonnes et lignes configurables (`gridColumns`, `gridRows`).
    *   **Pagination automatique :** Si le nombre de devises dépasse la capacité de la grille, les pages défilent automatiquement (`rotationInterval`).
    *   **Mise en évidence :** Une carte est surbrillée séquentiellement (`highlightInterval`) pour attirer l'attention.
    *   **Animations :** Transitions fluides lors du changement de page (Haut, Bas, Gauche, Droite).

3.  **Bandeau Défilant (Marquee - Bas)**
    *   Texte d'information défilant en continu de droite à gauche.
    *   Contenu configurable (liste de messages séparés par des puces).
    *   Vitesse et taille de police ajustables.
    *   Hauteur du bandeau ajustable (`marqueeHeightPercent`).

### B. Mode Configuration (Admin Overlay)
Une interface superposée permettant de modifier les paramètres en temps réel sans redémarrer le serveur.

1.  **Paramètres Généraux**
    *   Dimensions de la grille (Col x Row).
    *   Intervalles de temps (Rotation page, Rotation média, Highlight).
    *   Largeur de la zone média.
2.  **Gestion du Marquee**
    *   Ajouter/Modifier/Supprimer/Ordonner les messages.
    *   Réglage vitesse et taille.
3.  **Gestion des Médias**
    *   Upload de nouveaux fichiers (Images/Vidéos) via API.
    *   Ordonner ou supprimer les médias existants.
4.  **Personnalisation Visuelle**
    *   Tailles de polices forcées (Prix, Codes, Logos).

## 4. Modèle de Données (Scope)

L'application dépend d'un objet `settings` global synchronisé :

```json
{
  "gridColumns": 2,
  "gridRows": 3,
  "mediaSectionWidth": 30,
  "rotationInterval": 10000,
  "highlightInterval": 3000,
  "mediaUrls": ["url1.jpg", "url2.mp4"],
  "marqueeItems": ["Bienvenue...", "Taux net..."],
  "rates": [ ... ] // Liste des devises (Code, Buy, Sell, Flag)
}
```

## 5. Contraintes Techniques
*   **Performance :** Le défilement (Marquee) doit être fluide (utilisation de `transform: translate3d`).
*   **Stabilité :** En cas de déconnexion Socket, l'application doit tenter de se reconnecter ou recharger les données via HTTP.
*   **Responsive :** Bien que destiné aux grands écrans, le layout doit s'adapter grâce à Bootstrap grid.
