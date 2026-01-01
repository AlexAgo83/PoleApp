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
} from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

import { computeDefaultInvoiceAmountCents } from "@/lib/billing";

const prisma = new PrismaClient();

const PASSWORD = "change-me-password";
const POSITION_IMAGES = [
  "https://i.postimg.cc/W4Mwp4Zr/Gemini-Generated-Image-6bpiby6bpiby6bpi.png",
  "https://i.postimg.cc/zfnFDfh0/Gemini-Generated-Image-70zf9e70zf9e70zf.png",
  "https://i.postimg.cc/tghNRg6r/Gemini-Generated-Image-9laspe9laspe9las.png",
  "https://i.postimg.cc/7LvNyz5X/Gemini-Generated-Image-9nbncc9nbncc9nbn.png",
  "https://i.postimg.cc/BvWCGFjM/Gemini-Generated-Image-ak3205ak3205ak32.png",
  "https://i.postimg.cc/k5xvM5SS/Gemini-Generated-Image-dq72fedq72fedq72.png",
  "https://i.postimg.cc/s2p4f2Wm/Gemini-Generated-Image-nafbbenafbbenafb.png",
  "https://i.postimg.cc/d08jQ0C9/Gemini-Generated-Image-r3jjhnr3jjhnr3jj.png",
  "https://i.postimg.cc/2547j5Wd/Gemini-Generated-Image-q7a2l7q7a2l7q7a2.png",
  "https://i.postimg.cc/SKWfQK9f/Gemini-Generated-Image-ob9xeuob9xeuob9x.png",
  "https://i.postimg.cc/fbxfWbdj/Gemini-Generated-Image-nr8lxdnr8lxdnr8l.png",
  "https://i.postimg.cc/xdK3jdmv/Gemini-Generated-Image-w69zmgw69zmgw69z.png",
  "https://i.postimg.cc/JzmTFnh6/Gemini-Generated-Image-59vczf59vczf59vc.png",
  "https://i.postimg.cc/jSK815jZ/Gemini-Generated-Image-5nkvun5nkvun5nkv.png",
  "https://i.postimg.cc/Qds6ztMz/Gemini-Generated-Image-5x1h3e5x1h3e5x1h.png",
  "https://i.postimg.cc/13PWdtzW/Gemini-Generated-Image-8df1hr8df1hr8df1.png",
  "https://i.postimg.cc/T3Gksw-Pt/Gemini-Generated-Image-tqk096tqk096tqk0.png",
  "https://i.postimg.cc/CxYv21KQ/Gemini-Generated-Image-x6c36yx6c36yx6c3.png",
  "https://i.postimg.cc/g01pRsPN/Gemini_Generated_Image_4nvmg14nvmg14nvm.png",
  "https://i.postimg.cc/zf4NW71p/Gemini_Generated_Image_s8vw7ls8vw7ls8vw.png",
  "https://i.postimg.cc/mrK4MjGm/Gemini_Generated_Image_y1xzydy1xzydy1xz.png",
];

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

const COURSE_IMAGES = [
  "https://i.postimg.cc/nL81tmX2/Gemini-Generated-Image-gwcxudgwcxudgwcx.png",
  "https://i.postimg.cc/43C1TcYz/Gemini-Generated-Image-jqc1bsjqc1bsjqc1.png",
  "https://i.postimg.cc/FKtxQSY3/Gemini-Generated-Image-qzcezwqzcezwqzce.png",
  "https://i.postimg.cc/9f3Bj9Dd/Gemini-Generated-Image-w7xzpow7xzpow7xz.png",
  "https://i.postimg.cc/KzbjFG77/Gemini-Generated-Image-15whr115whr115wh.png",
  "https://i.postimg.cc/XJWq3jK5/Gemini-Generated-Image-1zx8nf1zx8nf1zx8.png",
  "https://i.postimg.cc/26YymkdF/Gemini-Generated-Image-eor5freor5freor5.png",
  "https://i.postimg.cc/4dGyZfvt/Gemini-Generated-Image-hime9ohime9ohime.png",
  "https://i.postimg.cc/50Jy145L/Gemini-Generated-Image-nvh7mrnvh7mrnvh7.png",
  "https://i.postimg.cc/fLsyZz70/Gemini-Generated-Image-o5cowyo5cowyo5co.png",
  "https://i.postimg.cc/bJPr8y0x/Gemini-Generated-Image-o77i1wo77i1wo77i.png",
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

    const mapType = (raw: string): PositionType | null => {
      const t = raw.toLowerCase();
      if (t.includes("spin")) return PositionType.SPIN;
      if (t.includes("transition")) return PositionType.TRANSITION;
      if (t.includes("warm") || t.includes("echauff") || t.includes("cool")) return PositionType.WARMUP;
      if (t.includes("renfo") || t.includes("strength")) return PositionType.STRENGTH;
      if (t.includes("trick")) return PositionType.TRICK;
      return null;
    };
    const mapLevel = (raw: string): PositionLevel | null => {
      const l = raw.toLowerCase();
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

const SCHOOL_IMAGES = [
  "https://i.postimg.cc/XYM9HSkn/Gemini_Generated_Image_3dwugg3dwugg3dwu.png",
  "https://i.postimg.cc/mgx7XfyR/Gemini_Generated_Image_qs6pi3qs6pi3qs6p.png",
  "https://i.postimg.cc/8z8LKQmG/Gemini_Generated_Image_xrgzgtxrgzgtxrgz.png",
  "https://i.postimg.cc/W4R7PZdn/Gemini-Generated-Image-75yklg75yklg75yk.png",
];
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

const STUDIO_IMAGES = [
  "https://i.postimg.cc/43ttzvzM/Gemini-Generated-Image-ed0cxzed0cxzed0c.png",
  "https://i.postimg.cc/cLPwgknd/Gemini-Generated-Image-l8ods0l8ods0l8od.png",
  "https://i.postimg.cc/Zq33rPr2/Gemini-Generated-Image-pkf3n7pkf3n7pkf3.png",
  "https://i.postimg.cc/jjNNz6zB/Gemini-Generated-Image-vbzhjgvbzhjgvbzh.png",
];

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
    title: "Combo Fluide Débutant",
    discipline: "Pole",
    premiumRequired: true,
    description: "Combo court pour débutants, axé fluidité et musicalité.",
    imageUrl: "https://i.postimg.cc/65XPDS0n/Gemini-Generated-Image-r18l7or18l7or18l.png",
  },
  {
    title: "Preset Crédit 150",
    discipline: "Exotic",
    premiumRequired: false,
    priceCredits: 150,
    description: "Preset achetable en crédits, avec focus exotic.",
    imageUrl: "https://i.postimg.cc/65XPDS0d/Gemini-Generated-Image-qoeoe9qoeoe9qoeo.png",
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

  const createdPositions = [];
  for (let i = 0; i < positionsData.length; i += 1) {
    const pos = positionsData[i];
    const image = POSITION_IMAGES[i % POSITION_IMAGES.length];
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
              url: image,
              kind: MediaKind.PHOTO,
            },
            {
              url: videoAsset.url,
              publicId: videoAsset.publicId,
              kind: MediaKind.VIDEO,
            },
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
          photoUrl: SCHOOL_IMAGES[idx % SCHOOL_IMAGES.length],
          website: SCHOOL_WEBSITE,
        },
      })
    )
  );

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
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
  positions: { id: string; discipline?: string | null; disciplineId?: string | null }[];
  disciplinesBySchool: Record<string, SeedDiscipline[]>;
  positionsByTeacher: Record<string, string[]>;
}) {
  const { schools, teachers, students, admins, positions, disciplinesBySchool, positionsByTeacher } = schoolsData;
  let courseImageIdx = 0;
  let courseNameIdx = 0;
  const euro = "EUR";

  for (const school of schools) {
    const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
    const schoolStudents = students.filter((s) => s.schoolId === school.id);
    const schoolAdmin = admins.find((a) => a.schoolId === school.id);
    const teacherUsage = new Map<string, number>();
    const disciplinePool: SeedDiscipline[] =
      disciplinesBySchool[school.id] && disciplinesBySchool[school.id].length > 0
        ? disciplinesBySchool[school.id]
        : disciplinesCatalog.map((d) => ({ id: undefined as unknown as string, name: d.name, color: d.color }));
    const reservedSlots: { start: Date; end: Date }[] = [];

    // studios
    const studiosForSchool = studiosList.slice(0, 3).map((name, idx) => ({
      name,
      address: `Paris ${idx + 1}`,
      photoUrl: STUDIO_IMAGES[idx % STUDIO_IMAGES.length],
    }));
    const createdStudios = await Promise.all(
      studiosForSchool.map((s) =>
        prisma.studio.create({
          data: {
            name: s.name,
            address: s.address,
            schoolId: school.id,
            photoUrl: s.photoUrl,
          },
        })
      )
    );
    const studioCourseCount = new Map<string, number>(
      createdStudios.map((s) => [s.id, 0])
    );

    const slots = buildSchedule({ daysPast: 15, daysFuture: 45, total: 40 }, reservedSlots);
    const forcedStatuses = ["REFUNDED", "MANUAL_PAID", "MANUAL_LATE"];

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
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
      const photoUrl = COURSE_IMAGES[courseImageIdx % COURSE_IMAGES.length];
      courseImageIdx += 1;

      const course = await prisma.course.create({
        data: {
          title: courseName,
          date: slot.date,
          durationMinutes: slot.duration,
          teacherId: teacher.id,
          schoolId: school.id,
          studioId: studio.id,
          photoUrl,
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

      if (slot.date.getTime() < NOW_TS && coursePositions.length > 0 && attendees.length > 0) {
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
      }

      const confirmedCount = attendees.length;
      const defaultAmountCents = computeDefaultInvoiceAmountCents(confirmedCount, course.maxSeats);
      const roll = Math.random();
      const forced = forcedStatuses.shift();
      const isRefunded = Boolean(schoolAdmin) && (forced === "REFUNDED" || roll < 0.12);
      const hasManualStatus = Boolean(schoolAdmin) && !isRefunded && (forced === "MANUAL_PAID" || forced === "MANUAL_LATE" || (roll >= 0.12 && roll < 0.3));
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
          photoUrl: COURSE_IMAGES[courseImageIdx % COURSE_IMAGES.length],
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
            photoUrl: COURSE_IMAGES[courseImageIdx % COURSE_IMAGES.length],
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
          photoUrl: COURSE_IMAGES[courseImageIdx % COURSE_IMAGES.length],
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
  const sampleStudents = students.slice(0, 3);
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
  }

  if (purchases.length > 0) {
    await prisma.purchase.createMany({ data: purchases, skipDuplicates: true });
  }
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
      const picked = positionPool
        .filter((p) => (preset.discipline ? p.discipline === preset.discipline : true))
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
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
          imageUrl: preset.imageUrl ?? null,
          usageCount: 0,
          schoolId: school.id,
          createdByUserId: teacher?.id,
          positions: {
            create: picked.map((p) => ({ positionId: p.id })),
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
  const password = process.env.SUPER_ADMIN_PASSWORD || PASSWORD;
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
