# Plan de Développement - Migration AngularJS

Ce plan détaille les étapes pour recréer le front-end React en AngularJS + Bootstrap 4.

## Phase 1 : Initialisation & Structure
- [x] **Création de la structure de dossiers**
- [x] **Mise en place de `index.html`**

## Phase 2 : Services & Données
- [x] **Service `DataService`**
- [x] **Service `SocketService`**

## Phase 3 : Développement du Dashboard (Vue Principale)
- [x] **Contrôleur Principal**
- [x] **Directives**

## Phase 4 : Développement du Menu de Configuration
- [x] **Interface Overlay**
- [x] **Logique de Formulaire**
- [x] **Sauvegarde**

## Phase 5 : Styles & Finitions
- [x] **Portage du CSS (Tailwind vers CSS/Bootstrap)**
- [x] **Tests & Ajustements**

## Phase 6 : Intégration
- [x] **Modification du serveur**
    - Ajout de la route `/v2` pointant vers le dossier `views/`.
    - L'application est accessible via `http://localhost:3000/v2/`.
