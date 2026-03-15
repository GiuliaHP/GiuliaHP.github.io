# GiuliaHP.github.io

Portfolio de développeur de jeux vidéo - Game Developer Portfolio

## Structure du projet

```
/
├── index.html          # Page principale HTML
├── README.md           # Ce fichier
└── assets/             # Ressources statiques
    ├── css/
    │   └── style.css   # Styles CSS (couleurs, polices, layout)
    ├── js/
    │   └── script.js   # Code JavaScript (interactions, animations)
    └── img/            # Images du portfolio (aperçus de projets)
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
- Remplacez "Votre Nom" dans `index.html`
- Modifiez les projets dans la section `#projects`
- Personnalisez la description dans la section `#hero`

### Images
Ajoutez vos aperçus de projets dans `assets/img/` et référencez-les avec `data-preview="assets/img/mon-projet.jpg"` dans les liens de projets.

## Développement local

```bash
python -m http.server 8000
```

Puis ouvrez http://localhost:8000 dans votre navigateur.