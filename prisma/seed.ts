import {
  GameMode,
  MediaKind,
  PositionLevel,
  PositionType,
  Prisma,
  PrismaClient,
  Role,
  InvoiceStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

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

const FEMALE_STUDENT_AVATARS = [
  "https://i.postimg.cc/9fGYXf9g/Gemini-Generated-Image-ga85o3ga85o3ga85.png",
  "https://i.postimg.cc/wBhQxBNG/Gemini-Generated-Image-8a2y748a2y748a2y.png",
  "https://i.postimg.cc/Gpkx3pDf/Gemini-Generated-Image-lymsnclymsnclyms.png",
  "https://i.postimg.cc/MHGLjBbV/Gemini-Generated-Image-kk2x4wkk2x4wkk2x.png",
  "https://i.postimg.cc/gjBTy0N6/Gemini-Generated-Image-it8ll5it8ll5it8l.png",
  "https://i.postimg.cc/wMBrsNct/Gemini-Generated-Image-1s02y51s02y51s02.png",
  "https://i.postimg.cc/ZnDMPqVR/Gemini-Generated-Image-f3pd1gf3pd1gf3pd.png",
];

const MALE_STUDENT_AVATARS = [
  "https://i.postimg.cc/KYnDcYTw/Gemini-Generated-Image-h13y3wh13y3wh13y.png",
  "https://i.postimg.cc/VNjWsNtT/Gemini-Generated-Image-q1xtvnq1xtvnq1xt.png",
  "https://i.postimg.cc/k5xvM58r/Gemini-Generated-Image-hagw0mhagw0mhagw.png",
  "https://i.postimg.cc/C5K2f8Hf/Gemini-Generated-Image-krr7xokrr7xokrr7.png",
  "https://i.postimg.cc/6qQPGZL8/Gemini-Generated-Image-9ifeph9ifeph9ife.png",
  "https://i.postimg.cc/pr16QdqF/Gemini-Generated-Image-f6cfrf6cfrf6cfrf.png",
  "https://i.postimg.cc/VLD38nbM/Gemini-Generated-Image-i27lxyi27lxyi27l.png",
  "https://i.postimg.cc/7Ympk0T0/Gemini-Generated-Image-apgygfapgygfapgy.png",
];

const TEACHER_AVATARS = [
  "https://i.postimg.cc/ZqkLhNWN/Gemini-Generated-Image-ir90ejir90ejir90.png",
  "https://i.postimg.cc/wBKkdN1s/Gemini-Generated-Image-yf123byf123byf12.png",
  "https://i.postimg.cc/JhwQWXsH/Gemini-Generated-Image-xdf05vxdf05vxdf0.png",
  "https://i.postimg.cc/8C8bVv7L/Gemini-Generated-Image-hrrbcvhrrbcvhrrb.png",
  "https://i.postimg.cc/W4R7PZdn/Gemini-Generated-Image-75yklg75yklg75yk.png",
  "https://i.postimg.cc/R0cLC0t2/Gemini-Generated-Image-7xe2nm7xe2nm7xe2.png",
  "https://i.postimg.cc/prdSnjYK/Gemini-Generated-Image-gu94adgu94adgu94.png",
  "https://i.postimg.cc/wMBrsNcR/Gemini-Generated-Image-yhp3byhp3byhp3by.png",
  "https://i.postimg.cc/1XYj0zJX/Gemini-Generated-Image-b3b57vb3b57vb3b5.png",
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

const positionsData = [
  { name: "Fireman Spin", type: PositionType.SPIN, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Chair Spin", type: PositionType.SPIN, level: PositionLevel.BEGINNER, grips: "TRUE" },
  { name: "Back Hook Spin", type: PositionType.SPIN, level: PositionLevel.INTERMEDIATE, grips: "TRUE" },
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

const disciplinesCatalog = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Pole Exotic", color: "#d946ef" },
  { name: "Souplesse", color: "#22c55e" },
  { name: "Pilates", color: "#f59e0b" },
  { name: "Conditioning", color: "#6366f1" },
];

const PRIMARY_DISCIPLINE = disciplinesCatalog[0].name;

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
}: {
  muscles: { id: string; name: string }[];
  teachers: { id: string }[];
  priorityTeacherId?: string | null;
}) {
  const muscleMap = new Map(muscles.map((m) => [m.name, m.id]));
  const positionsByTeacher: Record<string, string[]> = {};

  const createdPositions = [];
  for (let i = 0; i < positionsData.length; i += 1) {
    const pos = positionsData[i];
    const image = POSITION_IMAGES[i % POSITION_IMAGES.length];
    const discipline = disciplinesCatalog[i % disciplinesCatalog.length]?.name ?? PRIMARY_DISCIPLINE;
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
        description: `${pos.name} (${pos.type.toLowerCase()} · niveau ${pos.level.toLowerCase()})`,
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
      },
    });
    createdPositions.push(created);
    if (creator?.id) {
      positionsByTeacher[creator.id] = [...(positionsByTeacher[creator.id] ?? []), created.id];
    }
  }
  return { createdPositions, positionsByTeacher };
}

async function seedDisciplines(schools: { id: string }[]) {
  const bySchool: Record<string, { name: string; color?: string | null }[]> = {};

  for (const school of schools) {
    const rows = await Promise.all(
      disciplinesCatalog.map((disc) =>
        prisma.discipline.upsert({
          where: { schoolId_name: { schoolId: school.id, name: disc.name } },
          update: { color: disc.color },
          create: { schoolId: school.id, name: disc.name, color: disc.color },
        })
      )
    );
    bySchool[school.id] = rows.map((row) => ({ name: row.name, color: row.color }));
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

  // Fixed accounts on school1
  const fixedAccounts = [
    { email: "admin@poleapp.test", role: Role.SCHOOL_ADMIN, premium: true, name: "Admin Admin", schoolIdx: 0, age: 40 },
    {
      email: "teacher@poleapp.test",
      role: Role.TEACHER,
      premium: true,
      name: "Elza Martinez",
      schoolIdx: 0,
      avatar: TEACHER_AVATARS[0],
      age: 32,
    },
    {
      email: "student1@poleapp.test",
      role: Role.STUDENT,
      premium: false,
      name: "Anna Douchez",
      schoolIdx: 0,
      avatar: FEMALE_STUDENT_AVATARS[0],
      age: 31,
      gender: "F" as Gender,
    },
    {
      email: "student2@poleapp.test",
      role: Role.STUDENT,
      premium: true,
      name: "Carlo Mendes",
      schoolIdx: 0,
      avatar: MALE_STUDENT_AVATARS[0],
      age: 35,
      gender: "M" as Gender,
    },
  ];

  const teachers: { id: string; schoolId: string; email?: string }[] = [];
  const students: { id: string; schoolId: string }[] = [];

  for (const acc of fixedAccounts) {
    const created = await prisma.user.create({
      data: {
        email: acc.email,
        passwordHash,
        role: acc.role,
        isPremium: acc.premium,
        schoolId: schools[acc.schoolIdx].id,
        name: acc.name,
        avatarUrl: acc.avatar,
        age: acc.age ?? null,
        credits: acc.role === Role.STUDENT ? 1000 : undefined,
      },
    });
    if (acc.role === Role.TEACHER) {
      teachers.push({ id: created.id, schoolId: schools[acc.schoolIdx].id, email: acc.email });
    }
    if (acc.role === Role.STUDENT) {
      students.push({ id: created.id, schoolId: schools[acc.schoolIdx].id });
    }
  }

  // Distribute remaining names for teachers/students
  const teacherAvatars = [...TEACHER_AVATARS];
  const femaleAvatars = [...FEMALE_STUDENT_AVATARS];
  const maleAvatars = [...MALE_STUDENT_AVATARS];
  const peoplePool = [...people];
  let fallbackCounter = 1;

  const pickStudentAvatar = (gender: Gender) => {
    if (gender === "F" && femaleAvatars.length) return femaleAvatars.shift()!;
    if (gender === "M" && maleAvatars.length) return maleAvatars.shift()!;
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
          avatarUrl: teacherAvatars.length ? teacherAvatars.shift() : null,
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
          avatarUrl: pickStudentAvatar(person.gender),
          credits: 500,
        },
      });
      students.push({ id: created.id, schoolId: school.id });
    }
  }

  return { schools, teachers, students };
}

function buildSchedule(options: { daysPast: number; daysFuture: number; total: number }) {
  const { daysPast, daysFuture, total } = options;
  const slots: { date: Date; duration: number }[] = [];
  const now = new Date();
  const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const durations = [30, 45, 60, 75, 90];
  const times = [16, 17, 18, 19, 20, 21];

  // 5 passés
  for (let i = 0; i < 5 && slots.length < total; i += 1) {
    const dayOffset = -rng(1, daysPast);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    const duration = durations[rng(0, durations.length - 1)];
    slots.push({ date: start, duration });
  }
  // futurs
  while (slots.length < total) {
    const dayOffset = rng(0, daysFuture);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    const duration = durations[rng(0, durations.length - 1)];
    const overlap = slots.some((s) => Math.abs(s.date.getTime() - start.getTime()) < 60 * 60 * 1000);
    if (!overlap) {
      slots.push({ date: start, duration });
    }
  }
  return slots;
}

async function seedCourses(schoolsData: {
  schools: { id: string; name: string }[];
  teachers: { id: string; schoolId: string; email?: string }[];
  students: { id: string; schoolId: string }[];
  positions: { id: string }[];
  disciplinesBySchool: Record<string, { name: string; color?: string | null }[]>;
  positionsByTeacher: Record<string, string[]>;
}) {
  const { schools, teachers, students, positions, disciplinesBySchool, positionsByTeacher } = schoolsData;
  let courseImageIdx = 0;
  let courseNameIdx = 0;
  const euro = "EUR";

  for (const school of schools) {
    const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
    const schoolStudents = students.filter((s) => s.schoolId === school.id);
    const teacherUsage = new Map<string, number>();
    const disciplinePool =
      disciplinesBySchool[school.id] && disciplinesBySchool[school.id].length > 0
        ? disciplinesBySchool[school.id]
        : disciplinesCatalog;

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

    const slots = buildSchedule({ daysPast: 15, daysFuture: 15, total: 20 });
    const studioSchedule = new Map<string, number[]>();
    const teacherSchedule = new Map<string, number[]>();

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      const studio = createdStudios[i % createdStudios.length];
      const startTs = slot.date.getTime();

      // éviter collisions studio/teacher (même timestamp)
      const studioTimes = studioSchedule.get(studio.id) ?? [];
      if (studioTimes.includes(startTs)) continue;
      const sortedTeachers = [...schoolTeachers].sort((a, b) => {
        const countA = teacherUsage.get(a.id) ?? 0;
        const countB = teacherUsage.get(b.id) ?? 0;
        if (countA === countB) return Math.random() - 0.5;
        return countA - countB;
      });
      const teacher = sortedTeachers.find((t) => !(teacherSchedule.get(t.id) ?? []).includes(startTs));
      if (!teacher) continue;
      studioSchedule.set(studio.id, [...studioTimes, startTs]);
      const teacherTimes = teacherSchedule.get(teacher.id) ?? [];
      teacherSchedule.set(teacher.id, [...teacherTimes, startTs]);
      teacherUsage.set(teacher.id, (teacherUsage.get(teacher.id) ?? 0) + 1);

      const attendees = schoolStudents.sort(() => 0.5 - Math.random()).slice(0, 5 + (i % 2));
      const teacherPositions = positionsByTeacher[teacher.id] ?? [];
      const preferredPositions =
        teacherPositions.length > 0
          ? positions.filter((p) => teacherPositions.includes(p.id))
          : [];
      const pool = preferredPositions.length > 0 ? preferredPositions : positions;
      const coursePositions = pool.slice().sort(() => 0.5 - Math.random()).slice(0, 2 + (i % 3));
      const courseName = courseNames[courseNameIdx % courseNames.length];
      const courseDiscipline = disciplinePool[(courseNameIdx + i) % disciplinePool.length]?.name ?? PRIMARY_DISCIPLINE;
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
          maxSeats: 30,
          costCredits: 100,
          positions: {
            create: coursePositions.map((p) => ({ positionId: p.id })),
          },
        },
      });

      await prisma.courseAttendance.createMany({
        data: attendees.map((s) => ({ courseId: course.id, studentId: s.id })),
      });

      const confirmedCount = attendees.length;
      const defaultAmountCents = computeDefaultInvoiceAmountCents(confirmedCount, course.maxSeats);
      await prisma.invoice.create({
        data: {
          courseId: course.id,
          amountCents: defaultAmountCents,
          currency: euro,
          status: InvoiceStatus.GENERATED,
          issuedAt: new Date(),
        },
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
  positions: { id: string }[];
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
  await prisma.globalSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      defaultVatPercent: 20,
      currency: "EUR",
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
  positions: { id: string; name: string; discipline: string | null }[];
  teachers: { id: string; schoolId: string }[];
}) {
  const { schools, positions, teachers } = options;
  for (const school of schools) {
    const teacher = teachers.find((t) => t.schoolId === school.id) ?? null;
    const positionPool = positions.filter((p) => !!p.discipline);
    for (const preset of seedPresetsData) {
      const picked = positionPool
        .filter((p) => (preset.discipline ? p.discipline === preset.discipline : true))
        .slice()
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      await prisma.preset.create({
        data: {
          title: preset.title,
          description: preset.description,
          discipline: preset.discipline,
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
  const { schools, teachers, students } = await seedSchoolsAndUsers();
  const disciplinesBySchool = await seedDisciplines(schools);
  await seedPartners(schools);
  const elzaTeacher = teachers.find((t) => t.email === "teacher@poleapp.test");
  const { createdPositions: positions, positionsByTeacher } = await seedPositions({
    muscles,
    teachers,
    priorityTeacherId: elzaTeacher?.id,
  });
  await seedTeacherFavorites({ teachers, positions, positionsByTeacher });
  await seedStudentInjuries(students);
  await seedPresets({ schools, positions, teachers });
  await seedPurchases(students);
  await seedCourses({ schools, teachers, students, positions, disciplinesBySchool, positionsByTeacher });
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
