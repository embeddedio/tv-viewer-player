# Concept — Architecture à widgets portables

## Vue d'ensemble

Le système est composé de **deux applications distinctes** qui ne communiquent jamais directement. Leur seul point de contact est un **dossier partagé** dans la mémoire du boîtier.

```
[ App Développement ]  →  exporte  →  [ Dossier partagé ]  →  lit  →  [ App Player ]
```

---

## Les deux applications

### L'app de développement

C'est l'outil du créateur de contenu. Elle sert à concevoir et assembler des widgets, puis à les exporter sous forme de paquets autonomes.

Elle n'est **jamais installée sur les boîtiers de diffusion**. Elle reste sur le poste de travail.

### L'app player

C'est l'application installée sur les boîtiers TV. Son rôle est uniquement de **lire et afficher** ce qu'elle trouve dans le dossier partagé.

Elle ne contient aucun widget en dur. Elle est générique par nature.

---

## Le widget — une mini-application autonome

Un widget est un **bloc de contenu indépendant**. Il peut prendre deux formes :

- **Une page web** : une interface visuelle décrite sous forme de fichiers lisibles, affichée dans une fenêtre dédiée
- **Une vue native** : une interface décrite dans un format structuré, rendue directement par le player sans navigateur

Dans les deux cas, le widget embarque tout ce dont il a besoin :

| Fichier | Contenu |
|---------|---------|
| Sa déclaration | Nom, type, version — ce qu'il est |
| Son apparence | Comment il doit être affiché |
| Sa logique de données | Comment il récupère ou calcule son contenu |
| Sa page de configuration | Comment l'utilisateur peut le paramétrer |

Le widget ne dépend de rien d'extérieur. Il est **portable**.

---

## Le dossier partagé — point de rencontre

Le dossier partagé est situé dans la mémoire accessible du boîtier, dans un emplacement standard (équivalent du dossier Téléchargements).

```
Mémoire du boîtier
└── dossier_app/
    └── widgets/
        ├── widget-meteo/
        │   ├── declaration
        │   ├── apparence
        │   ├── données
        │   └── configuration
        ├── widget-ticker/
        │   └── ...
        └── widget-horloge/
            └── ...
```

Ce dossier peut être alimenté de plusieurs façons : câble, réseau local, synchronisation automatique. Le player ne se soucie pas de l'origine des fichiers.

---

## Le cycle de vie complet

```
1. CRÉER
   Le développeur conçoit un widget dans l'app de développement.

2. EXPORTER
   L'app génère un paquet autonome contenant tous les fichiers du widget.

3. DÉPOSER
   Le paquet est copié dans le dossier partagé du boîtier cible.

4. DÉCOUVRIR
   Au démarrage, le player scanne le dossier et liste les widgets présents.

5. AFFICHER
   Le player lit les fichiers de chaque widget et l'affiche selon sa description.
```

---

## Ce que cette architecture permet

**Mettre à jour un widget sans toucher à l'app player.**
On remplace les fichiers dans le dossier, le player voit la nouvelle version au prochain démarrage.

**Avoir des boîtiers avec des contenus différents.**
Chaque boîtier a son propre dossier. Chacun peut afficher des widgets différents.

**Ajouter un nouveau type de contenu sans recompiler.**
Un nouveau widget est déposé dans le dossier. L'app player le découvre automatiquement.

**Travailler sans connexion entre les deux apps.**
Le développeur exporte sur sa machine, un technicien dépose sur le boîtier. Les deux étapes sont indépendantes.

---

## Résumé en une phrase

> L'app player est un cadre vide qui affiche n'importe quel widget autonome déposé dans un dossier, sans avoir besoin d'être modifiée.
