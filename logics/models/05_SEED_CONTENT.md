# 05 — Seed content (v0.12.x)

> Seed dev actuelle : 2 écoles (photos Cloudinary `sc_*` + URL http://www.google.com), comptes fixes (super admin global + admin/teacher/student1/2, mdp `change-me-password`), studios avec photos Cloudinary `st_*`, 20 cours démo/école avec photos Cloudinary `co_*`, progression/blessures, favoris profs, invoices/backfill pour facturation, offres/packs globaux EUR/TVA20, partenaire Amazon (4 liens produits), crédits 500 par élève.
> Disciplines seedées : Pole / Pole Exotic / Souplesse / Pilates / Conditioning (taggées sur positions et cours). Muscles/articulations seedés et liés aux positions selon leur type. Positions (30) créées par des professeurs seedés (Elza priorisée) + favoris prof auto + vidéo Cloudinary authentifiée par position (pool fixe). Cours répartis entre profs de l’école sans collision horaire, durées par pas de 15 min.

## Taxonomies

### Types
- SPIN
- TRICK
- TRANSITION
- WARMUP
- STRENGTH

### Niveaux requis (exemple simple)
- BEGINNER
- INTERMEDIATE
- ADVANCED

### Grips (exemple)
- CUP
- TWIST
- TRUE
- FOREARM
- ELBOW
- OTHER

## Injury types (exemples)
- Épaule
- Poignet
- Coude
- Bas du dos
- Genou
- Ventre
- Tête
- Bassin
- Jambes
- Bras

## Positions (exemples — placeholder)
> 30 positions (spins/tricks/transitions/warmups/strength), chacune avec 1 vidéo Cloudinary authentifiée (pool fixe, rotation sur 6 publicId), pas d’image statique.

Vidéos Cloudinary utilisées (authenticated) :
- `01_xphtvq`
- `02_e8rhmg`
- `03_yjmfi7`
- `04_exjndq`
- `05_flr6zp`
- `06_shrnly`

Exemple (format libre, tronqué) :
1. Fireman Spin — SPIN — BEGINNER — grips: TRUE  
…  
10. Warmup Flow 1 — WARMUP — BEGINNER  
…  
20. Dynamic Leg Swings — WARMUP — BEGINNER  
21. Figurehead Spin — SPIN — INTERMEDIATE — grips: TRUE  
22. Carousel Back Spin — SPIN — INTERMEDIATE — grips: TRUE  
23. Inside Leg Hang — TRICK — INTERMEDIATE — grips: CUP  
24. Cupid — TRICK — INTERMEDIATE — grips: CUP  
25. Shoulder Stand — STRENGTH — INTERMEDIATE — grips: FOREARM  
26. Iron X Prep — STRENGTH — ADVANCED — grips: FOREARM  
27. Body Wave Transition — TRANSITION — BEGINNER — grips: OTHER  
28. Back Bend Flow — WARMUP — BEGINNER — grips: OTHER  
29. Side Climb — STRENGTH — INTERMEDIATE — grips: TRUE  
30. Phoenix Spin — SPIN — ADVANCED — grips: TRUE

## Écoles et utilisateurs générés (mot de passe `change-me-password`)
- 2 écoles créées : (voir noms plus bas) la première école sera utilisée en priorité (photo Cloudinary `sc_*` + URL http://www.google.com). **Donuts** a été renommée **APEX** dans le seed.
- Pour chaque école créer : **3 studios** (voir nom plus bas, adresse fictive Paris) avec photos Cloudinary `st_*`.
- Photos cours : pool Cloudinary `co_*` appliqué en rotation sur les cours seedés.
- Pour chaque école : **2 professeurs** (`teacher(X).(nom-ecole-simple)@poleapp.test`) et **10 élèves** (`student(X).(nom-ecole-simple)@poleapp.test`), mot de passe `change-me-password`, premium pour 1 élève sur 2, **500 crédits** par élève.
- Pour chaque utilisateurs : Les nom prenom et photos de profile sont sélectionnés dans la liste plus bas (Choisir aléatoirement selon le genre).
- 20 cours de démo créés par école (répartis aléatoirement entre professeurs sans collisions studio/prof sur le créneau, élèves 2–6 par cours, positions 2–4) + il doit y avoir 5 cours déjà passés sur les 15 derniers jours et le reste étalés sur 15 jours, horaire entre 16h et 21h, durées par pas de 15 min, ne peut pas se chevaucher si même studio et/ou même professeur. Positions privilégiées du prof assigné quand dispo.

### Pools médias Cloudinary (seed)
- Écoles : `sc_02_iidqs5`, `sc_01_hgtgz4`, `sc_03_kouzh8`
- Studios : `st_02_csmng8`, `st_05_iryeuf`, `st_01_os2kvs`, `st_04_xfg65z`, `st_03_ywhrxt`, `st_06_o2bp6z`
- Cours : `co_20_fuk1vy`, `co_01_lzy3th`, `co_06_etu7av`, `co_09_wsasz3`, `co_11_v4xldz`, `co_05_d3ydvl`, `co_03_qd4h2w`, `co_02_i3tc6p`, `co_12_ywslqp`, `co_13_hagigy`, `co_08_pbc6av`, `co_16_ssjjra`, `co_04_fujy4g`, `co_07_u5usuw`, `co_17_s1kvva`, `co_10_jlkxrd`, `co_15_dnmanu`, `co_18_boe3wh`, `co_14_oiur1r`, `co_19_g7eim2`
- Presets seed : images `ps_001_wcashm`, `ps_002_fhyron`, `ps_003_xauurl`; vidéos `ps_001_qo2alr`

## Comptes seed (mot de passe `change-me-password`) (à affecter à la première école)
- superadmin@poleapp.test — SUPER_ADMIN (global, sans école)
- admin@poleapp.test — SCHOOL_ADMIN (premium) - admin admin 40ans Homme
- teacher@poleapp.test — TEACHER (Professeur) - Elza Martinez 32ans Femme
- student1@poleapp.test — STUDENT (free) - Anna Douchez 31ans Femme
- student2@poleapp.test — STUDENT (premium) - Carlo Mendes 35ans Homme

## Offres globales seed (Super Admin)
- TVA par défaut : 20%, devise : EUR.
- Abonnement : « Abonnement mensuel 1000 » — 9,99 €/mois TTC (59,90 €/an TTC), 1000 crédits mensuels, actif/ouvert.
- Packs crédits : Pack 500 (9,99€), Pack 1000 (14,99€), Pack 2500 (29,99€), actifs/ouvert.


## (à utiliser pour le seed) Avatars par défaut Cloudinary (public_id)
- Femmes : fe_16_vdbrvw, fe_18_b6yctx, fe_17_uce9aq, fe_15_b1wpzd, fe_14_h7ovmd, fe_13_i0s5g4, fe_11_hlv19o, fe_09_dfnky5, fe_12_gd47yw, fe_10_heju31, fe_08_nmnsdm, fe_07_hncwlg, fe_06_vggogo, fe_05_asx9f9, fe_04_qgwvmz, fe_03_e1enmb, fe_02_tjm96i, fe_01_beubee
- Hommes : ma_15_d36r97, ma_14_zcdohg, ma_13_u2c7cw, ma_12_xnoskm, ma_11_f20med, ma_10_xog2ex, ma_09_ceanzu, ma_08_lybazn, ma_07_fcy3ff, ma_06_fyicwi, ma_05_sdohme, ma_04_wpxs4c, ma_03_weca1r, ma_02_abukow, ma_01_vcgj9u

## Partenaires seed
- Amazon (SERVICE) avec liens sponsorisés :
  - Grip Spray — https://amzn.eu/d/cDnGqVK
  - Barre Pole Dance — https://amzn.eu/d/5fN1EhI
  - Tenue exotique — https://amzn.eu/d/gPja1CW
  - Support plafond — https://amzn.eu/d/gPja1CW

## (à utiliser pour le seed) Liste de nom prenom (avec age) pour les utilisateurs (tout type de rôle & ne peut être utiliser qu'une fois)
- Léa Morel age:22 Femme
- Julien Caron age:28 Homme
- Maya Lefèvre age:19 Femme
- Arthur Dubois age:30 Homme
- Inès Laurent age:24 Femme
- Amine Petit age:33 Homme
- Camille Simon age:21 Femme
- Léo Bernard age:27 Femme
- Zoé Fournier age:25 Femme
- Raphaël Michel age:29 Homme
- Nora Garcia age:18 Femme
- Hugo Martin age:32 Homme
- Eva Roux age:23 Femme
- Thomas Girard age:35 Homme
- Sarah Lambert age:26 Femme
- Maxime Lopez age:31 Homme
- Alice Robert age:20 Femme
- Yanis Colin age:34 Homme
- Chloé Didier age:28 Femme
- Victor Marin age:40 Homme

## (à utiliser pour le seed) Liste des noms d'école (Pole)
- Donuts
- Horizon
- Académie Arabesque
- Pulsation Pole Center
- Atelier du Mouvement
- Impulsion Pole
- Latitude Pole
- Rythme & Grâce
- Équilibre

## (à utiliser pour le seed) Liste des noms de studio (ne peut être utiliser qu'une fois)
- Nova
- Aérial
- Pulse
- Fusion
- Harmonie
- Vortex
- Pivot
- Eclipse
- Tempo

## (à utiliser pour le seed) Liste des noms de cours (peut être réutiliser avec proportion) 
- Flow Débutant
- Spin & Transitions
- Power Tricks
- Fluidité & Musicalité
- Stretch & Flex
- Conditioning Aérien
- Routine Équilibre
- Core & Grips
- Flow Intermédiaire
- Spins Avancés
- Mobility & Lines
- Strength & Control
- Spin en douceur
- Flow Créatif
- Routine Express
- Technique & Grips
- Spin & Control
- Flow Choré
- Tricks Intermédiaire
