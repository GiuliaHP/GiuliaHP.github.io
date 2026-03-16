# GiuliaHP.github.io

Portfolio de développeur de jeux vidéo - Game Developer Portfolio

## Structure du projet

```
/
├── index.html          # Page principale HTML
├── project-herbarium.html
├── project-blueprint.html
├── project-prophecy.html
├── project-portrait.html
├── README.md           # Ce fichier
└── assets/             # Ressources statiques
    ├── css/
    │   └── style.css   # Styles CSS (couleurs, polices, layout)
    ├── js/
    │   └── script.js   # Code JavaScript (interactions, animations)
    └── img/
        ├── backgrounds/
        ├── icons/
        ├── logos/
        ├── previews/
        └── trailers/
```

## Personnalisation

### Couleurs
Modifiez les variables CSS dans `assets/css/style.css` :
```css
:root {
  --bg:      #0f0f0d;  /* Fond */
  --accent:  #c8b99a;  /* Accent */
  --text:    #d8d4cc;  /* Texte */
  /* ... */
}
```

### Nom et contenu
- Modifiez le logo/nav/footer directement dans `index.html` et les pages `project-*.html`.
- Modifiez les projets dans la section `#projects` de `index.html`.
- Personnalisez les descriptions dans `#hero` sur la home et sur chaque page projet.
- Dans les compétences, éditez `data-level="NN"` pour régler les pourcentages.

### Médias
- Aperçus hover de la home : `assets/img/previews/`
- Bandeaux vidéo pages projet : `assets/img/trailers/`
- Icônes logos/projets : `assets/img/logos/` et `assets/img/icons/`

## Développement local

```bash
python -m http.server 5500
```

Puis ouvrez http://localhost:5500 dans votre navigateur.