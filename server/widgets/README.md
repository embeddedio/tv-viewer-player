# Widgets

Chaque widget vit dans son propre dossier sous `server/widgets/`.

Conventions :
- un `index.html` par widget comme point d'entree
- les assets et dependances statiques restent dans le dossier du widget
- les widgets consomment les endpoints locaux du serveur embarque (`/devises`, `/logo/info`, etc.)

Exemple :
- `server/widgets/tableau-change/`
