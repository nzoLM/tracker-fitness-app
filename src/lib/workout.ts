import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AverageDuration } from "@/lib/program-format";
import { programDayInclude } from "@/lib/program";

const workoutDayInclude = { programDay: { select: { id: true, name: true, rotationSlot: true } } };

// Séance à faire aujourd'hui : la place de rotation qui suit la dernière séance faite.
// Les jours d'une même place (Pull court / Pull complet) sont proposés au choix.
export async function getTodayPlan(userId: string) {
  const program = await prisma.program.findFirst({
    where: { userId, isActive: true },
    include: {
      days: {
        orderBy: { position: "asc" },
        include: {
          exercises: {
            orderBy: { position: "asc" },
            select: {
              targetSets: true,
              restSeconds: true,
              supersetGroup: true,
              exercise: { select: { isUnilateral: true } },
            },
          },
        },
      },
    },
  });
  if (!program) return null;

  const [inProgress, lastRotationWorkout, durations] = await Promise.all([
    prisma.workout.findFirst({
      where: { userId, finishedAt: null },
      orderBy: { startedAt: "desc" },
      include: workoutDayInclude,
    }),
    prisma.workout.findFirst({
      where: { userId, programDay: { programId: program.id, rotationSlot: { not: null } } },
      orderBy: { startedAt: "desc" },
      include: workoutDayInclude,
    }),
    getAverageDurations(
      userId,
      program.days.map((day) => day.id),
    ),
  ]);

  const slots = [...new Set(program.days.flatMap((day) => day.rotationSlot ?? []))].sort((a, b) => a - b);
  const lastSlot = lastRotationWorkout?.programDay?.rotationSlot;
  const nextSlot =
    lastSlot === undefined || lastSlot === null
      ? slots[0]
      : (slots.find((slot) => slot > lastSlot) ?? slots[0]);

  return {
    program,
    inProgress,
    lastRotationWorkout,
    durations,
    suggestedDays: program.days.filter((day) => day.rotationSlot !== null && day.rotationSlot === nextSlot),
    otherDays: program.days.filter((day) => day.rotationSlot === null || day.rotationSlot !== nextSlot),
  };
}

export type TodayPlan = NonNullable<Awaited<ReturnType<typeof getTodayPlan>>>;

const workoutInclude = {
  sets: { orderBy: { setNumber: "asc" } },
  programDay: {
    include: {
      exercises: {
        ...programDayInclude.exercises,
        include: {
          exercise: {
            include: {
              ...programDayInclude.exercises.include.exercise.include,
              variants: { orderBy: { level: "asc" } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.WorkoutInclude;

export type WorkoutWithDay = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;
export type WorkoutBlock = NonNullable<WorkoutWithDay["programDay"]>["exercises"][number];

export type LoggedSet = {
  programExerciseId: string | null;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  variantId: string | null;
};

function toLoggedSet({ programExerciseId, setNumber, reps, weightKg, variantId }: LoggedSet): LoggedSet {
  return { programExerciseId, setNumber, reps, weightKg, variantId };
}

// La séance et, pour rappel, les séries de la précédente séance du même jour
export async function getWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: workoutInclude,
  });
  if (!workout) return null;

  const previous = workout.programDayId
    ? await prisma.workout.findFirst({
        where: {
          userId,
          programDayId: workout.programDayId,
          startedAt: { lt: workout.startedAt },
          sets: { some: {} },
        },
        orderBy: { startedAt: "desc" },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      })
    : null;

  return {
    workout,
    sets: workout.sets.map(toLoggedSet),
    previousSets: previous?.sets.map(toLoggedSet) ?? [],
  };
}

// Durées hors de cet intervalle écartées : séance terminée en retard (bouton oublié) ou abandonnée
const MIN_PLAUSIBLE_SECONDS = 10 * 60;
const MAX_PLAUSIBLE_SECONDS = 3 * 60 * 60;
// Moyenne sur les dernières séances, pour suivre l'évolution du rythme
const AVERAGE_OVER = 5;

// Durée moyenne réelle des dernières séances terminées, par jour du programme
export async function getAverageDurations(userId: string, programDayIds: string[]) {
  const workouts = await prisma.workout.findMany({
    where: { userId, programDayId: { in: programDayIds }, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    select: { programDayId: true, startedAt: true, finishedAt: true },
    take: 200,
  });

  const byDay = new Map<string, number[]>();
  for (const { programDayId, startedAt, finishedAt } of workouts) {
    const seconds = (finishedAt!.getTime() - startedAt.getTime()) / 1000;
    if (!programDayId || seconds < MIN_PLAUSIBLE_SECONDS || seconds > MAX_PLAUSIBLE_SECONDS) continue;
    const list = byDay.get(programDayId) ?? [];
    if (list.length < AVERAGE_OVER) byDay.set(programDayId, [...list, seconds]);
  }

  const averages = new Map<string, AverageDuration>();
  for (const [dayId, list] of byDay) {
    averages.set(dayId, { seconds: list.reduce((a, b) => a + b, 0) / list.length, count: list.length });
  }
  return averages;
}
