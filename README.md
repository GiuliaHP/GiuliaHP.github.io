# GiuliaHP.github.io

Portfolio game art / technical art (site statique HTML/CSS/JS) heberge sur GitHub Pages.

## Vue d'ensemble

Le site contient :
- une page d'accueil portfolio (`index.html`),
- des pages projet detaillees (`project-*.html`),
- une page de jeux WebGL (`games.html`),
- des galeries dynamiques alimentees via JSON (`assets/data/*.json`).

## Structure actuelle

```text
/
|- index.html
|- games.html
|- project-herbarium.html
|- project-blueprint.html
|- project-prophecy.html
|- project-portrait.html
|- README.md
`- assets/
   |- css/
   |  `- style.css
   |- js/
   |  `- script.js
   |- data/
   |  |- herbarium.json
   |  |- tubp.json
   |  |- prophecy.json
   |  |- chara.json
   |  `- games.json
   |- games/
   |  `- ... (builds WebGL)
   `- img/
      |- backgrounds/
      |- icons/
      |- logos/
      |- previews/
      |- trailers/
      `- showcase/
```

## Fonctionnement du contenu

### 1) Home (`index.html`)
- La liste des projets est definie en dur dans la section `#projects`.
- Chaque carte projet utilise des attributs `data-*` (`data-bg`, `data-icon`, `data-video-mp4`) exploites par `assets/js/script.js` (hover, preview video, curseur personnalise).
- Les jauges de competences se reglent avec `data-level="NN"`.

### 2) Pages projet (`project-*.html`)
- Les medias de showcase sont charges dynamiquement via :
  - `data-manifest="assets/data/herbarium.json"`
  - `data-manifest="assets/data/tubp.json"`
  - `data-manifest="assets/data/prophecy.json"`
  - `data-manifest="assets/data/chara.json"`
- Le rendu est gere par `assets/js/script.js` (mise en page mixed media, lightbox image/video, fallback si le JSON est invalide ou vide).

### 3) Page Jeux (`games.html`)
- Les jeux WebGL affiches sont actuellement definis en dur dans le script inline de `games.html` (tableau `games`).
- `assets/data/games.json` existe mais n'est pas consomme par la page pour l'instant.

## Mise a jour rapide du portfolio

### Ajouter ou modifier un projet dans la home
1. Editer la section `#projects` dans `index.html`.
2. Mettre a jour les medias associes dans `assets/img/backgrounds/`, `assets/img/icons/`, `assets/img/previews/`.

### Mettre a jour une galerie de page projet
1. Editer le fichier JSON correspondant dans `assets/data/`.
2. Types supportes dans les manifests : `video`, `image`, `text`.
3. Champs courants :
   - `type`
   - `src` (pour `video`/`image`)
   - `caption`
   - `title`, `body` (pour `text`)

### Mettre a jour la page Jeux
1. Editer le tableau `games` directement dans `games.html`.
2. Verifier que chaque `buildPath` pointe vers un `index.html` WebGL valide sous `assets/games/`.

## Personnalisation visuelle

Les variables globales (couleurs, rayons, typographies, etc.) sont centralisees dans `assets/css/style.css`.

## Developpement local

Lancer un serveur local a la racine du projet :

```bash
python -m http.server 5500
```

Puis ouvrir :
- `http://localhost:5500/` (home)
- `http://localhost:5500/games.html` (page jeux)

## Notes de maintenance

- Si une section showcase n'apparait plus, verifier d'abord le `data-manifest` dans la page projet et le JSON cible.
- Si une preview video ne se lance pas au hover, verifier les attributs `data-video-webm` / `data-video-mp4` sur la ligne projet concernee.
- `assets/data/chara.json` est actuellement vide : la section showcase de `project-portrait.html` sera retiree automatiquement tant que ce manifest reste vide.