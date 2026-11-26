# Visite 3D du Studio (4 × 4 m)

Application web interactive en Three.js modélisant fidèlement le studio de 4 × 4 m (avec cuisine et douche attenantes) à partir du plan d'architecture.

## Fonctionnalités
- **Dimensions fidèles** : studio 4 × 4 m, cuisine 2,40 × 2,00 m, douche 1,60 × 2,00 m, lit 1,40 × 1,90 m, prises électriques, portes ouvrantes et fenêtre coulissante.
- **Rendu réaliste** : carrelage gris foncé, peinture murale émeraude / cachemire / albâtre, miroir temps réel, éclairages `Jour`, `Fin d'après-midi` et `Soirée`.
- **Décoration & interactivité** : 4 rideaux (2 beiges au centre, 2 émeraude sur les côtés) ouvrants/fermants, télévision animée, lampes cliquables, armoire ouvrante.
- **Navigation** : visite libre (`Z Q S D` / flèches + souris), zoom/dézoom (`molette` ou `+`/`−`), mini-plan 2D cliquable et vue maquette orbitale.

## Lancement local
Double-cliquez sur `lancer_visite.bat` ou exécutez :
```bash
python server.py
```

## Déploiement sur Vercel
Le dossier `vendor/three/` embarque les modules Three.js nécessaires : aucun build n'est requis (`Framework Preset: Other`, `Output Directory: .`).
