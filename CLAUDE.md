# Tracker Push/Pull

## Contexte
App web personnelle pour suivre mes séances de musculation et vérifier que mon entraînement colle à mon programme. Je suis le premier utilisateur. Projet aussi destiné à mon portfolio : README clair, démo en ligne, code propre.

Mon entraînement :
- Programme Push/Pull, 4 séances prévues par semaine, mais souvent seulement 2 ou 3 réalisées
- Mélange calisthénie + barre / machines, objectif hypertrophie et abdos visibles
- Tractions uniquement en pronation
- Arrière d'épaule (deltoïde postérieur) identifié comme groupe en retard
- Petite séance jambes au poids du corps à la maison les jours off (pistol squats, etc.)
- Utilisation sur téléphone, à la salle

## Stack
- Next.js + TypeScript (App Router)
- Prisma + PostgreSQL
- TailwindCSS
- Recharts pour les graphiques
- Mobile first

## V1 (périmètre à respecter)
1. **Créer mon programme** : jours (Push, Pull, jambes maison), exercices, séries et fourchette de reps visées
2. **Saisir une séance** : ouvrir la séance du jour, remplir chaque série (poids, reps) au fur et à mesure
3. **Historique et bilan de la semaine** : séances prévues vs réalisées, séance(s) manquée(s)

Les exercices au poids du corps se suivent en reps ou en variante (progression), pas seulement en charge.

## Après la V1 (ne pas faire tout de suite)
- Volume hebdomadaire par groupe musculaire, alerte sur les groupes en retard
- Graphique de progression par exercice
- Suggestion d'augmenter la charge quand le haut de la fourchette de reps est atteint
- PWA installable et mode hors ligne

## Façon de travailler
- Une tâche à la fois, petites étapes livrables
- Première étape : le schéma Prisma (programmes, exercices, groupes musculaires, séances, séries)
- Pas de tirets cadratins dans les réponses