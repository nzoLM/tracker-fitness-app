import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Compte qui reçoit le programme. Par défaut le compte de démo ;
// renseigner SEED_USER_* dans .env pour remplir son propre compte.
const SEED_USER = {
  email: process.env.SEED_USER_EMAIL ?? "demo@example.com",
  password: process.env.SEED_USER_PASSWORD ?? "demo-tracker",
  name: process.env.SEED_USER_NAME ?? "Démo",
};

const PROGRAM_NAME = "Push/Pull V2";

const MUSCLE_GROUPS = [
  "Pectoraux",
  "Grand dorsal",
  "Haut du dos",
  "Deltoïde antérieur",
  "Deltoïde médial",
  "Deltoïde postérieur",
  "Biceps",
  "Avant-bras",
  "Triceps",
  "Abdominaux",
  "Quadriceps",
  "Fessiers",
  "Ischio-jambiers",
  "Mollets",
] as const;

type MuscleGroupName = (typeof MUSCLE_GROUPS)[number];

type ExerciseSeed = {
  name: string;
  trackingType: "WEIGHTED" | "BODYWEIGHT" | "BOTH";
  isUnilateral?: boolean;
  notes: string;
  primary: MuscleGroupName[];
  secondary?: MuscleGroupName[];
  // Variantes de progression, de la plus facile à la plus dure
  variants?: string[];
};

type BlockSeed = {
  exercise: string;
  sets: number;
  // null = max reps propres
  reps: [number, number] | null;
  rest?: number;
  superset?: number;
  notes?: string;
};

type DaySeed = {
  name: string;
  rotationSlot: number | null;
  blocks: BlockSeed[];
};

const EXERCISES: ExerciseSeed[] = [
  // Pull
  {
    name: "Tractions pronation prise large",
    trackingType: "BOTH",
    notes:
      "Prise un peu plus large que les épaules. Descente complète bras tendus, menton au-dessus de la barre, descente en 3s.",
    primary: ["Grand dorsal"],
    secondary: ["Haut du dos", "Biceps"],
  },
  {
    name: "Tractions pronation prise épaules",
    trackingType: "BOTH",
    notes: "Prise largeur d'épaules. S'arrêter à 1-2 reps de l'échec.",
    primary: ["Grand dorsal"],
    secondary: ["Haut du dos", "Biceps"],
  },
  {
    name: "Rowing haltère unilatéral",
    trackingType: "WEIGHTED",
    isUnilateral: true,
    notes:
      "Genou et main sur un banc, dos plat. Coude vers la hanche, serrer l'omoplate 1s en haut, descente lente. Alternative : rowing poulie assise prise neutre.",
    primary: ["Haut du dos", "Grand dorsal"],
    secondary: ["Deltoïde postérieur", "Biceps"],
  },
  {
    name: "Face pull",
    trackingType: "WEIGHTED",
    notes:
      "Corde à hauteur de visage, écarter les mains vers l'extérieur, coudes hauts. Poids léger, jamais d'élan.",
    primary: ["Deltoïde postérieur"],
    secondary: ["Haut du dos"],
  },
  {
    name: "Curl haltère alterné (supination)",
    trackingType: "WEIGHTED",
    notes: "Partir paume neutre et tourner en supination pendant la montée. Descente en 3s.",
    primary: ["Biceps"],
  },
  {
    name: "Curl marteau",
    trackingType: "WEIGHTED",
    notes: "Prise neutre pendant tout le mouvement, descente en 3s.",
    primary: ["Avant-bras"],
    secondary: ["Biceps"],
  },
  {
    name: "Tirage bras tendus poulie haute",
    trackingType: "WEIGHTED",
    notes:
      "Bras tendus, tirer vers les cuisses, remontée en 3s sans hausser les épaules. Alternative : pull-over haltère.",
    primary: ["Grand dorsal"],
  },
  {
    name: "Relevé de jambes",
    trackingType: "BODYWEIGHT",
    notes: "Sans se balancer, descente contrôlée en 3s. Au sol si la prise lâche après les tractions.",
    primary: ["Abdominaux"],
    variants: ["Au sol", "Suspendu genoux pliés", "Suspendu jambes tendues"],
  },
  // Push
  {
    name: "Dips",
    trackingType: "BOTH",
    notes:
      "Descente jusqu'à 90°, buste légèrement penché pour la poitrine, descente en 3s. Douleur à l'épaule : réduire l'amplitude ou retirer le lest.",
    primary: ["Pectoraux", "Triceps"],
    secondary: ["Deltoïde antérieur"],
  },
  {
    name: "Élévations latérales haltères",
    trackingType: "WEIGHTED",
    notes: "Poids léger, descente en 3-4s, petit doigt légèrement plus haut que le pouce en haut.",
    primary: ["Deltoïde médial"],
  },
  {
    name: "Oiseau (rear delt fly)",
    trackingType: "WEIGHTED",
    notes:
      "Buste penché, coudes plus hauts que les mains, pause 1s en haut, aucun élan. Alternative : pec deck inversé.",
    primary: ["Deltoïde postérieur"],
    secondary: ["Haut du dos"],
  },
  {
    name: "French press / Skullcrusher",
    trackingType: "WEIGHTED",
    notes:
      "Barre EZ ou haltères, descente lente vers le front ou derrière la tête (3s), coudes fixes. Commencer léger.",
    primary: ["Triceps"],
  },
  {
    name: "Extension triceps poulie haute (corde)",
    trackingType: "WEIGHTED",
    notes: "Coudes collés aux flancs, extension complète, écarter la corde en bas.",
    primary: ["Triceps"],
  },
  {
    name: "Crunch à la poulie haute",
    trackingType: "WEIGHTED",
    notes:
      "À genoux, enrouler la colonne sans bouger les hanches. Augmenter le poids dès que 15 reps strictes sont faciles.",
    primary: ["Abdominaux"],
  },
  // Jambes maison
  {
    name: "Pistol squat",
    trackingType: "BOTH",
    isUnilateral: true,
    notes:
      "Jambe libre tendue devant, talon au sol, genou dans l'axe du pied, descente en 3s. Lest : sac à dos tenu devant soi.",
    primary: ["Quadriceps"],
    secondary: ["Fessiers"],
    variants: ["Assis sur une chaise", "Assis sur un support bas", "Complet", "Complet avec pause 2s"],
  },
  {
    name: "Squat bulgare",
    trackingType: "BOTH",
    isUnilateral: true,
    notes:
      "Pied arrière sur une chaise, genou arrière qui frôle le sol. Buste droit pour les quadriceps, penché pour les fessiers.",
    primary: ["Quadriceps", "Fessiers"],
  },
  {
    name: "Soulevé de terre roumain sur une jambe",
    trackingType: "BOTH",
    isUnilateral: true,
    notes:
      "Genou légèrement fléchi, hanches en arrière, dos plat, descente en 3s jusqu'à l'étirement de l'ischio.",
    primary: ["Ischio-jambiers"],
    secondary: ["Fessiers"],
  },
  {
    name: "Mollets sur une jambe",
    trackingType: "BODYWEIGHT",
    isUnilateral: true,
    notes: "Avant du pied sur une marche, pause 1s en bas et 1s en haut.",
    primary: ["Mollets"],
  },
];

const PULL_HEAVY_NOTES = "Augmenter le lest quand 6 reps sur toutes les séries.";
const PULL_VOLUME_NOTES = "Descente en 4-5s. Au-delà de 12 reps, ajouter un peu de lest.";

const DAYS: DaySeed[] = [
  {
    name: "Pull court",
    rotationSlot: 1,
    blocks: [
      { exercise: "Tractions pronation prise large", sets: 4, reps: [4, 6], rest: 150, notes: PULL_HEAVY_NOTES },
      { exercise: "Tractions pronation prise épaules", sets: 2, reps: null, rest: 90, notes: PULL_VOLUME_NOTES },
      { exercise: "Rowing haltère unilatéral", sets: 3, reps: [8, 12], superset: 1 },
      {
        exercise: "Face pull",
        sets: 4,
        reps: [15, 20],
        rest: 90,
        superset: 1,
        notes: "La 4e série se fait seule, 60s de repos.",
      },
      { exercise: "Curl haltère alterné (supination)", sets: 2, reps: [10, 12], superset: 2 },
      {
        exercise: "Curl marteau",
        sets: 2,
        reps: [10, 12],
        rest: 75,
        superset: 2,
        notes: "Mêmes haltères ou un peu plus lourd.",
      },
      { exercise: "Relevé de jambes", sets: 3, reps: [12, 15], rest: 60 },
    ],
  },
  {
    name: "Pull complet",
    rotationSlot: 1,
    blocks: [
      { exercise: "Tractions pronation prise large", sets: 4, reps: [4, 6], rest: 150, notes: PULL_HEAVY_NOTES },
      { exercise: "Tractions pronation prise épaules", sets: 3, reps: null, rest: 90, notes: PULL_VOLUME_NOTES },
      { exercise: "Rowing haltère unilatéral", sets: 3, reps: [8, 12], rest: 90 },
      { exercise: "Face pull", sets: 4, reps: [15, 20], rest: 60 },
      { exercise: "Curl haltère alterné (supination)", sets: 3, reps: [10, 12], rest: 75 },
      { exercise: "Curl marteau", sets: 3, reps: [10, 12], rest: 60 },
      { exercise: "Tirage bras tendus poulie haute", sets: 2, reps: [12, 15], rest: 60 },
      { exercise: "Relevé de jambes", sets: 3, reps: [12, 15], rest: 60 },
    ],
  },
  {
    name: "Push",
    rotationSlot: 2,
    blocks: [
      { exercise: "Dips", sets: 4, reps: [5, 7], rest: 150, notes: "Lestés." },
      {
        exercise: "Dips",
        sets: 3,
        reps: null,
        rest: 90,
        notes: "Sans lest, pour le volume. Au-delà de 15 reps, ajouter un peu de lest.",
      },
      { exercise: "Élévations latérales haltères", sets: 4, reps: [12, 15], superset: 1 },
      { exercise: "Oiseau (rear delt fly)", sets: 4, reps: [12, 15], rest: 75, superset: 1 },
      { exercise: "French press / Skullcrusher", sets: 3, reps: [8, 10], rest: 90 },
      { exercise: "Extension triceps poulie haute (corde)", sets: 3, reps: [12, 15], rest: 60 },
      { exercise: "Crunch à la poulie haute", sets: 4, reps: [12, 15], rest: 60 },
    ],
  },
  {
    name: "Jambes maison",
    rotationSlot: null,
    blocks: [
      { exercise: "Pistol squat", sets: 3, reps: [5, 8], rest: 90 },
      { exercise: "Squat bulgare", sets: 3, reps: [8, 12], rest: 75 },
      { exercise: "Soulevé de terre roumain sur une jambe", sets: 3, reps: [10, 12], rest: 60 },
      { exercise: "Mollets sur une jambe", sets: 2, reps: [12, 15], rest: 45 },
    ],
  },
];

async function seedMuscleGroups() {
  const ids = new Map<MuscleGroupName, string>();
  for (const name of MUSCLE_GROUPS) {
    const group = await prisma.muscleGroup.upsert({ where: { name }, update: {}, create: { name } });
    ids.set(name, group.id);
  }
  return ids;
}

async function findOrCreateUser() {
  const existing = await prisma.user.findUnique({ where: { email: SEED_USER.email } });
  if (existing) return existing.id;

  const { user } = await auth.api.signUpEmail({ body: SEED_USER });
  console.log(`Compte créé : ${SEED_USER.email}`);
  return user.id;
}

async function seedExercises(userId: string, muscleIds: Map<MuscleGroupName, string>) {
  const ids = new Map<string, string>();
  for (const { name, primary, secondary = [], variants = [], ...fields } of EXERCISES) {
    const exercise = await prisma.exercise.upsert({
      where: { userId_name: { userId, name } },
      update: fields,
      create: { userId, name, ...fields },
    });
    ids.set(name, exercise.id);

    const muscles = [
      ...primary.map((m) => ({ muscle: m, role: "PRIMARY" as const })),
      ...secondary.map((m) => ({ muscle: m, role: "SECONDARY" as const })),
    ];
    for (const { muscle, role } of muscles) {
      const muscleGroupId = muscleIds.get(muscle)!;
      await prisma.exerciseMuscleGroup.upsert({
        where: { exerciseId_muscleGroupId: { exerciseId: exercise.id, muscleGroupId } },
        update: { role },
        create: { exerciseId: exercise.id, muscleGroupId, role },
      });
    }

    for (const [index, variantName] of variants.entries()) {
      const level = index + 1;
      await prisma.exerciseVariant.upsert({
        where: { exerciseId_level: { exerciseId: exercise.id, level } },
        update: { name: variantName },
        create: { exerciseId: exercise.id, level, name: variantName },
      });
    }
  }
  return ids;
}

async function seedProgram(userId: string, exerciseIds: Map<string, string>) {
  const existing = await prisma.program.findFirst({ where: { userId, name: PROGRAM_NAME } });
  if (existing) {
    console.log(`Programme "${PROGRAM_NAME}" déjà présent, laissé tel quel.`);
    return;
  }

  await prisma.$transaction([
    prisma.program.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
    prisma.program.create({
      data: {
        userId,
        name: PROGRAM_NAME,
        isActive: true,
        sessionsPerWeek: 4,
        days: {
          create: DAYS.map((day, dayIndex) => ({
            name: day.name,
            position: dayIndex + 1,
            rotationSlot: day.rotationSlot,
            exercises: {
              create: day.blocks.map((block, blockIndex) => ({
                exerciseId: exerciseIds.get(block.exercise)!,
                position: blockIndex + 1,
                targetSets: block.sets,
                repMin: block.reps?.[0] ?? null,
                repMax: block.reps?.[1] ?? null,
                restSeconds: block.rest ?? null,
                supersetGroup: block.superset ?? null,
                notes: block.notes ?? null,
              })),
            },
          })),
        },
      },
    }),
  ]);
  console.log(`Programme "${PROGRAM_NAME}" créé.`);
}

async function main() {
  const muscleIds = await seedMuscleGroups();
  const userId = await findOrCreateUser();
  const exerciseIds = await seedExercises(userId, muscleIds);
  await seedProgram(userId, exerciseIds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
