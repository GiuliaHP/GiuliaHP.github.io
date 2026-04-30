# Modèles 3D

Place ici tes modèles FBX (.fbx).

## Préparer un modèle FBX

1. **Optimisation** : Assure-toi que le modèle a un nombre de polygones raisonnable (< 50k pour une bonne perf).
2. **Animations** : Si le modèle a des animations, elles seront chargées et joueront automatiquement.
3. **Matériaux** : Les matériaux du modèle seront conservés. Tu peux contrôler le rendu (base color / wireframe) via les boutons.
4. **Export** : Exporte depuis Blender / Maya / 3DS Max en FBX (format : Binary, Animation : OUI).

## Charger le modèle

Place le fichier à : `assets/models/model.fbx`

Le visualiseur le chargera automatiquement. Sinon, modifie `assets/js/3d-viewer.js` ligne 37 :
```javascript
const modelPath = 'assets/models/model.fbx'; // ← change le chemin ici
```

## Contrôles

- **Drag** : Tourne le modèle
- **Spacebar** : Bascule entre Base Color et Wireframe
- **Boutons** : Sélectionne le mode d'affichage

Bonne chance ! 🎨
