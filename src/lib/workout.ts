import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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
        include: { _count: { select: { exercises: true } } },
      },
    },
  });
  if (!program) return null;

  const [inProgress, lastRotationWorkout] = await Promise.all([
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
