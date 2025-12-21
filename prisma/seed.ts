import {
  PositionLevel,
  PositionType,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "poleapp123";
const POSITION_IMAGES = [
  "https://lh3.googleusercontent.com/gg/AIJ2gl9g9AbO5ydEY-7YkF-aEcwDenGx1FoBEtg0GhathupNmfOukxUNp5oo74oy3x_Xf6Dpb2OjxlaOPz5cqGc6alVkvDg9-dG2emfTYPfvh4woeB7WhB-Rwn7VkWsE-m5MMuPYEBYQitOuRx1IZ9vkYGFN72cuzvB0jHipYuV0WKCmepbnfdFk=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl8MELZ5jCdKlvKseZ8dtaHmJSeYsvPJ1Q3zIs1q2wLEUPsluvMBmBBE0raC9qgg0BaItEyFCVigJxtfI-0xj4w6CGH_6T5H46qmdjIj1Re4NMhZ5m-u8KEZn60S8uUkwyM2NDrlGfn_AMRsgEA3PHbNde5rNw1jINEif-ax49TMdhTG1lg=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_ebQkumW_TmKEaxrMz6v2ckcIK_o0PWh3rHBWeFtPQYymkbS6ROnIqg22PTyGO3N8xRsKzKskFbU_jlHZLSHFXTK589Jz2dgxN_BYSJG3wpaxrwrb_T5cNczjVUlSXY6VWNlY_EizK-rjigcGGhsDUXFtZm0INSbYwChjxM2U_V88kZZg=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl92EVSGYQj2zFUNnvr7P6hlKGgLqE7ea0I79SMSyRLTPfWfLccKTJgUUxPG_g6_lRqM_lzdj6qiHmKnQ4kkZ4vC_SuVOmB6aixhMkr2pXNqIP3Z6BgndsilmWRj5Crsg85eGn8lBbu9TCELfYbaarHhVNKutszI2SetoYDzs1fVLRSb22M=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl9lhQ_EZPi9q2RqFiYKyedKGk3e7cqLyzIcioUINi0tLYRf15sIQnCx_gRY0m1HWWzN8XAlTQVWPkUAEUjSuu4XFNG0Y0Docq763RvDMWRdXbjp6D2NHHKx8oblXcAGmJuulYYuhVTQE3ISXzP4vdbv41m4G0PC7M6piZ101RFFb0Rf1B5E=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl-LRqAucFuV5pWvkLHbzmGF18_gFekpoqBKN5llfIZnVJ6mAWqlQioYIKA5xx_ucyg9i7XPYl7JY5T9IB0GJs2DFMJFrVl80U37FkiqHH5gwllCZgLLCA0lXS3jyyibOIGao6rJgz0YNfGmR860mnGT9iNQ-B-yAs9cwAG1Ps-8s4AZIFI=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl9E2eNFrHG9Kejz1Y_8tTEBRBgT44mCwZ0LO4RFOibn7KNrkC2DkxSoc4oOfez9H57kBwICFveZrqgTfASr-NP_j0V1Zi2jgpzOYbd1e1I4CbWUjDC8pQoG9HzfL0KkyTkzNgXS9pWZgQ0_z_ympPvhP5MyzT13IAirZTUpLEWdbNzpfD_0=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl-FwxF2zF00wAQhLj3xsw9NQ30Y7aG_Rnz7YiuS-4Iy7fxgzUudLKhbrJ0WVvlaNXBfEdUkn6wEOxnr-CFWoi1wkkQVOsdcqvUb9_40usJy4lQHk-5f397UZ7sydmEPgsgtYpb6-E4h14fM-EsPxnneCunP7g5dLqueubwxCIBbRwk7xqqP=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl8dzakEV4ZtH6f1-997n_g9lOOE1sVFcNtMYjLWmaE1jsIGlPijZ2LiMJTiABk4li38IE8zHM7KqiycLe4Tjdqygj16QGl7HorQT8Q4B7VzUF99BXCeReCzv0EUrHZ7zfH_ZeRjSXJJ5Qw7-zB7X1NwZdhYwm1s_cyJjxdjqntVRyu57OY=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl93uHHB8nuf9tkB-IUHtFdDMp8cHUVEqodV0p7Mu37ofIwsSXIveFbe-ef5mTFDiUVC0XqkCCIz6-1FCehMCI1Gur7VJZLCY6VRohBwnlqCxyuC51kwDcb8Kn0kBceXoMY2KUi1otiHPmmYg1Q4U001eooNC-EJ9T8Os1Y9g0XFH7uYDOGA=s1024-rj-mp2",
];

const COURSE_IMAGES = [
  "https://lh3.googleusercontent.com/gg/AIJ2gl8TbWwuodIYBUbv4aB0gvLaW_lUPBzowG-lx8yoKvvGAApChdCWvZ54_V85orFHq2VwBseL6Jk0R7obLqygvDhjbvg7YyjYzUg_-qllFtUTsYtZaTsdhfuwSDldaAPwyQArWQkigOySiu1jU9wXhZptQGTHncj1xKgAcsNPcDZgNZI1fgf1=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl-O0kyIS4iTyAAIhgvQ88vPU57YveEMUtL4Zy8VDVzsOdMaFVlMCnXdm-ZYe8H4aX0V1RdRQerGFiZh5e4yahgY6wiqm4nBx9BnnbzSqPpLrO9J-tTdGHL1RzQm-ABUPYd_Zz46QUHceDikdEx6G7OF-EAhzO3t892DRlcCNlrPwSk7GXrr=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_T4q4yKSczJN1sKaYaYWADCd7oMIPi1w9B8GSWM9fGByTl08E7nOyz4ac4U1w4CTv2strw4WPwXwixt1VUTgJVIA-aLxGbQAmSTS2f6TN8PN1kOVQFVI3x4RYVA-G656dVZFPv5xK0UMPm708lNwR4I4pwq4UHJntiz25nNH82Jf_JLPfy=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_7iQJhilL9TIPSwcL19L-_Etfi1v5enAfdLpGgWTAH5KRBL_o5BVt-dfPKcuWrTq8-fF6Eh1bAr_6zKBv--JNGZ-tdTE74bOLBgOXDSxABIVacgVWeeWzzLU9M-GpoqlWqJ3OFcOZ0Milybo_YKb_L1o2LpGul2N4Kyfku_-lf6jZ6P20=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_qqPNhkjJA4TDUzpb7YFL5zdbwHoneTjaeWdKNnuGHhMaGWqb7fV9Cp6-nf2pD_N0C7AnX0PTn38yb9PaJxfo9wERhdb02viRZ4I4cFHk2ZN_f5y3ONh5iTN2sglGuwiQVmpMzVUh2CTKu8_3i0dKSkMUz999ny8YEv3-QNJTR6acsbMhy=s1024-rj-mp2",
];

const STUDENT_AVATARS = [
  "https://lh3.googleusercontent.com/gg/AIJ2gl9OatjXArFO9VZUH9L4-ZiuW3YNQ1PVDkF0kVmVNFR8YhfYN7rPXrJnq5MB9mcHZ5DsZvVrJmkm115sA-MrDI-dCO4Ax3YfJXe8iolzTt0T-BnBnScKO1jLVHxIU6yXa-Zm6i6MpPsTC2a0fOqVjnc9C7MRAucv0GUlOLmB2yuTAjW__xLb=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl8s9-6udyKGuznwJoy32Pdx8s5zWHN9GGPnj7oM46m870P-Z1t8klX36MVzoiSmlRFXtlRvWC4azmkXKQ4KSPwWzq6nsC57SICSkOcYtUgt3-XrhYG0WjwjDOLBISzl2-WO4PO5veoL2sR7GuPOQXywzsIGZB9RcB2Y7vuzF5z6U7JYWDA=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl9-QMyG3ZTbjzl_LNyVFHP_c88-kAnLxLdFGl84RBafV7bPzb_SAkM7nLYWnJoksuQCuwfFLWq7f5Ix_R3gO0yNIpPvDQmaPGRVYW9qpo8zIXxmgO0y0Hl-qfieLtM7bxoruJHstL_aj4gCCupE0do7SpU9BkzuYU4A8f6qpK8zDZN-cHym=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_1ByxtCV0xeaZuSG4RFA0YTKGc_Q9_t2i4KbylznUlNuqK2F_Gexhs8Xqb6qC0mr0LY4FjUzVOI8lpkRo-O7MjPo8q_Uhg5D8G7VAbjbUUbiYpFWqtr5fhUQpnk5O8TJtvjjIQpy1F48NFloiMPz6abzDgIAjLeN1samqI6uTjAioi8yhk=s1024-rj-mp2",
];

const TEACHER_AVATARS = [
  "https://lh3.googleusercontent.com/gg/AIJ2gl9JktuvBdx-_mj_ZKZRzJZOVCSdT7T2ZNT4MF-HyjBuYS6MLAUBNrmHvPGcwKMAF22wIfYYimAWETPS1YrAIMyiru20CFcmhPCYe3ndUvG2dJzCyn20wRQAEC--Go2xpM_-4_Q2LI9QHptVbAeTAR4LgDezfiRIRgogNFii5Sid7ig-HhQM=s1024-rj-mp2",
  "https://lh3.googleusercontent.com/gg/AIJ2gl_JGOH9kOa4P2H1dImuOkaDZJP8HUosYiG6Nju6UH19YX7U77NQvFj9lSMOXg0QN7PbDPzE2gNtrY0tjQfb_rD_DF_yEJ_b-ZBfq0T4qphLRvLJ9iMLSTVaIZL2iUziAyOGQ15T259quTeqWmJEIDecbCHJvxKu6ZtdtsHhiR5WvGKyMDCu=s1024-rj-mp2",
];

const injuryTypes = ["Épaule", "Poignet", "Coude", "Bas du dos", "Genou"];

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
];

const schoolsList = [
  "Élan",
  "Horizon",
  "Académie Arabesque",
  "Pulsation Dance Center",
  "Atelier du Mouvement",
  "Impulsion Danse",
  "Latitude Danse",
  "Rythme & Grâce",
  "Équilibre",
];

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

const people = [
  { name: "Léa Morel", age: 22 },
  { name: "Julien Caron", age: 28 },
  { name: "Maya Lefèvre", age: 19 },
  { name: "Arthur Dubois", age: 30 },
  { name: "Inès Laurent", age: 24 },
  { name: "Amine Petit", age: 33 },
  { name: "Camille Simon", age: 21 },
  { name: "Léo Bernard", age: 27 },
  { name: "Zoé Fournier", age: 25 },
  { name: "Raphaël Michel", age: 29 },
  { name: "Nora Garcia", age: 18 },
  { name: "Hugo Martin", age: 32 },
  { name: "Eva Roux", age: 23 },
  { name: "Thomas Girard", age: 35 },
  { name: "Sarah Lambert", age: 26 },
  { name: "Maxime Lopez", age: 31 },
  { name: "Alice Robert", age: 20 },
  { name: "Yanis Colin", age: 34 },
  { name: "Chloé Didier", age: 28 },
  { name: "Victor Marin", age: 40 },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

async function resetAll() {
  await prisma.$executeRawUnsafe(`TRUNCATE
    "CourseAttendance",
    "CourseNote",
    "CoursePosition",
    "Course",
    "StudentPositionProgress",
    "TeacherFavoritePosition",
    "PositionMedia",
    "Position",
    "SponsoredLink",
    "Partner",
    "Studio",
    "StudentInjury",
    "InjuryType",
    "User",
    "School"
    CASCADE;`);
}

async function seedTaxonomies() {
  await Promise.all(
    injuryTypes.map((name) =>
      prisma.injuryType.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const createdPositions = [];
  for (let i = 0; i < positionsData.length; i += 1) {
    const pos = positionsData[i];
    const image = POSITION_IMAGES[i % POSITION_IMAGES.length];
    const created = await prisma.position.create({
      data: {
        name: pos.name,
        type: pos.type,
        levelRequired: pos.level,
        grips: pos.grips,
        media: {
          create: {
            url: image,
            kind: "IMAGE",
          },
        },
      },
    });
    createdPositions.push(created);
  }
  return createdPositions;
}

async function seedSchoolsAndUsers() {
  // On prend les 2 premières écoles de la liste
  const selectedSchools = schoolsList.slice(0, 2);
  const schools = await Promise.all(
    selectedSchools.map((name) =>
      prisma.school.create({
        data: {
          name,
          address: `Adresse ${name}`,
        },
      })
    )
  );

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Fixed accounts on school1
  const fixedAccounts = [
    { email: "admin@poleapp.test", role: Role.SCHOOL_ADMIN, premium: true, name: "Admin PoleApp", schoolIdx: 0 },
    { email: "teacher@poleapp.test", role: Role.TEACHER, premium: true, name: "Teacher PoleApp", schoolIdx: 0, avatar: TEACHER_AVATARS[0] },
    { email: "student1@poleapp.test", role: Role.STUDENT, premium: false, name: "Student One", schoolIdx: 0, avatar: STUDENT_AVATARS[0], age: 22 },
    { email: "student2@poleapp.test", role: Role.STUDENT, premium: true, name: "Student Two", schoolIdx: 0, avatar: STUDENT_AVATARS[1], age: 24 },
  ];

  for (const acc of fixedAccounts) {
    await prisma.user.create({
      data: {
        email: acc.email,
        passwordHash,
        role: acc.role,
        isPremium: acc.premium,
        schoolId: schools[acc.schoolIdx].id,
        name: acc.name,
        avatarUrl: acc.avatar,
        age: acc.age ?? null,
      },
    });
  }

  // Distribute remaining names for teachers/students
  let nameIdx = 0;
  const teachers: { id: string; schoolId: string }[] = [];
  const students: { id: string; schoolId: string }[] = [];

  const teacherAvatars = [...TEACHER_AVATARS];
  const studentAvatars = [...STUDENT_AVATARS];

  for (const school of schools) {
    // 2 profs
    for (let i = 0; i < 2; i += 1) {
      const person = people[nameIdx % people.length];
      nameIdx += 1;
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
      const person = people[nameIdx % people.length];
      nameIdx += 1;
      const created = await prisma.user.create({
        data: {
          email: `student${i + 1}.${slugify(school.name)}@poleapp.test`,
          passwordHash,
          role: Role.STUDENT,
          isPremium: i % 2 === 0,
          schoolId: school.id,
          name: person.name,
          age: person.age,
          avatarUrl: studentAvatars.length ? studentAvatars.shift() : null,
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
  const times = [16, 17, 18, 19, 20, 21];

  // 5 passés
  for (let i = 0; i < 5 && slots.length < total; i += 1) {
    const dayOffset = -rng(1, daysPast);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    slots.push({ date: start, duration: rng(45, 90) });
  }
  // futurs
  while (slots.length < total) {
    const dayOffset = rng(0, daysFuture);
    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(times[rng(0, times.length - 1)], 0, 0, 0);
    const duration = rng(45, 90);
    const overlap = slots.some((s) => Math.abs(s.date.getTime() - start.getTime()) < 60 * 60 * 1000);
    if (!overlap) {
      slots.push({ date: start, duration });
    }
  }
  return slots;
}

async function seedCourses(schoolsData: {
  schools: { id: string; name: string }[];
  teachers: { id: string; schoolId: string }[];
  students: { id: string; schoolId: string }[];
  positions: { id: string }[];
}) {
  const { schools, teachers, students, positions } = schoolsData;
  let courseImageIdx = 0;
  let courseNameIdx = 0;

  for (const school of schools) {
    const schoolTeachers = teachers.filter((t) => t.schoolId === school.id);
    const schoolStudents = students.filter((s) => s.schoolId === school.id);

    // studios
    const studiosForSchool = studiosList.slice(0, 3).map((name, idx) => ({
      name: `${name} ${idx + 1}`,
      address: `Paris ${idx + 1}`,
    }));
    const createdStudios = await Promise.all(
      studiosForSchool.map((s, idx) =>
        prisma.studio.create({
          data: {
            name: s.name,
            address: s.address,
            schoolId: school.id,
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
      const teacher = schoolTeachers[i % schoolTeachers.length];
      const startTs = slot.date.getTime();

      // éviter collisions studio/teacher (même timestamp)
      const studioTimes = studioSchedule.get(studio.id) ?? [];
      if (studioTimes.includes(startTs)) continue;
      const teacherTimes = teacherSchedule.get(teacher.id) ?? [];
      if (teacherTimes.includes(startTs)) continue;
      studioSchedule.set(studio.id, [...studioTimes, startTs]);
      teacherSchedule.set(teacher.id, [...teacherTimes, startTs]);

      const attendees = schoolStudents.sort(() => 0.5 - Math.random()).slice(0, 5 + (i % 2));
      const coursePositions = positions.sort(() => 0.5 - Math.random()).slice(0, 2 + (i % 3));
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
    }
  }
}

async function main() {
  await resetAll();
  const positions = await seedTaxonomies();
  const { schools, teachers, students } = await seedSchoolsAndUsers();
  await seedCourses({ schools, teachers, students, positions });
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
