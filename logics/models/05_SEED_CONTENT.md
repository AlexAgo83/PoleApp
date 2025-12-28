# 05 — Seed content (v0.8.1)

> Seed dev actuelle : 2 écoles (photo + URL http://www.google.com), comptes fixes (super admin global + admin/teacher/student1/2, mdp `poleapp123`), studios avec photos, 20 cours démo/école, progression/blessures, favoris profs, invoices/backfill pour facturation, offres/packs globaux EUR/TVA20, partenaire Amazon (4 liens produits), crédits 500 par élève.
> Disciplines seedées : Pole / Pole Exotic / Souplesse / Pilates / Conditioning (taggées sur positions et cours). Muscles/articulations seedés et liés aux positions selon leur type. Positions (30) créées par des professeurs seedés (Elza priorisée) + favoris prof auto + vidéo Cloudinary authentifiée par position (round-robin sur 3 publicId). Cours répartis entre profs de l’école sans collision horaire, durées par pas de 15 min.

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
> 30 positions (spins/tricks/transitions/warmups/strength), chacune avec 1 image + 1 vidéo Cloudinary authentifiée (publicId round-robin sur 3 valeurs).

Vidéos Cloudinary utilisées (authenticated) :
- `poleapp/positions/poleapp/positions/nki6uakajeqfvikcvr8k`
- `poleapp/positions/poleapp/positions/ez38yqvywnxis1g6rpbd`
- `poleapp/positions/poleapp/positions/nki6uakajeqfvikcvr8k` (doublon volontaire round-robin)

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

## Écoles et utilisateurs générés (mot de passe `poleapp123`)
- 2 écoles créées : (voir noms plus bas) la première école sera utilisée en priorité (photo par défaut + URL http://www.google.com). **Donuts** a été renommée **APEX** dans le seed.
- Pour chaque école créer : **3 studios** (voir nom plus bas, adresse fictive Paris).
- Pour chaque école : **2 professeurs** (`teacher(X).(nom-ecole-simple)@poleapp.test`) et **10 élèves** (`student(X).(nom-ecole-simple)@poleapp.test`), mot de passe `poleapp123`, premium pour 1 élève sur 2, **500 crédits** par élève.
- Pour chaque utilisateurs : Les nom prenom et photos de profile sont sélectionnés dans la liste plus bas (Choisir aléatoirement selon le genre).
- 20 cours de démo créés par école (répartis aléatoirement entre professeurs sans collisions studio/prof sur le créneau, élèves 2–6 par cours, positions 2–4) + il doit y avoir 5 cours déjà passés sur les 15 derniers jours et le reste étalés sur 15 jours, horaire entre 16h et 21h, durées par pas de 15 min, ne peut pas se chevaucher si même studio et/ou même professeur. Positions privilégiées du prof assigné quand dispo.

## Comptes seed (mot de passe `poleapp123`) (à affecter à la première école)
- superadmin@poleapp.test — SUPER_ADMIN (global, sans école)
- admin@poleapp.test — SCHOOL_ADMIN (premium) - admin admin 40ans Homme
- teacher@poleapp.test — TEACHER (Professeur) - Elza Martinez 32ans Femme
- student1@poleapp.test — STUDENT (free) - Anna Douchez 31ans Femme
- student2@poleapp.test — STUDENT (premium) - Carlo Mendes 35ans Homme

## Offres globales seed (Super Admin)
- TVA par défaut : 20%, devise : EUR.
- Abonnement : « Abonnement mensuel 1000 » — 9,99 €/mois TTC (59,90 €/an TTC), 1000 crédits mensuels, actif/ouvert.
- Packs crédits : Pack 500 (9,99€), Pack 1000 (14,99€), Pack 2500 (29,99€), actifs/ouvert.

## (à utiliser pour le seed) Liens images à utiliser pour les "Position" (ne peut être utiliser qu'une fois)
- https://i.postimg.cc/W4Mwp4Zr/Gemini-Generated-Image-6bpiby6bpiby6bpi.png
- https://i.postimg.cc/zfnFDfh0/Gemini-Generated-Image-70zf9e70zf9e70zf.png
- https://i.postimg.cc/tghNRg6r/Gemini-Generated-Image-9laspe9laspe9las.png
- https://i.postimg.cc/7LvNyz5X/Gemini-Generated-Image-9nbncc9nbncc9nbn.png
- https://i.postimg.cc/BvWCGFjM/Gemini-Generated-Image-ak3205ak3205ak32.png
- https://i.postimg.cc/k5xvM5SS/Gemini-Generated-Image-dq72fedq72fedq72.png
- https://i.postimg.cc/s2p4f2Wm/Gemini-Generated-Image-nafbbenafbbenafb.png
- https://i.postimg.cc/d08jQ0C9/Gemini-Generated-Image-r3jjhnr3jjhnr3jj.png
- https://i.postimg.cc/2547j5Wd/Gemini-Generated-Image-q7a2l7q7a2l7q7a2.png
- https://i.postimg.cc/SKWfQK9f/Gemini-Generated-Image-ob9xeuob9xeuob9x.png
- https://i.postimg.cc/fbxfWbdj/Gemini-Generated-Image-nr8lxdnr8lxdnr8l.png
- https://i.postimg.cc/xdK3jdmv/Gemini-Generated-Image-w69zmgw69zmgw69z.png
- https://i.postimg.cc/JzmTFnh6/Gemini-Generated-Image-59vczf59vczf59vc.png
- https://i.postimg.cc/jSK815jZ/Gemini-Generated-Image-5nkvun5nkvun5nkv.png
- https://i.postimg.cc/Qds6ztMz/Gemini-Generated-Image-5x1h3e5x1h3e5x1h.png
- https://i.postimg.cc/13PWdtzW/Gemini-Generated-Image-8df1hr8df1hr8df1.png
- https://i.postimg.cc/T3Gksw-Pt/Gemini-Generated-Image-tqk096tqk096tqk0.png
- https://i.postimg.cc/CxYv21KQ/Gemini-Generated-Image-x6c36yx6c36yx6c3.png

## (à utiliser pour le seed) Liens images à utiliser pour les "Cours" (peut être réutiliser avec proportion) 
- https://i.postimg.cc/nL81tmX2/Gemini-Generated-Image-gwcxudgwcxudgwcx.png
- https://i.postimg.cc/43C1TcYz/Gemini-Generated-Image-jqc1bsjqc1bsjqc1.png
- https://i.postimg.cc/FKtxQSY3/Gemini-Generated-Image-qzcezwqzcezwqzce.png
- https://i.postimg.cc/9f3Bj9Dd/Gemini-Generated-Image-w7xzpow7xzpow7xz.png
- https://i.postimg.cc/KzbjFG77/Gemini-Generated-Image-15whr115whr115wh.png
- https://i.postimg.cc/XJWq3jK5/Gemini-Generated-Image-1zx8nf1zx8nf1zx8.png
- https://i.postimg.cc/26YymkdF/Gemini-Generated-Image-eor5freor5freor5.png
- https://i.postimg.cc/4dGyZfvt/Gemini-Generated-Image-hime9ohime9ohime.png
- https://i.postimg.cc/50Jy145L/Gemini-Generated-Image-nvh7mrnvh7mrnvh7.png
- https://i.postimg.cc/fLsyZz70/Gemini-Generated-Image-o5cowyo5cowyo5co.png
- https://i.postimg.cc/bJPr8y0x/Gemini-Generated-Image-o77i1wo77i1wo77i.png

## (à utiliser pour le seed) Liens images à utiliser pour les "Studios" (éviter d'utiliser plusieurs fois)
- https://i.postimg.cc/43ttzvzM/Gemini-Generated-Image-ed0cxzed0cxzed0c.png
- https://i.postimg.cc/cLPwgknd/Gemini-Generated-Image-l8ods0l8ods0l8od.png
- https://i.postimg.cc/Zq33rPr2/Gemini-Generated-Image-pkf3n7pkf3n7pkf3.png
- https://i.postimg.cc/jjNNz6zB/Gemini-Generated-Image-vbzhjgvbzhjgvbzh.png
 
## (à utiliser pour le seed) Liens images à utiliser pour les "Élèves" (ne peut être utiliser qu'une fois)
- Femme : https://i.postimg.cc/9fGYXf9g/Gemini-Generated-Image-ga85o3ga85o3ga85.png
- Femme : https://i.postimg.cc/wBhQxBNG/Gemini-Generated-Image-8a2y748a2y748a2y.png
- Femme : https://i.postimg.cc/Gpkx3pDf/Gemini-Generated-Image-lymsnclymsnclyms.png
- Femme : https://i.postimg.cc/MHGLjBbV/Gemini-Generated-Image-kk2x4wkk2x4wkk2x.png
- Femme : https://i.postimg.cc/gjBTy0N6/Gemini-Generated-Image-it8ll5it8ll5it8l.png
- Femme : https://i.postimg.cc/wMBrsNct/Gemini-Generated-Image-1s02y51s02y51s02.png
- Femme : https://i.postimg.cc/ZnDMPqVR/Gemini-Generated-Image-f3pd1gf3pd1gf3pd.png
- Femme : https://i.postimg.cc/xTtW2Mbv/Gemini-Generated-Image-z9rg13z9rg13z9rg.png
- Femme : https://i.postimg.cc/13Xb5Xpf/Gemini-Generated-Image-tddvoztddvoztddv.png
- Femme : https://i.postimg.cc/J4P9LZBj/Gemini-Generated-Image-ofh61jofh61jofh6.png
- Homme : https://i.postimg.cc/KYnDcYTw/Gemini-Generated-Image-h13y3wh13y3wh13y.png
- Homme : https://i.postimg.cc/VNjWsNtT/Gemini-Generated-Image-q1xtvnq1xtvnq1xt.png
- Homme : https://i.postimg.cc/k5xvM58r/Gemini-Generated-Image-hagw0mhagw0mhagw.png
- Homme : https://i.postimg.cc/C5K2f8Hf/Gemini-Generated-Image-krr7xokrr7xokrr7.png
- Homme : https://i.postimg.cc/6qQPGZL8/Gemini-Generated-Image-9ifeph9ifeph9ife.png
- Homme : https://i.postimg.cc/pr16QdqF/Gemini-Generated-Image-f6cfrf6cfrf6cfrf.png
- Homme : https://i.postimg.cc/VLD38nbM/Gemini-Generated-Image-i27lxyi27lxyi27l.png
- Homme : https://i.postimg.cc/7Ympk0T0/Gemini-Generated-Image-apgygfapgygfapgy.png

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
