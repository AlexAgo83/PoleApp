import "dotenv/config";

import {
  GameMode,
  MediaKind,
  PositionLevel,
  PositionType,
  Prisma,
  PrismaClient,
  Role,
  InvoiceStatus,
  ManualFinancialStatus,
  LearningStatus,
  NotificationKind,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

import { computeDefaultInvoiceAmountCents } from "@/lib/billing";

const prisma = new PrismaClient();

const PASSWORD = process.env.DATABASE_SEED_PWD;
if (!PASSWORD) {
  throw new Error("DATABASE_SEED_PWD is required to run the seed");
}
const SEED_PASSWORD: string = PASSWORD;
const POSITION_VIDEOS = [
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/01_xphtvq.mp4",
    publicId: "01_xphtvq",
  },
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/02_e8rhmg.mp4",
    publicId: "02_e8rhmg",
  },
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/03_yjmfi7.mp4",
    publicId: "03_yjmfi7",
  },
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/04_exjndq.mp4",
    publicId: "04_exjndq",
  },
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/05_flr6zp.mp4",
    publicId: "05_flr6zp",
  },
  {
    url: "https://res.cloudinary.com/dk8vz7gfe/video/upload/06_shrnly.mp4",
    publicId: "06_shrnly",
  },
];

const COURSE_PUBLIC_IDS = [
  "co_20_fuk1vy",
  "co_01_lzy3th",
  "co_06_etu7av",
  "co_09_wsasz3",
  "co_11_v4xldz",
  "co_05_d3ydvl",
  "co_03_qd4h2w",
  "co_02_i3tc6p",
  "co_12_ywslqp",
  "co_13_hagigy",
  "co_08_pbc6av",
  "co_16_ssjjra",
  "co_04_fujy4g",
  "co_07_u5usuw",
  "co_17_s1kvva",
  "co_10_jlkxrd",
  "co_15_dnmanu",
  "co_18_boe3wh",
  "co_14_oiur1r",
  "co_19_g7eim2",
];
const injuryTypes = [
  "Épaule",
  "Poignet",
  "Coude",
  "Bas du dos",
  "Genou",
  "Ventre",
  "Tête",
  "Bassin",
  "Jambes",
  "Bras",
];

const positionsBase: Array<{
  name: string;
  type: PositionType;
  level: PositionLevel;
  grips?: string;
  discipline?: string;
  descriptionText?: string;
}> = [
  // Autres disciplines (inchangées, affectées en rotation hors Pole)
  { name: "Jasmine", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Gemini", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Scorpio", type: PositionType.TRICK, level: PositionLevel.ADVANCED, grips: "CUP" },
  { name: "Front Hook Transition", type: PositionType.TRANSITION, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Basic Climb", type: PositionType.STRENGTH, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Shoulder Mount Prep", type: PositionType.STRENGTH, level: PositionLevel.INTERMEDIATE, grips: "FOREARM" },
  { name: "Warmup Flow 1", type: PositionType.WARMUP, level: PositionLevel.BEGINNER, grips: "OTHER" },
  { name: "Carousel Spin", type: PositionType.SPIN, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Cradle Spin", type: PositionType.SPIN, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Butterfly", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Flatline Scorpio", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Superman", type: PositionType.TRICK, level: PositionLevel.ADVANCED, grips: "CUP" },
  { name: "Aysha", type: PositionType.TRICK, level: PositionLevel.ADVANCED, grips: "CUP" },
  { name: "Back-to-Pole", type: PositionType.TRANSITION, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Fan Kick", type: PositionType.STRENGTH, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Invert Prep (V-Lift)", type: PositionType.STRENGTH, level: PositionLevel.INTERMEDIATE, grips: "FOREARM" },
  { name: "Dynamic Leg Swings", type: PositionType.WARMUP, level: PositionLevel.BEGINNER, grips: "OTHER" },
  { name: "Figurehead Spin", type: PositionType.SPIN, level: PositionLevel.INTERMEDIATE, grips: "TRUE" },
  { name: "Carousel Back Spin", type: PositionType.SPIN, level: PositionLevel.INTERMEDIATE, grips: "TRUE" },
  { name: "Inside Leg Hang", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Cupid", type: PositionType.TRICK, level: PositionLevel.INTERMEDIATE, grips: "CUP" },
  { name: "Shoulder Stand", type: PositionType.STRENGTH, level: PositionLevel.INTERMEDIATE, grips: "FOREARM" },
  { name: "Iron X Prep", type: PositionType.STRENGTH, level: PositionLevel.ADVANCED, grips: "FOREARM" },
  { name: "Body Wave Transition", type: PositionType.TRANSITION, level: PositionLevel.BEGINNER, grips: "OTHER" },
  { name: "Shoulder Slide Transition", type: PositionType.TRANSITION, level: PositionLevel.INTERMEDIATE, grips: "OTHER" },
  { name: "Wrist Relief Flow", type: PositionType.TRANSITION, level: PositionLevel.BEGINNER, grips: "OTHER" },
  { name: "Back Bend Flow", type: PositionType.WARMUP, level: PositionLevel.BEGINNER, grips: "OTHER" },
  { name: "Side Climb", type: PositionType.STRENGTH, level: PositionLevel.INTERMEDIATE, grips: "TRUE" },
  { name: "Phoenix Spin", type: PositionType.SPIN, level: PositionLevel.ADVANCED, grips: "TRUE" },
];

const positionsData: Array<{
  name: string;
  type: PositionType;
  level: PositionLevel;
  grips?: string;
  discipline?: string;
  descriptionText?: string;
  tips?: string;
  contraindications?: string;
}> = [];

const normalizeHeading = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

function parseDocPositions() {
  try {
    const docPath = path.resolve(process.cwd(), "logics/knowledge/db_positions.md");
    const content = fs.readFileSync(docPath, "utf8");
    const blockRegex = /^##\s+(.+)\n([\s\S]*?)(?=^##\s+|\Z)/gm;
    const extras: typeof positionsData = [];
    const seen = new Set(positionsData.map((p) => normalizeHeading(p.name)));

    const normalizeText = (raw: string) =>
      raw
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

    const mapType = (raw: string): PositionType | null => {
      const t = normalizeText(raw);
      if (t.includes("spin")) return PositionType.SPIN;
      if (t.includes("transition")) return PositionType.TRANSITION;
      if (t.includes("warm") || t.includes("echauff") || t.includes("cool")) return PositionType.WARMUP;
      if (t.includes("renfo") || t.includes("strength")) return PositionType.STRENGTH;
      if (t.includes("trick")) return PositionType.TRICK;
      return null;
    };
    const mapLevel = (raw: string): PositionLevel | null => {
      const l = normalizeText(raw);
      if (l.includes("avanc")) return PositionLevel.ADVANCED;
      if (l.includes("inter")) return PositionLevel.INTERMEDIATE;
      if (l.includes("debut") || l.includes("init") || l.includes("innitiation")) return PositionLevel.BEGINNER;
      return null;
    };

    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      const heading = match[1].trim();
      const body = match[2];
      const norm = normalizeHeading(heading);
      if (!norm || seen.has(norm)) continue;

      const typeLine = body.match(/-+\s*Type:\s*([^\n]+)/i);
      const levelLine = body.match(/-+\s*Niveau:\s*([^\n]+)/i);
      const gripLine = body.match(/-+\s*Grip:\s*([^\n]+)/i);
      const contraLine = body.match(/-+\s*Contre[- ]indications?:\s*([^\n]+)/i);
      const tipsLine = body.match(/-+\s*Conseils?:\s*([^\n]+)/i);
      const descLines = [...body.matchAll(/^>\s?(.*)$/gm)].map((m) => m[1]?.trim()).filter(Boolean);
      const cueLines = descLines.filter((l) => /^cues\s*:/i.test(l)).map((l) => l.replace(/^cues\s*:\s*/i, "").trim());
      const descWithoutCues = descLines.filter((l) => !/^cues\s*:/i.test(l));

      const type = typeLine ? mapType(typeLine[1]) : null;
      const level = levelLine ? mapLevel(levelLine[1]) : null;
      if (!type || !level) continue;

      const grip = gripLine?.[1]?.includes("Non renseign") ? undefined : gripLine?.[1]?.trim() || undefined;
      // Conserve explicit sauts de ligne pour un rendu lisible côté UI
      const descriptionText = descWithoutCues.length > 0 ? descWithoutCues.join("\n") : undefined;
      const tipsText = [tipsLine?.[1]?.trim(), cueLines.length > 0 ? cueLines.join("\n") : undefined]
        .filter(Boolean)
        .join("\n") || undefined;
      const contraindicationsText = contraLine?.[1]?.trim() || undefined;

      extras.push({
        name: heading,
        type,
        level,
        discipline: "Pole",
        grips: grip,
        descriptionText,
        tips: tipsText,
        contraindications: contraindicationsText,
      });
      seen.add(norm);
    }
    return extras;
  } catch {
    return [];
  }
}

// Positions Pole issues du fichier normalisé
const positionNameSet = new Set<string>();
const addPositions = (items: typeof positionsData) => {
  for (const item of items) {
    const norm = normalizeHeading(item.name);
    if (positionNameSet.has(norm)) continue;
    positionNameSet.add(norm);
    positionsData.push(item);
  }
};

// Positions Pole issues du fichier normalisé
addPositions(parseDocPositions());
// Autres disciplines conservées
addPositions(positionsBase);

const disciplinesCatalog = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#d946ef" },
  { name: "Souplesse", color: "#22c55e" },
  { name: "Pilates", color: "#f59e0b" },
  { name: "Conditioning", color: "#6366f1" },
];

const PRIMARY_DISCIPLINE = disciplinesCatalog[0].name;
const NOW_TS = Date.now();

const muscleCatalog = [
  { name: "Deltoïdes", kind: "MUSCLE" },
  { name: "Grand dorsal", kind: "MUSCLE" },
  { name: "Biceps brachial", kind: "MUSCLE" },
  { name: "Triceps", kind: "MUSCLE" },
  { name: "Avant-bras", kind: "MUSCLE" },
  { name: "Abdominaux profonds", kind: "MUSCLE" },
  { name: "Fessiers", kind: "MUSCLE" },
  { name: "Quadriceps", kind: "MUSCLE" },
  { name: "Ischio-jambiers", kind: "MUSCLE" },
  { name: "Adducteurs", kind: "MUSCLE" },
  { name: "Épaules", kind: "ARTICULATION" },
  { name: "Poignets", kind: "ARTICULATION" },
  { name: "Coudes", kind: "ARTICULATION" },
  { name: "Hanches", kind: "ARTICULATION" },
  { name: "Genoux", kind: "ARTICULATION" },
  { name: "Rachis lombaire", kind: "ARTICULATION" },
  { name: "Chevilles", kind: "ARTICULATION" },
];

const muscleTargetsByType: Record<PositionType, string[]> = {
  SPIN: ["Deltoïdes", "Avant-bras", "Épaules"],
  TRICK: ["Grand dorsal", "Biceps brachial", "Triceps", "Épaules", "Abdominaux profonds"],
  TRANSITION: ["Abdominaux profonds", "Hanches", "Épaules"],
  WARMUP: ["Épaules", "Hanches", "Rachis lombaire"],
  STRENGTH: ["Grand dorsal", "Biceps brachial", "Triceps", "Fessiers", "Abdominaux profonds"],
};

const buildPositionDescription = (pos: { name: string; type: PositionType; level: PositionLevel }) => {
  const intro = `${pos.name} est une position de type ${pos.type.toLowerCase()} destinée aux élèves de niveau ${pos.level.toLowerCase()}.`;
  const technique =
    " On recherche un placement précis des épaules, un engagement du centre et une attention constante sur les points de contact pour maintenir la ligne et la fluidité.";
  const focus =
    " Le travail met l'accent sur la respiration, la connexion au sol et la capacité à enchaîner sans à-coups, tout en conservant une marge de sécurité confortable.";
  const coaching =
    " Les consignes clés incluent : activer le grip, garder les hanches alignées, contrôler la descente et anticiper la sortie vers la transition suivante.";
  const benefits =
    " Cette position renforce la stabilité, améliore la proprioception et prépare les variations plus avancées en douceur, que ce soit en spin ou en static.";
  const text = `${intro}${technique}${focus}${coaching}${benefits}`;
  if (text.length >= 320) return text;
  const padding = " Revoie les fondamentaux et ajuste ton tempo pour garder du contrôle.";
  return (text + padding.repeat(4)).slice(0, 340);
};

const schoolsList = [
  "APEX",
  "Horizon",
  "Académie Arabesque",
  "Pulsation Pole Center",
  "Atelier du Mouvement",
  "Impulsion Pole",
  "Latitude Pole",
  "Rythme & Grâce",
  "Équilibre",
];

const SCHOOL_PUBLIC_IDS = ["sc_02_iidqs5", "sc_01_hgtgz4", "sc_03_kouzh8"];
const SCHOOL_WEBSITE = "http://www.google.com";
const PARTNER_AMAZON = {
  name: "Amazon",
  website: "https://www.amazon.fr",
  description: "Produits pole dance et accessoires",
  links: [
    { label: "Grip Spray", url: "https://amzn.eu/d/cDnGqVK", category: "PRODUIT" },
    { label: "Barre Pole Dance", url: "https://amzn.eu/d/5fN1EhI", category: "PRODUIT" },
    { label: "Tenue exotique", url: "https://amzn.eu/d/gPja1CW", category: "PRODUIT" },
    { label: "Support plafond", url: "https://amzn.eu/d/gPja1CW", category: "PRODUIT" },
  ],
};

const studiosList = [
  "Nova",
  "Aérial",
  "Pulse",
  "Fusion",
  "Harmonie",
  "Vortex",
  "Pivot",
  "Eclipse",
  "Tempo",
];

const STUDIO_PUBLIC_IDS = ["st_02_csmng8", "st_05_iryeuf", "st_01_os2kvs", "st_04_xfg65z", "st_03_ywhrxt", "st_06_o2bp6z"];
const defaultSubscriptionOffers = [
  {
    name: "Abonnement mensuel 1000",
    monthlyPriceCents: 999,
    annualPriceCents: 5990,
    monthlyCredits: 1000,
    vatPercent: 20,
    sortOrder: 1,
    defaultTerm: "MONTHLY",
  },
  {
    name: "Abonnement mensuel 2000",
    monthlyPriceCents: 1799,
    annualPriceCents: 9990,
    monthlyCredits: 2000,
    vatPercent: 20,
    sortOrder: 2,
    defaultTerm: "MONTHLY",
  },
  {
    name: "Abonnement mensuel 5000",
    monthlyPriceCents: 3499,
    annualPriceCents: 19990,
    monthlyCredits: 5000,
    vatPercent: 20,
    sortOrder: 3,
    defaultTerm: "MONTHLY",
  },
];

const defaultCreditPacks = [
  { name: "Pack 500", credits: 500, priceCents: 999, vatPercent: 20, sortOrder: 1 },
  { name: "Pack 1000", credits: 1000, priceCents: 1499, vatPercent: 20, sortOrder: 2 },
  { name: "Pack 2500", credits: 2500, priceCents: 2999, vatPercent: 20, sortOrder: 3 },
];

const courseNames = [
  "Flow Débutant",
  "Spin & Transitions",
  "Power Tricks",
  "Fluidité & Musicalité",
  "Stretch & Flex",
  "Conditioning Aérien",
  "Routine Équilibre",
  "Core & Grips",
  "Flow Intermédiaire",
  "Spins Avancés",
  "Mobility & Lines",
  "Strength & Control",
  "Spin en douceur",
  "Flow Créatif",
  "Routine Express",
  "Technique & Grips",
  "Spin & Control",
  "Flow Choré",
  "Tricks Intermédiaire",
];

const seedPresetsData = [
  {
    title: "Equinox Lines",
    discipline: "Pole",
    premiumRequired: true,
    description:
      "Choreographie pole inter-avancee qui privilégie les lignes longues et les transitions circulaires. On démarre par une montée contrôlée avec changement de lead, puis un spin de connexion pour installer le souffle. Le coeur du combo combine inside leg hang, variations de scorpio, body waves contre la pole et un passage power léger qui prépare à une rotation en dehors de l’axe. La descente alterne glissés bas et pivot sur demi-pointes pour conserver la musicalité. Chaque bloc contient des cues de respiration, des options de main libre et des variantes pour ménager les poignets. En fin de combo, un break musical invite à jouer avec le regard et la projection scénique. Pensé pour durer plus d’une minute trente, il développe endurance, contrôle scapulaire, et propreté des lignes sans surcharge cardio, tout en laissant la place à l’expression personnelle.",
    imagePublicId: "ps_008_ymuw4k",
    videoPublicId: "ps_001_qo2alr",
    priceCredits: 0,
  },
  {
    title: "North Star Flow",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 120,
    description:
      "Flow narratif inspiré d’une ascension nocturne. On alterne pivots serrés et ouvertures de hanches pour créer des effets de halo autour de la pole. Le combo inclut un climb lent, un switch jambe interne/externe, un cradle revisité en rotation lente et une séquence au sol avec knee slides pour calmer le rythme. Le passage central enchaîne inside leg hang, variations de jasmine, drop contrôlé et spin relâché, ce qui oblige à gérer l’élan avec précision. Chaque transition est ponctuée d’indices de musicalité pour que le groupe respire ensemble. Les consignes insistent sur l’allongement de la nuque, la connexion des omoplates et la capacité à revenir en base pour réaccrocher du contact. Adapté pour 6 à 10 positions selon la longueur musicale, il s’utilise en répétition de show ou en atelier d’endurance technique.",
    imagePublicId: "ps_011_kyrvwq",
    videoPublicId: "ps_001_qo2alr",
  },
  {
    title: "Satellite Breathwork",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 90,
    description:
      "Routine de 8 à 12 positions centrée sur la respiration et la stabilité scapulaire. On commence par un floor entry en spirale, un step around décollé et une montée progressive en deux grips pour placer les épaules. Le coeur inclut un inside leg hang tenu trois temps, un passage vers cupid et un slide contrôlé vers un back hook spin ralenti. Chaque segment est associé à un tempo respiratoire (inspiration en ouverture, expiration en traction). La descente se fait en low flow avec tours de bassin lents et appuis genoux pour protéger les poignets fatigués. Un pont de musicalité laisse la possibilité d’insérer un accent power (shoulder mount prep ou climb rapide) sans casser le phrasé. Pensé pour les cours mixtes, ce combo offre des options début inter et avancé sur les sorties, afin que chacun construise son expression sans perdre le fil du souffle.",
    imagePublicId: "ps_009_wceu3b",
    videoPublicId: "ps_001_qo2alr",
  },
  {
    title: "Aurora Spin Story",
    discipline: "Pole",
    premiumRequired: true,
    description:
      "Chorégraphie lumineuse qui joue sur les contrastes haut/bas. Elle débute par un static spin puis un climb alterné pour installer les appuis, suivi d’une variation de gemini avec changement de regard. Le centre du combo exploite un enchaînement butterfly soft, transition en side sit et drop amorti vers le sol. On enchaîne ensuite un wave en contre-pole, un tour de hanche et un roll up pour remonter sur la musique. Les consignes insistent sur la qualité du déploiement des bras, la projection des lignes et la gestion de l’axe lorsque l’on sort du contact principal. Chaque section est décomposée pour proposer 6 à 10 positions selon le niveau, avec des drill de placement des pieds et des rappels de sécurité. Idéal pour travailler l’endurance artistique tout en restant dans une intensité musculaire modérée.",
    imagePublicId: "ps_010_fjaebd",
    videoPublicId: "ps_001_qo2alr",
    priceCredits: 150,
  },
  {
    title: "Gravity Sketch",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 80,
    description:
      "Flow créatif pensé pour casser les patterns habituels. On utilise des entrées obliques, des changements de sens brusques et des suspensions courtes pour surprendre le public. Le combo propose une base de 7 à 9 positions : step around inversé, side climb en contrôle, flatline scorpio doux, transition body wave et sortie low avec knee slides. Au centre, un arrêt musical permet d’ajouter un micro-shape (micro backbend ou cambré thoracique) avant de repartir en spin lent. Les cues mettent l’accent sur la recherche de l’axe personnel, l’utilisation du regard pour guider le rythme et la gestion fine des grips pour éviter la fatigue de l’avant-bras. Le final se termine par un pivot au sol qui garde l’énergie suspendue, idéal pour un run filmé ou une présentation courte.",
    imagePublicId: "ps_006_xesgal",
    videoPublicId: "ps_001_qo2alr",
  },
  {
    title: "Midnight Transit",
    discipline: "Pole",
    premiumRequired: true,
    description:
      "Combo intermédiaire rapide (10 à 12 positions) qui mélange dynamiques et pauses très marquées. On commence par un swing step, un climb serré, puis un passage en outside leg hang pour créer un effet de suspension. Le coeur inclut un drop contrôlé, un fan kick précis et une transition en spin low pour récupérer le souffle. Les consignes rappellent d’ancrer les omoplates, de relâcher la nuque et de synchroniser l’ouverture de la cage thoracique avec les accents musicaux. Une séquence centrale invite à tester un petit power (ayesha entry en statique ou en spinning pour les avancés) avec option de substitution plus douce. La sortie se fait par une descente en glissé sur les pointes, un roll du buste et un final bras ouverts pour garder la projection scénique. Idéal pour travailler cardio, précision et propreté des lignes.",
    imagePublicId: "ps_003_xauurl",
    videoPublicId: "ps_001_qo2alr",
    priceCredits: 0,
  },
  {
    title: "Amber Low Flight",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 60,
    description:
      "Séquence low flow de 6 à 8 positions qui valorise les déplacements proches du sol. On enchaîne rolls contrôlés, transitions en appui avant-bras, half spins et pivots sur genoux pour garder un rythme continu. Un mini-climb est proposé en option pour revenir en hauteur sans casser la musicalité. Les cues insistent sur la protection des poignets (angle doux), l’engagement du centre et l’ouverture du bassin pour éviter la crispation. La fin joue sur des appuis alternés pieds/genoux, un slide vers l’extérieur et un regard très frontal pour conclure. Parfait pour intégrer les débutants intermédiaires dans un atelier choré, tout en offrant aux avancés des options de flex ou de micro power sans perdre l’esthétique fluide.",
    imagePublicId: "ps_005_xbzstp",
    videoPublicId: "ps_001_qo2alr",
  },
  {
    title: "Apogee Draft",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 110,
    description:
      "Combo d’endurance créative (10 à 12 positions) conçu pour consolider la propreté des inversions basses. On entre par un step around, on enchaîne un climb deux temps et une inversion contrôlée vers flatline scorpio. Un pivot de hanches amène vers inside leg hang, puis un slide vers le sol réinstalle le contact. Le milieu du combo propose un enchaînement de spins courts, un hook dynamique et un reset calme en contre-pole. La structure invite à doser l’énergie : bursts sur les spins, respiration lente sur les phases de suspension. Les options de difficulté permettent de substituer un ayesha ou un shoulder mount par un power spin moins exigeant. Le but est de travailler coordination, endurance bras et netteté des lignes tout en conservant une narration chorégraphique lisible.",
    imagePublicId: "ps_007_hel2i4",
    videoPublicId: "ps_001_qo2alr",
  },
  {
    title: "Lunar Blueprint",
    discipline: "Pole",
    premiumRequired: true,
    description:
      "Choreographie premium bâtie comme un plan en trois actes. Acte 1 : montée progressive, spin de connexion et ouverture de bras pour installer l’espace. Acte 2 : section technique avec inside leg hang, variations de cupid, passage vers butterfly et drop amorti. Acte 3 : retour au sol avec waves, demi-lunes de bassin et final suspendu sur la pointe pour garder le public en haleine. La description détaille les placements de mains, les consignes de souffle, les options de jambes tendues ou fléchies et les rappels de sécurité sur la sortie. On y trouve aussi des variantes pour réduire la charge sur les poignets, et des idées de musicalité (silences, accents, reprises). Avec 9 à 12 positions, ce combo sert autant de pièce de scène que d’atelier avancé pour travailler la continuité malgré la fatigue.",
    imagePublicId: "ps_004_c1vw8c",
    videoPublicId: "ps_001_qo2alr",
    priceCredits: 180,
  },
  {
    title: "Solar Echo",
    discipline: "Pole",
    premiumRequired: false,
    priceCredits: 70,
    description:
      "Routine lumineuse orientée flow continu, pensée pour alterner expansion et recentrage. On démarre par une montée fluide, une transition en leg hang adoucie, puis une série de tours basse intensité pour lisser le cardio. Le coeur joue sur des ouvertures de bras et des micro-breaks pour souffler avant une relance dynamique. Les cues insistent sur la respiration latérale, la stabilité des poignets et le regard engagé. Séquence idéale pour consolider l’endurance artistique sur 6 à 10 positions avec un final relâché au sol.",
    imagePublicId: "ps_001_wcashm",
    videoPublicId: "ps_001_qo2alr",
  },
];

type Gender = "F" | "M";

const people: { name: string; age: number; gender: Gender }[] = [
  { name: "Léa Morel", age: 22, gender: "F" },
  { name: "Julien Caron", age: 28, gender: "M" },
  { name: "Maya Lefèvre", age: 19, gender: "F" },
  { name: "Arthur Dubois", age: 30, gender: "M" },
  { name: "Inès Laurent", age: 24, gender: "F" },
  { name: "Amine Petit", age: 33, gender: "M" },
  { name: "Camille Simon", age: 21, gender: "F" },
  { name: "Léo Bernard", age: 27, gender: "F" },
  { name: "Zoé Fournier", age: 25, gender: "F" },
  { name: "Raphaël Michel", age: 29, gender: "M" },
  { name: "Nora Garcia", age: 18, gender: "F" },
  { name: "Hugo Martin", age: 32, gender: "M" },
  { name: "Eva Roux", age: 23, gender: "F" },
  { name: "Thomas Girard", age: 35, gender: "M" },
  { name: "Sarah Lambert", age: 26, gender: "F" },
  { name: "Maxime Lopez", age: 31, gender: "M" },
  { name: "Alice Robert", age: 20, gender: "F" },
  { name: "Yanis Colin", age: 34, gender: "M" },
  { name: "Chloé Didier", age: 28, gender: "F" },
  { name: "Victor Marin", age: 40, gender: "M" },
];

const defaultAvatarPublicIds = (process.env.CLOUDINARY_AVATAR_DEFAULT_IDS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const femaleAvatarDefaults = defaultAvatarPublicIds.filter((id) => id.toLowerCase().startsWith("fe_"));
const maleAvatarDefaults = defaultAvatarPublicIds.filter((id) => id.toLowerCase().startsWith("ma_"));

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makePersonFallback(counter: number): { name: string; age: number; gender: Gender } {
  const genders: Gender[] = ["F", "M"];
  const gender = genders[counter % 2];
  return {
    name: `User ${counter}`,
    age: 20 + (counter % 21),
    gender,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function resetAll() {
  await prisma.$executeRawUnsafe(`TRUNCATE
    "CourseAttendance",
    "CourseNote",
    "CoursePosition",
    "CourseRecommendation",
    "Course",
    "StudentPositionProgress",
    "TeacherFavoritePosition",
    "StudentFavoritePosition",
    "PositionTarget",
    "Muscle",
    "PositionMedia",
    "Position",
    "Discipline",
    "AuditLog",
    "CreditPackOffer",
    "SubscriptionOffer",
    "GlobalSetting",
    "Invoice",
    "Purchase",
    "SponsoredLink",
    "Partner",
    "PartnerEvent",
    "Studio",
    "GameSession",
    "StudentInjury",
    "InjuryType",
    "Notification",
    "User",
    "School"
    CASCADE;`);
}

async function seedInjuryTypes() {
  await Promise.all(
    injuryTypes.map((name) =>
      prisma.injuryType.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
}

async function seedMuscles() {
  const created = await Promise.all(
    muscleCatalog.map((muscle) =>
      prisma.muscle.create({
        data: {
          name: muscle.name,
          kind: muscle.kind,
        },
      })
    )
  );
  return created;
}

async function seedPositions({
  muscles,
  teachers,
  priorityTeacherId,
  disciplines,
}: {
  muscles: { id: string; name: string }[];
  teachers: { id: string }[];
  priorityTeacherId?: string | null;
  disciplines: SeedDiscipline[];
}) {
  const muscleMap = new Map(muscles.map((m) => [m.name, m.id]));
  const positionsByTeacher: Record<string, string[]> = {};
  const cycleDisciplines =
    disciplines.filter((d) => d.name.toLowerCase() !== "pole") ?? disciplines;
  const photoPool = [
    "po_01_haci3z",
    "po_02_fl8akp",
    "po_03_tdkgoo",
    "po_04_xysi2j",
    "po_05_xlfq5t",
    "po_06_lx7gwx",
    "po_07_xisr9g",
    "po_08_aexxm6",
    "po_09_guym8w",
    "po_10_olw4fz",
    "po_11_cygxow",
    "po_12_g9vukb",
    "po_13_vdwgew",
    "po_14_nrxlmz",
    "po_15_o3nbw9",
    "po_16_dqdlc4",
    "po_17_rocm06",
    "po_18_xaekjy",
    "po_19_dfrqlk",
    "po_20_akrajr",
  ];

  const createdPositions = [];
  for (let i = 0; i < positionsData.length; i += 1) {
    const pos = positionsData[i];
    const disciplinePick =
      (pos.discipline
        ? disciplines.find((d) => d.name.toLowerCase() === pos.discipline!.toLowerCase())
        : null) ??
      (cycleDisciplines.length > 0
        ? cycleDisciplines[i % cycleDisciplines.length]
        : disciplines[i % disciplines.length] ?? disciplines[0]);
    const discipline = disciplinePick?.name ?? pos.discipline ?? PRIMARY_DISCIPLINE;
    const disciplineId = disciplinePick?.id ?? null;
    const muscleTargets = (muscleTargetsByType[pos.type] ?? [])
      .map((name) => muscleMap.get(name))
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ muscleId: id }));
    const creator =
      priorityTeacherId && i < 5
        ? { id: priorityTeacherId }
        : teachers.length > 0
        ? teachers[Math.floor(Math.random() * teachers.length)]
        : null;
    const videoAsset = POSITION_VIDEOS[i % POSITION_VIDEOS.length];
    const created = await prisma.position.create({
      data: {
        name: pos.name,
        type: pos.type,
        discipline,
        levelRequired: pos.level,
        grips: pos.grips,
        description: pos.descriptionText ?? buildPositionDescription(pos),
        tips: pos.tips,
        contraindications: pos.contraindications,
        createdByUserId: creator?.id,
        media: {
          create: [
            {
              publicId: photoPool[i % photoPool.length],
              kind: MediaKind.PHOTO,
            },
            ...(videoAsset?.publicId
              ? [
                  {
                    publicId: videoAsset.publicId,
                    kind: MediaKind.VIDEO,
                  } satisfies Prisma.PositionMediaCreateWithoutPositionInput,
                ]
              : []),
          ],
        },
        ...(muscleTargets.length > 0
          ? {
              muscles: {
                create: muscleTargets,
              },
            }
          : {}),
        disciplineId: disciplineId ?? undefined,
      },
    });
    createdPositions.push(created);
    if (creator?.id) {
      positionsByTeacher[creator.id] = [...(positionsByTeacher[creator.id] ?? []), created.id];
    }
  }
  return { createdPositions, positionsByTeacher };
}

type SeedDiscipline = { id: string; name: string; color?: string | null };

async function seedDisciplines(schools: { id: string }[]) {
  const bySchool: Record<string, SeedDiscipline[]> = {};
  const rows = await Promise.all(
    disciplinesCatalog.map((disc) =>
      prisma.discipline.upsert({
        where: { name: disc.name },
        update: { color: disc.color },
        create: { name: disc.name, color: disc.color },
      })
    )
  );
  const shared = rows.map((row) => ({ id: row.id, name: row.name, color: row.color }));
  for (const school of schools) {
    bySchool[school.id] = shared;
  }

  return bySchool;
}

async function seedSchoolsAndUsers() {
  // On prend les 2 premières écoles de la liste
  const selectedSchools = schoolsList.slice(0, 2);
  const schools = await Promise.all(
    selectedSchools.map((name, idx) =>
      prisma.school.create({
        data: {
          name,
          photoPublicId: SCHOOL_PUBLIC_IDS[idx % SCHOOL_PUBLIC_IDS.length],
          website: SCHOOL_WEBSITE,
        },
      })
    )
  );

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const femaleAvatarPool = shuffle(femaleAvatarDefaults);
  const maleAvatarPool = shuffle(maleAvatarDefaults);

  const takeAvatarPublicId = (gender?: Gender | null) => {
    if (gender === "F" && femaleAvatarPool.length) return femaleAvatarPool.shift()!;
    if (gender === "M" && maleAvatarPool.length) return maleAvatarPool.shift()!;
    if (femaleAvatarPool.length) return femaleAvatarPool.shift()!;
    if (maleAvatarPool.length) return maleAvatarPool.shift()!;
    return null;
  };

  // Fixed accounts on school1
  const fixedAccounts: {
    email: string;
    role: Role;
  premium: boolean;
  name: string;
  schoolIdx: number;
  age?: number;
  gender?: Gender;
  verifiedAt?: Date | null;
  disabledAt?: Date | null;
  canCreatePositionAndPreset?: boolean;
  canDeletePositionAndPreset?: boolean;
}[] = [
  { email: "admin@poleapp.test", role: Role.SCHOOL_ADMIN, premium: true, name: "Admin Admin", schoolIdx: 0, age: 40 },
  {
    email: "teacher@poleapp.test",
    role: Role.TEACHER,
      premium: true,
      name: "Elza Martinez",
      schoolIdx: 0,
      age: 32,
      gender: "F",
    },
    {
      email: "student1@poleapp.test",
      role: Role.STUDENT,
      premium: false,
      name: "Anna Douchez",
      schoolIdx: 0,
      age: 31,
      gender: "F" as Gender,
    },
    {
      email: "student2@poleapp.test",
      role: Role.STUDENT,
      premium: true,
      name: "Carlo Mendes",
      schoolIdx: 0,
      age: 35,
      gender: "M" as Gender,
    },
    {
      email: "student-unverified@poleapp.test",
      role: Role.STUDENT,
      premium: false,
      name: "QA Unverified",
      schoolIdx: 0,
      age: 26,
      verifiedAt: null,
    },
    {
      email: "student-disabled@poleapp.test",
      role: Role.STUDENT,
      premium: false,
      name: "QA Disabled",
      schoolIdx: 0,
      age: 28,
      disabledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      email: "teacher-create-off@poleapp.test",
      role: Role.TEACHER,
      premium: false,
      name: "Prof Create Off",
      schoolIdx: 0,
      age: 34,
      gender: "F" as Gender,
      canCreatePositionAndPreset: false,
      canDeletePositionAndPreset: true,
    },
    {
      email: "teacher-disabled@poleapp.test",
      role: Role.TEACHER,
      premium: false,
      name: "Prof Disabled",
      schoolIdx: 0,
      age: 36,
      gender: "F" as Gender,
      disabledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      canCreatePositionAndPreset: true,
      canDeletePositionAndPreset: true,
    },
  ];

  const teachers: { id: string; schoolId: string; email?: string }[] = [];
  const students: { id: string; schoolId: string }[] = [];
  const admins: { id: string; schoolId: string }[] = [];

  for (const acc of fixedAccounts) {
    const created = await prisma.user.create({
      data: {
        email: acc.email,
        passwordHash,
        role: acc.role,
        isPremium: acc.premium,
        schoolId: schools[acc.schoolIdx].id,
        name: acc.name,
        avatarPublicId: takeAvatarPublicId(acc.gender ?? null),
        age: acc.age ?? null,
        credits: acc.role === Role.STUDENT ? 1000 : undefined,
        verifiedAt: acc.verifiedAt ?? new Date(),
        disabledAt: acc.disabledAt ?? null,
        canCreatePositionAndPreset: acc.canCreatePositionAndPreset ?? true,
        canDeletePositionAndPreset: acc.canDeletePositionAndPreset ?? true,
        diplomas:
          acc.role === Role.TEACHER
            ? acc.email === "teacher@poleapp.test"
              ? "BPJEPS; Certificat Pole avancé; Formation enseignement chorégraphique"
              : "Certificat Pole avancé; Formation enseignement"
            : undefined,
      },
    });
    if (acc.role === Role.TEACHER) {
      teachers.push({ id: created.id, schoolId: schools[acc.schoolIdx].id, email: acc.email });
    }
    if (acc.role === Role.STUDENT) {
      students.push({ id: created.id, schoolId: schools[acc.schoolIdx].id });
    }
    if (acc.role === Role.SCHOOL_ADMIN) {
      admins.push({ id: created.id, schoolId: schools[acc.schoolIdx].id });
    }
  }

  // Distribute remaining names for teachers/students
  const peoplePool = [...people];
  let fallbackCounter = 1;

  const pickStudentAvatar = (gender: Gender) => {
    if (gender === "F" && femaleAvatarPool.length) return femaleAvatarPool.shift()!;
    if (gender === "M" && maleAvatarPool.length) return maleAvatarPool.shift()!;
    if (femaleAvatarPool.length) return femaleAvatarPool.shift()!;
    if (maleAvatarPool.length) return maleAvatarPool.shift()!;
    return null;
  };

  const pickPerson = (): { name: string; age: number; gender: Gender } =>
    peoplePool.length ? peoplePool.shift()! : makePersonFallback(fallbackCounter++);

  for (const school of schools) {
    // 2 profs
    for (let i = 0; i < 2; i += 1) {
      const person = pickPerson();
      const created = await prisma.user.create({
        data: {
          email: `teacher${i + 1}.${slugify(school.name)}@poleapp.test`,
          passwordHash,
          role: Role.TEACHER,
          isPremium: true,
          schoolId: school.id,
          name: person.name,
          age: person.age,
          avatarPublicId: takeAvatarPublicId(person.gender),
          diplomas: "Certificat Pole; BPJEPS option danse; Formation pédagogique",
        },
      });
      teachers.push({ id: created.id, schoolId: school.id });
    }
    // 10 élèves (1 sur 2 premium)
    for (let i = 0; i < 10; i += 1) {
      const person = pickPerson();
      const created = await prisma.user.create({
        data: {
          email: `student${i + 1}.${slugify(school.name)}@poleapp.test`,
          passwordHash,
          role: Role.STUDENT,
          isPremium: i % 2 === 0,
          schoolId: school.id,
          name: person.name,
          age: person.age,
          avatarPublicId: pickStudentAvatar(person.gender),
          credits: 500,
        },
      });
      students.push({ id: created.id, schoolId: school.id });
    }
  }

  return { schools, teachers, students, admins };
}

function buildSchedule(options: { daysPast: number; daysFuture: number; total: number }, reserved: { start: Date; end: Date }[]) {
  const { daysPast, daysFuture, total } = options;
  const slots: { date: Date; duration: number }[] = [];
  const now = new Date();
  const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const durations = [30, 45, 60, 75, 90];
  const times = [16, 17, 18, 19, 20, 21];
  const overlaps = (start: Date, duration: number) => {
    const end = new Date(start.getTime() + duration * 60_000);
    return (
      reserved.some((r) => start < r.end && r.start < end) ||
      slots.some((s) => {
        const sEnd = new Date(s.date.getTime() + s.duration * 60_000);
        return start < sEnd && s.date < end;
      })
    );
  };

  // 5 passés
  for (let i = 0; i < 5 && slots.length < total; i += 1) {
    const dayOffset = -rng(1, daysPast);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    const duration = durations[rng(0, durations.length - 1)];
    if (!overlaps(start, duration)) {
      slots.push({ date: start, duration });
    }
  }
  // futurs
  while (slots.length < total) {
    const dayOffset = rng(0, daysFuture);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    const duration = durations[rng(0, durations.length - 1)];
    if (!overlaps(start, duration)) {
      slots.push({ date: start, duration });
    }
  }
  return slots;
}

async function seedCourses(schoolsData: {
  schools: { id: string; name: string }[];
  teachers: { id: string; schoolId: string; email?: string }[];
  students: { id: string; schoolId: string }[];
  admins: { id: string; schoolId: string }[];
  positions: { id: string; name: string; discipline?: string | null; disciplineId?: string | null }[];
  disciplinesBySchool: Record<string, SeedDiscipline[]>;
  positionsByTeacher: Record<string, string[]>;
}) {
  const { schools, teachers, students, admins, positions, disciplinesBySchool, positionsByTeacher } = schoolsData;
  let courseImageIdx = 0;
  let courseNameIdx = 0;
  const euro = "EUR";
  const pickLearningStatusForNote = () => {
    const r = Math.random();
    if (r < 0.6) return LearningStatus.IN_PROGRESS;
    if (r < 0.85) return LearningStatus.PASSED;
    if (r < 0.95) return LearningStatus.MASTERED;
    return LearningStatus.NOT_STARTED;
  };
  const commentForStatus = (status: LearningStatus, positionName: string) => {
    const base = positionName ? `${positionName} : ` : "";
    switch (status) {
      case LearningStatus.NOT_STARTED:
        return `${base}à retravailler ensemble, placement à préciser.`;
      case LearningStatus.IN_PROGRESS:
        return `${base}progrès visibles, encore quelques corrections.`;
      case LearningStatus.PASSED:
        return `${base}réussi en autonomie, consolider la fluidité.`;
      case LearningStatus.MASTERED:
        return `${base}très solide, on peut complexifier.`;
      default:
        return `${base}à suivre.`;
    }
  };

  for (const school of schools) {
    const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
    const schoolStudents = students.filter((s) => s.schoolId === school.id);
    const schoolAdmin = admins.find((a) => a.schoolId === school.id);
    const teacherUsage = new Map<string, number>();
    const baseDisciplines: SeedDiscipline[] =
      disciplinesBySchool[school.id] && disciplinesBySchool[school.id].length > 0
        ? disciplinesBySchool[school.id]
        : disciplinesCatalog.map((d) => ({ id: undefined as unknown as string, name: d.name, color: d.color }));
    const disciplinePool: SeedDiscipline[] = baseDisciplines.map((d, idx) =>
      idx === 0 ? { ...d, disabledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } : d
    );
    const reservedSlots: { start: Date; end: Date }[] = [];

    // studios
    const studiosForSchool = studiosList.slice(0, 3).map((name, idx) => ({
      name,
      address: `Paris ${idx + 1}`,
      photoPublicId: STUDIO_PUBLIC_IDS[idx % STUDIO_PUBLIC_IDS.length],
      disabledAt: idx === 2 ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null,
    }));
    const createdStudios = await Promise.all(
      studiosForSchool.map((s) =>
        prisma.studio.create({
          data: {
            name: s.name,
            address: s.address,
            schoolId: school.id,
            photoPublicId: s.photoPublicId,
            disabledAt: s.disabledAt,
          },
        })
      )
    );
    const studioCourseCount = new Map<string, number>(
      createdStudios.map((s) => [s.id, 0])
    );

    // Cours QA pour sources désactivées (studio/discipline)
    const disabledStudio = createdStudios.find((s) => s.disabledAt);
    const disabledDiscipline = disciplinePool.find((d) => (d as any).disabledAt);
    if (disabledStudio && schoolTeachers[0]) {
      const disciplineName = disabledDiscipline?.name ?? PRIMARY_DISCIPLINE;
      const disciplineId = disabledDiscipline?.id ?? null;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(18, 0, 0, 0);
      const positionsForDisc = positions.filter(
        (p: any) => p.discipline && p.discipline.toLowerCase() === disciplineName.toLowerCase()
      );
      await prisma.course.create({
        data: {
          title: `Cours QA studio/discipline désactivés`,
          date: futureDate,
          durationMinutes: 60,
          teacherId: schoolTeachers[0].id,
          schoolId: school.id,
          studioId: disabledStudio.id,
          discipline: disciplineName,
          disciplineId,
          maxSeats: 15,
          costCredits: 100,
          photoPublicId: COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length],
          positions:
            positionsForDisc.length > 0
              ? { create: positionsForDisc.slice(0, 2).map((p) => ({ positionId: p.id })) }
              : undefined,
        },
      });
      courseImageIdx += 1;
      reservedSlots.push({
        start: futureDate,
        end: new Date(futureDate.getTime() + 60 * 60_000),
      });
    }

    // Cours QA pour prof désactivé (unique prof)
    const disabledTeacher = schoolTeachers.find((t) => t.email?.includes("teacher-disabled"));
    const activeStudio = createdStudios.find((s) => !s.disabledAt);
    if (disabledTeacher && activeStudio) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      futureDate.setHours(19, 0, 0, 0);
      const disciplineName = PRIMARY_DISCIPLINE;
      const disciplineId =
        disciplinePool.find((d) => d.name.toLowerCase() === disciplineName.toLowerCase())?.id ?? null;
      await prisma.course.create({
        data: {
          title: "Cours QA prof désactivé",
          date: futureDate,
          durationMinutes: 75,
          teacherId: disabledTeacher.id,
          schoolId: school.id,
          studioId: activeStudio.id,
          discipline: disciplineName,
          disciplineId,
          maxSeats: 12,
          costCredits: 120,
          photoPublicId: COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length],
        },
      });
      courseImageIdx += 1;
      reservedSlots.push({
        start: futureDate,
        end: new Date(futureDate.getTime() + 75 * 60_000),
      });
    }

    const slots = buildSchedule({ daysPast: 15, daysFuture: 45, total: 40 }, reservedSlots);
    const forcedStatuses = ["REFUNDED", "MANUAL_PAID", "MANUAL_LATE"];

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      const isPast = slot.date.getTime() < NOW_TS;
      const studio = createdStudios[i % createdStudios.length];
      const sortedTeachers = [...schoolTeachers].sort((a, b) => {
        const countA = teacherUsage.get(a.id) ?? 0;
        const countB = teacherUsage.get(b.id) ?? 0;
        if (countA === countB) return Math.random() - 0.5;
        return countA - countB;
      });
      const teacher = sortedTeachers[0] ?? schoolTeachers[0];
      if (!teacher) continue;
      teacherUsage.set(teacher.id, (teacherUsage.get(teacher.id) ?? 0) + 1);

      const attendees = schoolStudents.sort(() => 0.5 - Math.random()).slice(0, 5 + (i % 2));
      const teacherPositions = positionsByTeacher[teacher.id] ?? [];
      const preferredPositions =
        teacherPositions.length > 0
          ? positions.filter((p) => teacherPositions.includes(p.id))
          : [];
      const pool = preferredPositions.length > 0 ? preferredPositions : positions;
      const disciplineChoice = disciplinePool[(courseNameIdx + i) % disciplinePool.length];
      const courseDiscipline = disciplineChoice?.name ?? PRIMARY_DISCIPLINE;
      const courseDisciplineId = disciplineChoice?.id ?? null;
      const disciplinePoolPositions = pool.filter(
        (p: any) =>
          p.discipline && p.discipline.toLowerCase() === courseDiscipline.toLowerCase()
      );
      const effectivePool = disciplinePoolPositions.length > 0 ? disciplinePoolPositions : pool;
      const coursePositions = effectivePool
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(3, Math.max(2, effectivePool.length > 0 ? 2 : 0)));
      const courseName = courseNames[courseNameIdx % courseNames.length];
      courseNameIdx += 1;
      const photoPublicId = COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length];
      courseImageIdx += 1;

      const course = await prisma.course.create({
        data: {
          title: courseName,
          date: slot.date,
          durationMinutes: slot.duration,
          teacherId: teacher.id,
          schoolId: school.id,
          studioId: studio.id,
          photoPublicId,
          discipline: courseDiscipline,
          disciplineId: courseDisciplineId,
          maxSeats: 30,
          costCredits: 100,
          positions: {
            create: coursePositions.map((p) => ({ positionId: p.id })),
          },
        },
      });
      studioCourseCount.set(
        studio.id,
        (studioCourseCount.get(studio.id) ?? 0) + 1
      );
      reservedSlots.push({
        start: slot.date,
        end: new Date(slot.date.getTime() + slot.duration * 60_000),
      });

      await prisma.courseAttendance.createMany({
        data: attendees.map((s) => ({ courseId: course.id, studentId: s.id })),
      });

      if (isPast && coursePositions.length > 0 && attendees.length > 0) {
        for (const attendee of attendees) {
          for (const position of coursePositions) {
            if (Math.random() < 0.55) {
              await prisma.studentPositionProgress.upsert({
                where: {
                  studentId_positionId: { studentId: attendee.id, positionId: position.id },
                },
                update: {
                  learningStatus: LearningStatus.NOT_STARTED,
                  comment: null,
                  lastUpdatedByUserId: teacher.id,
                },
                create: {
                  studentId: attendee.id,
                  positionId: position.id,
                  learningStatus: LearningStatus.NOT_STARTED,
                  comment: null,
                  lastUpdatedByUserId: teacher.id,
                },
              });
            }
          }
        }
        const notesData = attendees.flatMap((attendee) =>
          coursePositions.map((position) => {
            const status = pickLearningStatusForNote();
            return {
              courseId: course.id,
              studentId: attendee.id,
              positionId: position.id,
              learningStatus: status,
              comment: commentForStatus(status, position.name),
            };
          })
        );
        await prisma.courseNote.createMany({
          data: notesData,
          skipDuplicates: true,
        });
      }

      const confirmedCount = attendees.length;
      const defaultAmountCents = computeDefaultInvoiceAmountCents(confirmedCount, course.maxSeats);
      if (isPast) {
        const roll = Math.random();
        const forced = forcedStatuses.shift();
        const isRefunded = Boolean(schoolAdmin) && (forced === "REFUNDED" || roll < 0.12);
        const hasManualStatus =
          Boolean(schoolAdmin) &&
          !isRefunded &&
          (forced === "MANUAL_PAID" || forced === "MANUAL_LATE" || (roll >= 0.12 && roll < 0.3));
        const manualStatus =
          hasManualStatus && (forced === "MANUAL_PAID" || roll < 0.2)
            ? ManualFinancialStatus.PAID
            : hasManualStatus
              ? ManualFinancialStatus.LATE
              : ManualFinancialStatus.NONE;

        await prisma.invoice.create({
          data: {
            courseId: course.id,
            amountCents: defaultAmountCents,
            currency: euro,
            status: isRefunded ? InvoiceStatus.REFUNDED : InvoiceStatus.GENERATED,
            issuedAt: new Date(),
            refundedAt: isRefunded ? new Date() : null,
            refundedById: isRefunded ? schoolAdmin?.id : null,
            refundNote: isRefunded ? "Remboursement seed (cours annulé)" : null,
            manualStatus,
            manualNote:
              manualStatus === ManualFinancialStatus.PAID
                ? "Marqué payé manuellement (seed)"
                : manualStatus === ManualFinancialStatus.LATE
                ? "Relance manuelle (seed)"
                : null,
            manualSetById: hasManualStatus ? schoolAdmin?.id : null,
            manualSetAt: hasManualStatus ? new Date() : null,
          },
        });
      }
    }

    // Cours “edge” : tôt/tard, durées variées, coûts/places atypiques, quotas waitlist, quelques virtuels non récurrents
    const edgeDates = [
      { hour: 7, minute: 0, duration: 30, cost: 0, seats: 12, waitlist: 5, virtual: false },
      { hour: 22, minute: 0, duration: 90, cost: 150, seats: 8, waitlist: 3, virtual: false },
      { hour: 6, minute: 30, duration: 45, cost: 0, seats: 10, waitlist: 2, virtual: true },
    ];
    for (const edge of edgeDates) {
      const edgeDate = new Date();
      edgeDate.setDate(edgeDate.getDate() + 3);
      edgeDate.setHours(edge.hour, edge.minute, 0, 0);
      const studio = createdStudios[Math.floor(Math.random() * createdStudios.length)];
      const teacher = schoolTeachers[Math.floor(Math.random() * schoolTeachers.length)];
      if (!studio || !teacher) continue;
      if (reservedSlots.some((s) => edgeDate < s.end && s.start < new Date(edgeDate.getTime() + edge.duration * 60_000))) {
        continue;
      }
      const disciplinePick = disciplinePool[Math.floor(Math.random() * disciplinePool.length)];
      const disciplineName = disciplinePick?.name ?? PRIMARY_DISCIPLINE;
      const disciplineId = disciplinePick?.id ?? null;
      const disciplinePositions = positions.filter(
        (p: any) => p.discipline && p.discipline.toLowerCase() === disciplineName.toLowerCase()
      );
      const chosenPositions =
        edge.virtual || disciplinePositions.length === 0
          ? []
          : disciplinePositions.slice(0, Math.min(3, disciplinePositions.length));

      await prisma.course.create({
        data: {
          title: `Cours edge ${disciplineName}`,
          date: edgeDate,
          durationMinutes: edge.duration,
          teacherId: teacher.id,
          schoolId: school.id,
          studioId: studio.id,
          discipline: disciplineName,
          disciplineId,
          maxSeats: edge.seats,
          costCredits: edge.cost,
          waitlistQuota: edge.waitlist,
          isVirtual: edge.virtual,
          photoPublicId: COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length],
          positions:
            edge.virtual || chosenPositions.length === 0
              ? undefined
              : {
                  create: chosenPositions.map((p) => ({ positionId: p.id })),
                },
        },
      });
      courseImageIdx += 1;
      studioCourseCount.set(studio.id, (studioCourseCount.get(studio.id) ?? 0) + 1);
      reservedSlots.push({
        start: edgeDate,
        end: new Date(edgeDate.getTime() + edge.duration * 60_000),
      });
    }

    // Ajouter des cours récurrents hebdo (Pole) sur ~2 mois avec occurrences virtuelles
    const recurrenceTemplates: {
      weekday: number;
      hour: number;
      minute: number;
      duration: number;
      studioIndex: number;
      discipline?: string;
      short?: boolean;
      collision?: boolean;
    }[] = [
      { weekday: 2, hour: 14, minute: 0, duration: 60, studioIndex: 0 }, // mardi 14h
      { weekday: 4, hour: 15, minute: 0, duration: 90, studioIndex: 0 }, // jeudi 15h
      ...createdStudios.slice(1).map((_, idx) => ({
        weekday: 5,
        hour: 14,
        minute: 0,
        duration: 60,
        studioIndex: idx + 1,
      })), // vendredis sur les autres studios
      { weekday: 1, hour: 9, minute: 30, duration: 75, studioIndex: 0, discipline: "Pilates" }, // discipline alternative
      { weekday: 6, hour: 10, minute: 0, duration: 60, studioIndex: 0, discipline: "Souplesse", short: true }, // série courte
    ];
    const startBase = new Date();
    startBase.setDate(startBase.getDate() + 3); // décale légèrement pour éviter conflits immédiats
    const untilBase = new Date(startBase);
    untilBase.setMonth(untilBase.getMonth() + 2);
    const shortUntil = new Date(startBase);
    shortUntil.setDate(shortUntil.getDate() + 20); // série courte pour test conversion virtuel->réel
    // Slot réservé pour provoquer des collisions
    const collisionAnchor = new Date(startBase);
    collisionAnchor.setHours(16, 0, 0, 0);
    reservedSlots.push({
      start: collisionAnchor,
      end: new Date(collisionAnchor.getTime() + 60 * 60_000),
    });
    recurrenceTemplates.push({
      weekday: collisionAnchor.getDay(),
      hour: 16,
      minute: 0,
      duration: 60,
      studioIndex: 0,
      discipline: PRIMARY_DISCIPLINE,
      collision: true,
    });

    for (const tmpl of recurrenceTemplates) {
      const sortedTeachers = [...schoolTeachers].sort((a, b) => {
        const countA = teacherUsage.get(a.id) ?? 0;
        const countB = teacherUsage.get(b.id) ?? 0;
        if (countA === countB) return Math.random() - 0.5;
        return countA - countB;
      });
      const teacher = sortedTeachers[0] ?? schoolTeachers[0];
      const studio = createdStudios[tmpl.studioIndex] ?? createdStudios[0];
      if (!teacher || !studio) continue;
      teacherUsage.set(teacher.id, (teacherUsage.get(teacher.id) ?? 0) + 1);

      const until = tmpl.short ? shortUntil : untilBase;
      const series = await prisma.courseRecurrenceSeries.create({
        data: {
          schoolId: school.id,
          teacherId: teacher.id,
          frequency: "WEEKLY",
          until,
        },
      });

      const occurrences: Date[] = [];
      const cursor = new Date(startBase);
      while (cursor <= until) {
        if (cursor.getDay() === tmpl.weekday) {
          const start = new Date(cursor);
          start.setHours(tmpl.hour, tmpl.minute, 0, 0);
          occurrences.push(start);
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const disciplinePick =
        disciplinePool.find((d) => (tmpl.discipline ?? "").toLowerCase() === d.name.toLowerCase()) ??
        disciplinePool[0];
      const disciplineName = disciplinePick?.name ?? tmpl.discipline ?? PRIMARY_DISCIPLINE;
      const disciplineId = disciplinePick?.id ?? null;
      const disciplinePositions = positions.filter(
        (p: any) => p.discipline && p.discipline.toLowerCase() === disciplineName.toLowerCase()
      );
      const positionsForSeries =
        disciplinePositions.length > 0 ? disciplinePositions.slice(0, Math.min(3, disciplinePositions.length)) : positions.slice(0, 2);

      for (let idx = 0; idx < occurrences.length; idx += 1) {
        const date = occurrences[idx];
        const isVirtual = idx > 0; // première occurrence réelle, suivantes virtuelles
        if (reservedSlots.some((s) => date < s.end && s.start < new Date(date.getTime() + tmpl.duration * 60_000))) {
          continue;
        }
        const course = await prisma.course.create({
          data: {
            title: `${disciplineName} récurrent ${idx + 1}`,
            date,
            durationMinutes: tmpl.duration,
            teacherId: teacher.id,
            schoolId: school.id,
            studioId: studio.id,
            discipline: disciplineName,
            disciplineId,
            maxSeats: 20,
            costCredits: 100,
            recurrenceSeriesId: series.id,
            isVirtual,
            photoPublicId: COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length],
            positions: isVirtual
              ? undefined
              : {
                  create: positionsForSeries.map((p) => ({ positionId: p.id })),
                },
          },
        });
        courseImageIdx += 1;
        studioCourseCount.set(
          studio.id,
          (studioCourseCount.get(studio.id) ?? 0) + 1
        );
        reservedSlots.push({
          start: date,
          end: new Date(date.getTime() + tmpl.duration * 60_000),
        });

        // Ajout d'attendances et de notes sur la première occurrence réelle
        if (!isVirtual) {
          const attendees = schoolStudents.sort(() => 0.5 - Math.random()).slice(0, 4);
          const waitlisted = attendees.pop();
          if (attendees.length > 0) {
            await prisma.courseAttendance.createMany({
              data: attendees.map((s, sIdx) => ({
                courseId: course.id,
                studentId: s.id,
                status: sIdx === 0 ? "CONFIRMED" : "WAITLIST",
                waitlistRank: sIdx === 0 ? null : sIdx,
              })),
            });
          }
          if (waitlisted) {
            await prisma.courseAttendance.create({
              data: {
                courseId: course.id,
                studentId: waitlisted.id,
                status: "WAITLIST",
                waitlistRank: (attendees.length || 1) + 1,
              },
            });
          }

          // Notes/mastery intentionally not seeded here to keep levels empty for manual input
        }

        if (date.getTime() < NOW_TS) {
          const defaultAmountCents = computeDefaultInvoiceAmountCents(0, course.maxSeats);
          const roll = Math.random();
          const forced = forcedStatuses.shift();
          const isRefunded = forced === "REFUNDED" || roll < 0.08;
          const hasManualStatus =
            !isRefunded && (forced === "MANUAL_PAID" || forced === "MANUAL_LATE" || roll >= 0.08);
          const manualStatus =
            hasManualStatus && (forced === "MANUAL_PAID" || roll < 0.2)
              ? ManualFinancialStatus.PAID
              : hasManualStatus
                ? ManualFinancialStatus.LATE
                : ManualFinancialStatus.NONE;

          await prisma.invoice.create({
            data: {
              courseId: course.id,
              amountCents: defaultAmountCents,
              currency: euro,
              status: isRefunded ? InvoiceStatus.REFUNDED : InvoiceStatus.GENERATED,
              issuedAt: new Date(),
              refundedAt: isRefunded ? new Date() : null,
              refundNote: isRefunded ? "Remboursement seed (récurrence)" : null,
              manualStatus,
            },
          });
        }
      }
    }

    // Garantie : au moins un cours par studio
    for (const studio of createdStudios) {
      if ((studioCourseCount.get(studio.id) ?? 0) > 0) continue;
      const date = new Date(startBase);
      date.setHours(11, 0, 0, 0);
      const disciplinePick =
        disciplinePool.find((d) => d.name.toLowerCase() === PRIMARY_DISCIPLINE.toLowerCase()) ??
        disciplinePool[0];
      const disciplineName = disciplinePick?.name ?? PRIMARY_DISCIPLINE;
      const disciplineId = disciplinePick?.id ?? null;
      const disciplinePositions = positions.filter(
        (p: any) => p.discipline && p.discipline.toLowerCase() === disciplineName.toLowerCase()
      );
      const positionsFallback =
        disciplinePositions.length > 0
          ? disciplinePositions.slice(0, Math.min(3, disciplinePositions.length))
          : positions.slice(0, 2);
      const teacher = schoolTeachers[0];
      if (!teacher) continue;
      await prisma.course.create({
        data: {
          title: `${disciplineName} studio ${studio.name}`,
          date,
          durationMinutes: 60,
          teacherId: teacher.id,
          schoolId: school.id,
          studioId: studio.id,
          discipline: disciplineName,
          disciplineId,
          maxSeats: 20,
          costCredits: 100,
          photoPublicId: COURSE_PUBLIC_IDS[courseImageIdx % COURSE_PUBLIC_IDS.length],
          positions: {
            create: positionsFallback.map((p) => ({ positionId: p.id })),
          },
        },
      });
      courseImageIdx += 1;
      studioCourseCount.set(studio.id, 1);
      reservedSlots.push({
        start: date,
        end: new Date(date.getTime() + 60 * 60_000),
      });
    }
  }
}

// Garantit que student1 et student2 disposent d'au moins un cours passé avec le prof principal.
async function ensurePastCoursesForFixedStudents() {
  const teacher = await prisma.user.findFirst({ where: { email: "teacher@poleapp.test" } });
  if (!teacher?.schoolId) return;

  const [discipline, studio] = await Promise.all([
    prisma.discipline.findFirst(),
    prisma.studio.findFirst({ where: { schoolId: teacher.schoolId } }),
  ]);
  if (!discipline) return;

  const disciplinePositions = await prisma.position.findMany({
    where: { disciplineId: discipline.id },
    select: { id: true },
    take: 8,
  });
  const fallbackPositions =
    disciplinePositions.length > 0
      ? disciplinePositions
      : await prisma.position.findMany({ select: { id: true }, take: 8 });
  if (fallbackPositions.length === 0) return;

  const fixedStudents = await prisma.user.findMany({
    where: { email: { in: ["student1@poleapp.test", "student2@poleapp.test"] } },
    select: { id: true },
  });
  if (fixedStudents.length === 0) return;

  const now = new Date();
  const studentIds = fixedStudents.map((s) => s.id);
  if (studentIds.length === 0) return;

  const statuses: LearningStatus[] = [
    LearningStatus.IN_PROGRESS,
    LearningStatus.PASSED,
    LearningStatus.MASTERED,
    LearningStatus.NOT_STARTED,
    LearningStatus.IN_PROGRESS,
  ];

  // Crée 5 cours passés avec notes et progression pour tester la synchro
  for (let i = 0; i < 5; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - (3 + i * 2));
    date.setHours(18, 0, 0, 0);

    const positionsForCourse = fallbackPositions.slice(0, 5);
    const photoIdx = (i * 3 + Math.floor(Math.random() * COURSE_PUBLIC_IDS.length)) % COURSE_PUBLIC_IDS.length;
    const course = await prisma.course.create({
      data: {
        title: `Cours passé (seed) #${i + 1}`,
        date,
        durationMinutes: 60,
        teacherId: teacher.id,
        schoolId: teacher.schoolId,
        studioId: studio?.id ?? null,
        discipline: discipline.name,
        disciplineId: discipline.id,
        maxSeats: 20,
        costCredits: 80,
        waitlistQuota: 5,
        photoPublicId: COURSE_PUBLIC_IDS[photoIdx],
        isVirtual: false,
        positions: {
          create: positionsForCourse.map((p) => ({ positionId: p.id })),
        },
        attendances: {
          create: studentIds.map((studentId) => ({
            studentId,
            status: "CONFIRMED",
          })),
        },
      },
    });

    await prisma.invoice.create({
      data: {
        courseId: course.id,
        amountCents: computeDefaultInvoiceAmountCents(studentIds.length, course.maxSeats),
        currency: "EUR",
        status: InvoiceStatus.PAID,
        issuedAt: new Date(),
        manualStatus: ManualFinancialStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Notes de cours + progression globale alignée (statut/commentaire)
    const noteRows: Prisma.CourseNoteCreateManyInput[] = [];
    const progressRows: Prisma.StudentPositionProgressCreateManyInput[] = [];
    positionsForCourse.forEach((p, idx) => {
      const status = statuses[idx % statuses.length];
      const comment = `Feedback seed ${status.toLowerCase()}`;
      studentIds.forEach((studentId) => {
        noteRows.push({
          courseId: course.id,
          studentId,
          positionId: p.id,
          learningStatus: status,
          comment,
        });
        progressRows.push({
          studentId,
          positionId: p.id,
          learningStatus: status,
          comment,
          lastUpdatedByUserId: teacher.id,
          lastCourseNoteAt: date,
          lastCourseNoteSourceId: course.id,
        });
      });
    });

    if (noteRows.length > 0) {
      await prisma.courseNote.createMany({ data: noteRows });
    }
    if (progressRows.length > 0) {
      await prisma.studentPositionProgress.createMany({
        data: progressRows,
        skipDuplicates: true,
      });
    }
  }
}

async function seedPartners(schools: { id: string }[]) {
  for (const school of schools) {
    const partner = await prisma.partner.create({
      data: {
        name: PARTNER_AMAZON.name,
        website: PARTNER_AMAZON.website,
        description: PARTNER_AMAZON.description,
        kind: "SERVICE",
        schoolId: school.id,
      },
    });
    await prisma.sponsoredLink.createMany({
      data: PARTNER_AMAZON.links.map((link) => ({
        partnerId: partner.id,
        category: link.category ?? "PRODUIT",
        label: link.label,
        url: link.url,
      })),
    });
  }
}

async function seedTeacherFavorites(options: {
  teachers: { id: string; schoolId: string }[];
  positions: { id: string; discipline?: string | null }[];
  positionsByTeacher: Record<string, string[]>;
}) {
  for (const teacher of options.teachers) {
    const ownedIds = options.positionsByTeacher[teacher.id] ?? [];
    const ownedPositions = options.positions.filter((p) => ownedIds.includes(p.id));
    const pool = ownedPositions.length > 0 ? ownedPositions : options.positions;
    const pick = pool
      .slice()
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.max(1, Math.min(3, pool.length)));
    if (pick.length === 0) continue;
    await prisma.teacherFavoritePosition.createMany({
      data: pick.map((p) => ({ teacherId: teacher.id, positionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function seedStudentFavorites(options: {
  students: { id: string }[];
  positions: { id: string; discipline?: string | null }[];
}) {
  const polePositions = options.positions.filter(
    (p) => p.discipline && p.discipline.toLowerCase().includes("pole"),
  );
  const fallback = polePositions.length > 0 ? polePositions : options.positions;
  if (fallback.length === 0) return;
  for (const student of options.students) {
    const pick = fallback
      .slice()
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.max(2, Math.min(4, fallback.length)));
    if (pick.length === 0) continue;
    await prisma.studentFavoritePosition.createMany({
      data: pick.map((p) => ({ studentId: student.id, positionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function seedStudentProgress(options: {
  students: { id: string; schoolId: string }[];
  positions: { id: string; discipline?: string | null }[];
  teachers: { id: string; schoolId: string }[];
}) {
  const polePositions = options.positions.filter(
    (p) => p.discipline && p.discipline.toLowerCase().includes("pole"),
  );
  const fallback = polePositions.length > 0 ? polePositions : options.positions;
  if (fallback.length === 0) return;
  const weightedPick = () => {
    const r = Math.random();
    if (r < 0.45) return LearningStatus.IN_PROGRESS;
    if (r < 0.8) return LearningStatus.PASSED;
    if (r < 0.95) return LearningStatus.MASTERED;
    return LearningStatus.NOT_STARTED;
  };
  for (const student of options.students) {
    const pool = fallback.slice().sort(() => 0.5 - Math.random());
    const count = Math.max(5, Math.min(10, pool.length));
    const chosen = pool.slice(0, count);
    if (chosen.length === 0) continue;
    const teacherForSchool = options.teachers.find((t) => t.schoolId === student.schoolId);
    const data = chosen.map((p) => ({
      studentId: student.id,
      positionId: p.id,
      learningStatus: weightedPick(),
      comment: null as string | null,
      lastUpdatedByUserId: teacherForSchool?.id ?? null,
    }));
    await prisma.studentPositionProgress.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

async function seedStudentInjuries(students: { id: string; schoolId: string }[]) {
  const targets = ["Épaule", "Bas du dos"];
  const injuryRows = await prisma.injuryType.findMany({ where: { name: { in: targets } } });
  if (injuryRows.length === 0) return;

  const bySchool = new Map<string, { id: string; schoolId: string }[]>();
  students.forEach((s) => {
    bySchool.set(s.schoolId, [...(bySchool.get(s.schoolId) ?? []), s]);
  });

  const data: Prisma.StudentInjuryCreateManyInput[] = [];
  for (const [, list] of bySchool) {
    const first = list[0];
    const second = list[1];
    const shoulder = injuryRows.find((i) => i.name === "Épaule");
    const back = injuryRows.find((i) => i.name === "Bas du dos");
    if (first && shoulder) {
      data.push({
        studentId: first.id,
        injuryTypeId: shoulder.id,
        isActive: true,
      });
    }
    if (second && back) {
      data.push({
        studentId: second.id,
        injuryTypeId: back.id,
        isActive: true,
      });
    }
  }

  if (data.length > 0) {
    await prisma.studentInjury.createMany({ data, skipDuplicates: true });
  }
}

async function seedGameSessions(students: { id: string; schoolId: string }[]) {
  const fixedStudents = await prisma.user.findMany({
    where: { email: { in: ["student1@poleapp.test", "student2@poleapp.test"] } },
    select: { id: true, schoolId: true },
  });
  const sampleStudents = [
    ...fixedStudents,
    ...students.filter((s) => !fixedStudents.some((f) => f.id === s.id)).slice(0, 3),
  ].slice(0, 3);
  const modes: GameMode[] = [
    "PHOTO_NAME",
    "NAME_TYPE",
    "NAME_LEVEL",
    "NAME_GRIPS",
    "DESCRIPTION_NAME",
    "BLITZ_MIX",
  ];
  const now = Date.now();
  const data: Prisma.GameSessionCreateManyInput[] = [];

  sampleStudents.forEach((student, idx) => {
    modes.forEach((mode, mIdx) => {
      const total = mode === "BLITZ_MIX" ? 5 : 10;
      const correct = Math.max(0, Math.min(total, total - 2 + ((idx + mIdx) % 3)));
      data.push({
        userId: student.id,
        schoolId: student.schoolId,
        mode,
        totalQuestions: total,
        correctAnswers: correct,
        durationMs: 25000 + (idx + mIdx) * 3000,
        createdAt: new Date(now - (idx + mIdx) * 60 * 60 * 1000),
      });
    });
  });

  if (data.length) {
    await prisma.gameSession.createMany({ data });
  }
}

async function seedNotificationsSamples() {
  const clampNotificationsByUser = <T extends { userId: string }>(
    items: T[],
    limit = 30
  ): T[] => {
    const counts = new Map<string, number>();
    const result: T[] = [];
    for (const item of items) {
      const current = counts.get(item.userId) ?? 0;
      if (current >= limit) continue;
      counts.set(item.userId, current + 1);
      result.push(item);
    }
    return result;
  };

  const admins = await prisma.user.findMany({
    where: { role: Role.SCHOOL_ADMIN },
    select: { id: true, schoolId: true },
  });
  const adminsBySchool = new Map<string | null, { id: string }[]>();
  admins.forEach((admin) => {
    adminsBySchool.set(admin.schoolId ?? null, [...(adminsBySchool.get(admin.schoolId ?? null) ?? []), { id: admin.id }]);
  });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      date: true,
      schoolId: true,
      teacher: { select: { id: true, name: true, email: true } },
      attendances: { include: { student: { select: { id: true, name: true, email: true } } } },
      notes: { include: { student: { select: { id: true, name: true, email: true } }, position: { select: { name: true } } } },
      invoices: { select: { id: true, status: true, courseId: true } },
    },
  });

  const notifications: Array<{
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string | null;
    link?: string | null;
    courseId?: string | null;
  }> = [];

  const formatCourseDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  for (const course of courses) {
    const dateLabel = formatCourseDate(course.date);
    if (course.teacher && course.attendances.length > 0) {
      const attendee = course.attendances[0];
      const studentName = attendee.student?.name ?? attendee.student?.email ?? "Élève";
      notifications.push({
        userId: course.teacher.id,
        kind: NotificationKind.COURSE_SIGNUP,
        title: "Nouvelle inscription",
        body: `${studentName} s'est inscrit(e) à ${course.title ?? "un cours"}${dateLabel ? ` (${dateLabel})` : ""}`,
        link: `/teacher/courses/${course.id}`,
        courseId: course.id,
      });
    }

    const uniqueStudents = new Set(course.attendances.map((a) => a.student?.id).filter(Boolean) as string[]);
    uniqueStudents.forEach((studentId) => {
      notifications.push({
        userId: studentId,
        kind: NotificationKind.COURSE_UPDATED,
        title: "Cours mis à jour",
        body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
        link: `/student/courses/${course.id}`,
        courseId: course.id,
      });
    });

    course.notes.forEach((note) => {
      if (!note.student?.id) return;
      notifications.push({
        userId: note.student.id,
        kind: NotificationKind.NOTE_ADDED,
        title: "Nouvelle note",
        body: `${course.title ?? "Cours"} — ${note.position?.name ?? "Position"}`,
        link: `/student/courses/${course.id}`,
        courseId: course.id,
      });
    });

    if (course.teacher && course.invoices.length > 0) {
      const invoice = course.invoices[0];
      notifications.push({
        userId: course.teacher.id,
        kind: NotificationKind.INVOICE_STATUS,
        title: "Facture mise à jour",
        body: `${invoice.status} — ${course.title ?? "Cours"}`,
        link: `/teacher/billing`,
        courseId: course.id,
      });
    }
    const adminsForSchool = adminsBySchool.get(course.schoolId ?? null) ?? [];
    if (adminsForSchool.length > 0) {
      if (course.attendances.length > 0) {
        const attendee = course.attendances[0];
        const studentName = attendee.student?.name ?? attendee.student?.email ?? "Élève";
        adminsForSchool.forEach((admin) =>
          notifications.push({
            userId: admin.id,
            kind: NotificationKind.ADMIN_COURSE_SIGNUP,
            title: "Nouvelle inscription",
            body: `${studentName} → ${course.title ?? "Cours"}${dateLabel ? ` (${dateLabel})` : ""}`,
            link: `/teacher/courses/${course.id}`,
            courseId: course.id,
          })
        );
      }
      adminsForSchool.forEach((admin) =>
        notifications.push({
          userId: admin.id,
          kind: NotificationKind.ADMIN_COURSE_UPDATED,
          title: "Cours mis à jour",
          body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
          link: `/teacher/courses/${course.id}`,
          courseId: course.id,
        })
      );
    }
  }

  const existingByUser = new Set(notifications.map((n) => n.userId));
  const teacherMain = await prisma.user.findFirst({ where: { email: "teacher@poleapp.test" } });
  if (teacherMain && !existingByUser.has(teacherMain.id)) {
    const course = await prisma.course.findFirst({
      where: { teacherId: teacherMain.id },
      orderBy: { date: "desc" },
    });
    notifications.push({
      userId: teacherMain.id,
      kind: NotificationKind.COURSE_UPDATED,
      title: "Cours mis à jour",
      body: `${course?.title ?? "Cours"}${course?.date ? ` — ${formatCourseDate(course.date)}` : ""}`,
      link: course ? `/teacher/courses/${course.id}` : "/teacher/courses",
      courseId: course?.id ?? null,
    });
    existingByUser.add(teacherMain.id);
  }

  const studentMain = await prisma.user.findFirst({ where: { email: "student1@poleapp.test" } });
  if (studentMain && !existingByUser.has(studentMain.id)) {
    const attendance = await prisma.courseAttendance.findFirst({
      where: { studentId: studentMain.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });
    notifications.push({
      userId: studentMain.id,
      kind: NotificationKind.NOTE_ADDED,
      title: "Nouvelle note",
      body: attendance?.course
        ? `${attendance.course.title ?? "Cours"}${attendance.course.date ? ` — ${formatCourseDate(attendance.course.date)}` : ""}`
        : "Cours récent",
      link: attendance?.course ? `/student/courses/${attendance.course.id}` : "/student/courses",
      courseId: attendance?.course?.id ?? null,
    });
    existingByUser.add(studentMain.id);
  }

  const studentSecondary = await prisma.user.findFirst({ where: { email: "student2@poleapp.test" } });
  if (studentSecondary && !existingByUser.has(studentSecondary.id)) {
    const attendance = await prisma.courseAttendance.findFirst({
      where: { studentId: studentSecondary.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });
    notifications.push({
      userId: studentSecondary.id,
      kind: NotificationKind.COURSE_UPDATED,
      title: "Cours mis à jour",
      body: attendance?.course
        ? `${attendance.course.title ?? "Cours"}${attendance.course.date ? ` — ${formatCourseDate(attendance.course.date)}` : ""}`
        : "Cours récent",
      link: attendance?.course ? `/student/courses/${attendance.course.id}` : "/student/courses",
      courseId: attendance?.course?.id ?? null,
    });
  }

  if (notifications.length > 0) {
    const capped = clampNotificationsByUser(notifications, 30);
    await prisma.notification.createMany({
      data: capped,
      skipDuplicates: true,
    });
  }
}

async function seedAdminNotifications() {
  const clampNotificationsByUser = <T extends { userId: string }>(
    items: T[],
    limit = 30
  ): T[] => {
    const counts = new Map<string, number>();
    const result: T[] = [];
    for (const item of items) {
      const current = counts.get(item.userId) ?? 0;
      if (current >= limit) continue;
      counts.set(item.userId, current + 1);
      result.push(item);
    }
    return result;
  };

  const admins = await prisma.user.findMany({
    where: { role: Role.SCHOOL_ADMIN },
    select: { id: true, schoolId: true },
  });
  if (admins.length === 0) return;

  const adminsBySchool = new Map<string | null, { id: string }[]>();
  admins.forEach((admin) => {
    adminsBySchool.set(admin.schoolId ?? null, [...(adminsBySchool.get(admin.schoolId ?? null) ?? []), { id: admin.id }]);
  });

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      date: true,
      schoolId: true,
      attendances: { select: { studentId: true } },
    },
  });

  const notifications: Array<{
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string | null;
    link?: string | null;
    courseId?: string | null;
  }> = [];

  const formatCourseDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  for (const course of courses) {
    const adminsForSchool = adminsBySchool.get(course.schoolId ?? null) ?? [];
    if (adminsForSchool.length === 0) continue;
    const dateLabel = formatCourseDate(course.date);
    adminsForSchool.forEach((admin) => {
      notifications.push({
        userId: admin.id,
        kind: NotificationKind.ADMIN_COURSE_UPDATED,
        title: "Cours mis à jour",
        body: `${course.title ?? "Cours"}${dateLabel ? ` — ${dateLabel}` : ""}`,
        link: `/teacher/courses/${course.id}`,
        courseId: course.id,
      });
    });
    const firstSignup = course.attendances[0];
    if (firstSignup) {
      adminsForSchool.forEach((admin) => {
        notifications.push({
          userId: admin.id,
          kind: NotificationKind.ADMIN_COURSE_SIGNUP,
          title: "Nouvelle inscription",
          body: `${course.title ?? "Cours"}${dateLabel ? ` (${dateLabel})` : ""}`,
          link: `/teacher/courses/${course.id}`,
          courseId: course.id,
        });
      });
    }
  }

  if (notifications.length > 0) {
    const capped = clampNotificationsByUser(notifications, 30);
    await prisma.notification.createMany({
      data: capped,
      skipDuplicates: true,
    });
  }
}

async function seedGlobalSettingsAndOffers() {
  const timezone = process.env.GLOBAL_TIMEZONE || "Europe/Paris";
  const icsAlarm = Number.parseInt(process.env.GLOBAL_ICS_ALARM_MINUTES || "30", 10);
  await prisma.globalSetting.upsert({
    where: { id: "global" },
    update: {
      timezone,
      icsDefaultAlarmMinutes: Number.isFinite(icsAlarm) ? icsAlarm : 30,
    },
    create: {
      id: "global",
      defaultVatPercent: 20,
      currency: "EUR",
      timezone,
      icsDefaultAlarmMinutes: Number.isFinite(icsAlarm) ? icsAlarm : 30,
    },
  });

  const subCount = await prisma.subscriptionOffer.count();
  if (subCount === 0) {
    await prisma.subscriptionOffer.createMany({
      data: defaultSubscriptionOffers.map((offer) => ({
        ...offer,
        isActive: true,
        isOpen: true,
      })),
    });
  }

  const packCount = await prisma.creditPackOffer.count();
  if (packCount === 0) {
    await prisma.creditPackOffer.createMany({
      data: defaultCreditPacks.map((pack) => ({
        ...pack,
        isActive: true,
        isOpen: true,
      })),
    });
  }
}

async function seedPurchases(students: { id: string; schoolId: string }[]) {
  const subscriptions = await prisma.subscriptionOffer.findMany({ where: { isActive: true, isOpen: true }, take: 2 });
  const packs = await prisma.creditPackOffer.findMany({ where: { isActive: true, isOpen: true }, take: 2 });
  if (subscriptions.length === 0 && packs.length === 0) return;

  const bySchool = new Map<string, { id: string; schoolId: string }[]>();
  students.forEach((s) => {
    bySchool.set(s.schoolId, [...(bySchool.get(s.schoolId) ?? []), s]);
  });

  const purchases: Prisma.PurchaseCreateManyInput[] = [];
  const paidPresets = await prisma.preset.findMany({
    where: { priceCredits: { gt: 0 } },
    select: { id: true, title: true, schoolId: true },
    take: 3,
  });
  for (const [, list] of bySchool) {
    const first = list[0];
    const second = list[1];
    if (first && subscriptions[0]) {
      purchases.push({
        userId: first.id,
        offerId: subscriptions[0].id,
        offerName: subscriptions[0].name,
        kind: "SUBSCRIPTION",
        amountCents: subscriptions[0].monthlyPriceCents ?? 0,
        vatPercent: subscriptions[0].vatPercent ?? 20,
        creditsGranted: subscriptions[0].monthlyCredits ?? 0,
        isPremiumGranted: true,
        status: "PAID",
      });
    }
    if (second && packs[0]) {
      purchases.push({
        userId: second.id,
        offerId: packs[0].id,
        offerName: packs[0].name,
        kind: "PACK",
        amountCents: packs[0].priceCents ?? 0,
        vatPercent: packs[0].vatPercent ?? 20,
        creditsGranted: packs[0].credits ?? 0,
        isPremiumGranted: false,
        status: "PAID",
      });
    }
    const presetMatch = paidPresets.find((p) => first && p.schoolId === first.schoolId);
    if (first && presetMatch) {
      purchases.push({
        userId: first.id,
        offerId: presetMatch.id,
        offerName: presetMatch.title,
        kind: "PRESET",
        amountCents: 0,
        vatPercent: 20,
        creditsGranted: 0,
        isPremiumGranted: false,
        status: "PAID",
      });
    }
  }

  if (purchases.length > 0) {
    await prisma.purchase.createMany({ data: purchases, skipDuplicates: true });
  }
}

async function seedUnlockDemo({
  students,
  teachers,
  positions,
}: {
  students: { id: string; schoolId: string }[];
  teachers: { id: string; schoolId: string }[];
  positions: { id: string; discipline: string | null; disciplineId?: string | null }[];
}) {
  const student = students[0];
  if (!student) return;
  const teacher = teachers.find((t) => t.schoolId === student.schoolId);
  if (!teacher) return;

  const studio = await prisma.studio.findFirst({ where: { schoolId: student.schoolId } });
  if (!studio) return;

  const disciplineFromPositions =
    positions.find((p) => (p.discipline ?? "").toLowerCase() === "pole")?.disciplineId ??
    positions.find((p) => p.disciplineId)?.disciplineId ??
    null;
  const disciplineRow =
    disciplineFromPositions ??
    (await prisma.discipline.findFirst({ select: { id: true } }))?.id ??
    null;
  if (!disciplineRow) {
    throw new Error("seedUnlockDemo: aucun discipline.id trouvé");
  }

  const coursePositions = positions
    .filter((p) => (p.discipline ?? "").toLowerCase() === "pole")
    .slice(0, 3)
    .map((p) => ({ positionId: p.id }));

  const course = await prisma.course.create({
    data: {
      title: "Cours Spin Débutant (démo)",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      teacherId: teacher.id,
      schoolId: student.schoolId,
      studioId: studio.id,
      discipline: "Pole",
      disciplineId: disciplineRow,
      maxSeats: 10,
      costCredits: 20,
      waitlistQuota: 2,
      positions: coursePositions.length > 0 ? { create: coursePositions } : undefined,
    },
    select: { id: true },
  });

  await prisma.courseAttendance.create({
    data: {
      courseId: course.id,
      studentId: student.id,
      status: "CONFIRMED",
    },
  });
}

async function seedPresets(options: {
  schools: { id: string }[];
  positions: { id: string; name: string; discipline: string | null; disciplineId?: string | null }[];
  teachers: { id: string; schoolId: string }[];
  disciplinesBySchool: Record<string, SeedDiscipline[]>;
}) {
  const { schools, positions, teachers, disciplinesBySchool } = options;
  for (const school of schools) {
    const teacher = teachers.find((t) => t.schoolId === school.id) ?? null;
    const positionPool = positions.filter((p) => !!p.discipline);
    for (const preset of seedPresetsData) {
      const disciplinePick = preset.discipline
        ? (disciplinesBySchool[school.id] ?? []).find((d) => d.name === preset.discipline) ??
          (disciplinesBySchool[school.id] ?? []).find(
            (d) => d.name.toLowerCase() === preset.discipline.toLowerCase()
          )
        : null;
      const filtered = positionPool.filter((p) => (preset.discipline ? p.discipline === preset.discipline : true));
      const pool = filtered.length >= 6 ? filtered : positionPool;
      const minPositions = 6;
      const maxPositions = 12;
      const targetCount = pool.length >= minPositions ? Math.min(maxPositions, Math.max(minPositions, Math.floor(Math.random() * (maxPositions - minPositions + 1)) + minPositions)) : pool.length;
      const picked = pool
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, targetCount)
        .map((p, idx) => ({
          ...p,
          _meta: {
            order: idx + 1,
            timestampSeconds: idx * 20 + 10,
            note: idx === 0 ? "Entrée et mise en rythme" : idx === targetCount - 1 ? "Final / sortie" : `Accent ${idx + 1}`,
          },
        }));
      const disciplineName = disciplinePick?.name ?? preset.discipline ?? picked[0]?.discipline ?? PRIMARY_DISCIPLINE;
      const disciplineId =
        disciplinePick?.id ??
        picked[0]?.disciplineId ??
        (disciplinesBySchool[school.id]?.[0]?.id ?? null);
      await prisma.preset.create({
        data: {
          title: preset.title,
          description: preset.description,
          discipline: disciplineName,
          disciplineId: disciplineId ?? "",
          premiumRequired: preset.premiumRequired ?? false,
          priceCredits: preset.priceCredits ?? null,
          imagePublicId: preset.imagePublicId ?? null,
          videoPublicId: preset.videoPublicId ?? null,
          usageCount: 0,
          schoolId: school.id,
          createdByUserId: teacher?.id,
          positions: {
            create: picked
              .map((p) => ({
                positionId: p.id,
                order: p._meta.order,
                timestampSeconds: p._meta.timestampSeconds,
                note: p._meta.note,
              }))
              .sort((a, b) => a.order - b.order),
          },
        },
      });
    }
  }
}

async function seedSuperAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  if (existing) return existing;

  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@poleapp.test";
  const password: string = process.env.SUPER_ADMIN_PASSWORD ?? SEED_PASSWORD;
  const name = "Super Admin";
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isPremium: true,
      name,
    },
  });
}

async function main() {
  const allowDestructiveSeed = process.env.SEED_ALLOW_PROD === "true" || process.env.NODE_ENV !== "production";
  if (!allowDestructiveSeed) {
    throw new Error("Seed aborted: set SEED_ALLOW_PROD=true to allow destructive seed outside dev.");
  }
  await resetAll();
  await seedSuperAdmin();
  await seedGlobalSettingsAndOffers();
  await seedInjuryTypes();
  const muscles = await seedMuscles();
  const { schools, teachers, students, admins } = await seedSchoolsAndUsers();
  const disciplinesBySchool = await seedDisciplines(schools);
  const sharedDisciplines = disciplinesBySchool[schools[0].id] ?? [];
  await seedPartners(schools);
  const elzaTeacher = teachers.find((t) => t.email === "teacher@poleapp.test");
  const { createdPositions: positions, positionsByTeacher } = await seedPositions({
    muscles,
    teachers,
    priorityTeacherId: elzaTeacher?.id,
    disciplines: sharedDisciplines,
  });
  await seedTeacherFavorites({ teachers, positions, positionsByTeacher });
  await seedStudentFavorites({ students, positions });
  await seedStudentProgress({ students, positions, teachers });
  await seedStudentInjuries(students);
  await seedPresets({ schools, positions, teachers, disciplinesBySchool });
  await seedPurchases(students);
  await seedCourses({ schools, teachers, students, admins, positions, disciplinesBySchool, positionsByTeacher });
  await ensurePastCoursesForFixedStudents();
  await seedUnlockDemo({ students, teachers, positions });
  await seedNotificationsSamples();
  await seedAdminNotifications();
  await seedGameSessions(students);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
