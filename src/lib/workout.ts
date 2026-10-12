import "server-only";
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

export async function getWorkout(userId: string, workoutId: string) {
  return prisma.workout.findFirst({
    where: { id: workoutId, userId },
    include: { programDay: { include: programDayInclude } },
  });
}
