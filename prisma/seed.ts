import {
  LearningStatus,
  MasteryLevel,
  MediaKind,
  PositionLevel,
  PositionType,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const POSITION_MEDIA_BASE = "https://placehold.co/800x1000/png";

type PositionSeed = {
  name: string;
  type: PositionType;
  levelRequired: PositionLevel;
  grips: string[];
  tips?: string;
  description?: string;
  contraindications?: string;
};

type SeedUser = {
  key: "admin" | "teacher" | "studentFree" | "studentPremium";
  email: string;
  name: string;
  role: Role;
  isPremium?: boolean;
};

const users: SeedUser[] = [
  {
    key: "admin",
    email: "admin@poleapp.test",
    name: "Ada Admin",
    role: Role.SCHOOL_ADMIN,
    isPremium: true,
  },
  {
    key: "teacher",
    email: "teacher@poleapp.test",
    name: "Tessa Teacher",
    role: Role.TEACHER,
  },
  {
    key: "studentFree",
    email: "student1@poleapp.test",
    name: "Sam Student",
    role: Role.STUDENT,
  },
  {
    key: "studentPremium",
    email: "student2@poleapp.test",
    name: "Pat Premium",
    role: Role.STUDENT,
    isPremium: true,
  },
];

const injuryTypes = [
  "Épaule",
  "Poignet",
  "Coude",
  "Bas du dos",
  "Genou",
];

const positions: PositionSeed[] = [
  {
    name: "Fireman Spin",
    type: PositionType.SPIN,
    levelRequired: PositionLevel.BEGINNER,
    grips: ["TRUE"],
    tips: "Gardez le buste gainé et regardez vers le sol pour rester aligné.",
  },
  {
    name: "Chair Spin",
    type: PositionType.SPIN,
    levelRequired: PositionLevel.BEGINNER,
    grips: ["TRUE"],
    tips: "Pensez à décoller doucement les genoux pour contrôler la vitesse.",
  },
  {
    name: "Back Hook Spin",
    type: PositionType.SPIN,
    levelRequired: PositionLevel.INTERMEDIATE,
    grips: ["TRUE"],
    tips: "Ancrez la main intérieure, épaules basses pour éviter de tirer dans le cou.",
  },
  {
    name: "Jasmine",
    type: PositionType.TRICK,
    levelRequired: PositionLevel.INTERMEDIATE,
    grips: ["CUP"],
    tips: "Engagez les obliques et ouvrez la hanche pour plus de stabilité.",
  },
  {
    name: "Gemini",
    type: PositionType.TRICK,
    levelRequired: PositionLevel.INTERMEDIATE,
    grips: ["CUP"],
    tips: "Croisez fermement derrière le genou, pointez les pieds pour l’esthétique.",
  },
  {
    name: "Scorpio",
    type: PositionType.TRICK,
    levelRequired: PositionLevel.ADVANCED,
    grips: ["CUP"],
    tips: "Gardez le bassin aligné et pensez à contracter les adducteurs.",
  },
  {
    name: "Front Hook Transition",
    type: PositionType.TRANSITION,
    levelRequired: PositionLevel.BEGINNER,
    grips: ["TRUE"],
    tips: "Transition fluide pour lier spins et tricks débutants.",
  },
  {
    name: "Basic Climb",
    type: PositionType.STRENGTH,
    levelRequired: PositionLevel.BEGINNER,
    grips: ["TRUE"],
    tips: "Bras tendus, poussé des jambes pour limiter la fatigue des biceps.",
  },
  {
    name: "Shoulder Mount Prep",
    type: PositionType.STRENGTH,
    levelRequired: PositionLevel.INTERMEDIATE,
    grips: ["FOREARM"],
    tips: "Travail contrôlé, évitez toute douleur à l’épaule avant de monter.",
    contraindications: "Fatigue ou blessure à l’épaule : adapter ou reporter.",
  },
  {
    name: "Warmup Flow 1",
    type: PositionType.WARMUP,
    levelRequired: PositionLevel.BEGINNER,
    grips: ["OTHER"],
    tips: "Routine légère pour activer épaules, poignets et hanches.",
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash("change-me-password", 10);

  const schoolNames = ["École 1", "École 2"];
  const schoolRecords: Record<string, string> = {};

  for (const name of schoolNames) {
    const school = await prisma.school.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    schoolRecords[name] = school.id;
  }

  const userRecords: Record<SeedUser["key"], string> = {
    admin: "",
    teacher: "",
    studentFree: "",
    studentPremium: "",
  };

  const primarySchoolId = schoolRecords[schoolNames[0]];

  for (const seedUser of users) {
    const record = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        passwordHash,
        role: seedUser.role,
        schoolId: primarySchoolId,
        isPremium: seedUser.isPremium ?? false,
      },
      create: {
        name: seedUser.name,
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        schoolId: primarySchoolId,
        isPremium: seedUser.isPremium ?? false,
      },
    });

    userRecords[seedUser.key] = record.id;
  }

  // Random teachers/students for each school
  for (const name of schoolNames) {
    const schoolId = schoolRecords[name];
    const slug = slugify(name);

    const teacherData = Array.from({ length: 5 }).map((_, idx) => ({
      email: `teacher${idx + 1}.${slug}@poleapp.test`,
      name: `Teacher ${idx + 1} (${name})`,
      passwordHash,
      role: Role.TEACHER,
      schoolId,
      isPremium: false,
    }));

    const studentData = Array.from({ length: 10 }).map((_, idx) => ({
      email: `student${idx + 1}.${slug}@poleapp.test`,
      name: `Student ${idx + 1}`,
      passwordHash,
      role: Role.STUDENT,
      schoolId,
      isPremium: idx % 2 === 0,
    }));

    await prisma.user.createMany({
      data: teacherData,
      skipDuplicates: true,
    });
    await prisma.user.createMany({
      data: studentData,
      skipDuplicates: true,
    });

    // Sample course per school with first teacher + 3 students + 2 positions
    const teacher = await prisma.user.findFirst({
      where: { schoolId, role: Role.TEACHER },
    });
    const schoolStudents = await prisma.user.findMany({
      where: { schoolId, role: Role.STUDENT },
      take: 3,
    });
    const schoolPositions = await prisma.position.findMany({ take: 2 });

    if (teacher && schoolStudents.length && schoolPositions.length) {
      const course = await prisma.course.create({
        data: {
          title: `Cours de demo (${name})`,
          date: new Date(),
          schoolId,
          teacherId: teacher.id,
        },
      });

      await prisma.courseAttendance.createMany({
        data: schoolStudents.map((s) => ({
          courseId: course.id,
          studentId: s.id,
        })),
      });

      await prisma.coursePosition.createMany({
        data: schoolPositions.map((p) => ({
          courseId: course.id,
          positionId: p.id,
        })),
      });
    }
  }

  for (const name of injuryTypes) {
    await prisma.injuryType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const position of positions) {
    const gripsValue =
      position.grips && position.grips.length > 0
        ? position.grips.join(",")
        : null;
    const record = await prisma.position.upsert({
      where: { name: position.name },
      update: {
        description: position.description ?? position.tips,
        levelRequired: position.levelRequired,
        type: position.type,
        grips: gripsValue,
        tips: position.tips,
        contraindications: position.contraindications,
        createdByUserId: userRecords.teacher,
      },
      create: {
        name: position.name,
        description: position.description ?? position.tips,
        levelRequired: position.levelRequired,
        type: position.type,
        grips: gripsValue,
        tips: position.tips,
        contraindications: position.contraindications,
        createdByUserId: userRecords.teacher,
      },
    });

    const mediaId = `media-${slugify(position.name)}`;
    await prisma.positionMedia.upsert({
      where: { id: mediaId },
      update: {
        positionId: record.id,
        kind: MediaKind.PHOTO,
        url: `${POSITION_MEDIA_BASE}?text=${encodeURIComponent(position.name)}`,
      },
      create: {
        id: mediaId,
        positionId: record.id,
        kind: MediaKind.PHOTO,
        url: `${POSITION_MEDIA_BASE}?text=${encodeURIComponent(position.name)}`,
      },
    });

    // Minimal progression seed to validate relations (student premium has started the first trick).
    if (position.name === "Jasmine") {
      await prisma.studentPositionProgress.upsert({
        where: {
          studentId_positionId: {
            studentId: userRecords.studentPremium,
            positionId: record.id,
          },
        },
        update: {
          learningStatus: LearningStatus.IN_PROGRESS,
          masteryLevel: MasteryLevel.INITIATED,
          comment: "Vu en cours d’initiation.",
          lastUpdatedByUserId: userRecords.teacher,
        },
        create: {
          studentId: userRecords.studentPremium,
          positionId: record.id,
          learningStatus: LearningStatus.IN_PROGRESS,
          masteryLevel: MasteryLevel.INITIATED,
          comment: "Vu en cours d’initiation.",
          lastUpdatedByUserId: userRecords.teacher,
        },
      });
    }
  }

  // Seed one active injury for the free student.
  const shoulder = await prisma.injuryType.findUnique({ where: { name: "Épaule" } });
  if (shoulder && userRecords.studentFree) {
    await prisma.studentInjury.upsert({
      where: { id: "seed-injury-shoulder-student1" },
      update: {
        studentId: userRecords.studentFree,
        injuryTypeId: shoulder.id,
        notes: "Tendinite épaule droite, éviter inversions.",
        isActive: true,
      },
      create: {
        id: "seed-injury-shoulder-student1",
        studentId: userRecords.studentFree,
        injuryTypeId: shoulder.id,
        notes: "Tendinite épaule droite, éviter inversions.",
        isActive: true,
      },
    });
  }
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
