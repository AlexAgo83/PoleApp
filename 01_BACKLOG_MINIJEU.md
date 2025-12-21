# Backlog — Mini-jeux (session 2025-12-21)
[Compréhension: 100% / Avancement: 20%]

## Rappel existant
- Mode Photo → Nom déjà implémenté dans `/app/student/game` (à vérifier pour éviter les doublons).

## Tâches
- [ ] Cartographie de l’existant : répertorier le mode actuel (Photo→Nom) et la structure du quiz pour éviter toute duplication.
- [ ] Schéma DB `GameSession` (id, userId, schoolId, mode, totalQuestions, correctAnswers, durationMs, createdAt) + migration + client Prisma généré.
- [ ] Pool positions : récupérer positions débloquées (ou toutes si premium) et bloquer si < 4.
- [ ] Générateur de questions par mode (10 questions par défaut, 5 pour Blitz, nombre figé) :
  - [ ] Mode 1 Photo→Nom (réutiliser l’existant).
  - [ ] Mode 2 Nom→Type.
  - [ ] Mode 3 Nom→Niveau.
  - [ ] Mode 4 Nom→Grips (distracteurs autorisés).
  - [ ] Mode 5 Description/Intro→Nom (nouveau champ si nécessaire, même style que le mode existant).
  - [ ] Mode 6 Blitz mix (type/niveau/grips, 5 questions).
- [ ] UI sélection de mode dans `/app/student/game` : cartes par mode avec CTA “Jouer” + stats/record du joueur.
- [ ] UI quiz générique (question, 4 choix, feedback immédiat, auto-advance).
- [ ] Résumé fin de session (bonnes/mauvaises, % réussite).
- [ ] Leaderboard par mode : meilleure précision + sessions jouées (top 10), visible pour l’élève sur /game et dans la fiche élève (vue prof/admin) avec historique des 5 dernières sessions (pas de filtrage école).
- [ ] Seed de quelques sessions de démo sur des élèves existants (pas de nouveaux comptes).

## Definition of Done (DoD)
- Tests manuels : chaque mode se lance depuis `/app/student/game`, bloque si pool < 4, et enregistre une ligne `GameSession` avec durée front.
- Leaderboard (par mode) affiche au moins une ligne après une session jouée ; pas d’erreur Prisma en prod/dev. Historique 5 dernières sessions visible dans la fiche élève (vue prof/admin).
- Accessibilité : boutons/feedback clavier, texte clair des réponses. Cartes de modes avec CTA “Jouer” et stats. Bouton “Rejouer ce mode” en fin de session. Affichage des bonnes réponses.
- Aucune duplication du mode existant (Photo→Nom).
