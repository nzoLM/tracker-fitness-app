import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Un jour avec ses exercices dans l'ordre, réutilisé par la page séance
export const programDayInclude = {
  exercises: {
    orderBy: { position: "asc" },
    include: {
      exercise: {
        include: {
          muscles: {
            where: { role: "PRIMARY" },
            include: { muscleGroup: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ProgramDayInclude;

const programInclude = {
  days: {
    orderBy: { position: "asc" },
    include: programDayInclude,
  },
} satisfies Prisma.ProgramInclude;

export type ProgramWithDays = Prisma.ProgramGetPayload<{ include: typeof programInclude }>;
export type ProgramDayWithExercises = ProgramWithDays["days"][number];
export type ProgramBlock = ProgramDayWithExercises["exercises"][number];

export async function getActiveProgram(userId: string) {
  return prisma.program.findFirst({
    where: { userId, isActive: true },
    include: programInclude,
  });
}

// Un jour à modifier, le catalogue d'exercices et les autres jours (pour la rotation)
export async function getDayForEdit(userId: string, dayId: string) {
  const day = await prisma.programDay.findFirst({
    where: { id: dayId, program: { userId } },
    include: {
      exercises: { orderBy: { position: "asc" } },
      program: {
        select: { days: { orderBy: { position: "asc" }, select: { id: true, name: true, rotationSlot: true } } },
      },
    },
  });
  if (!day) return null;

  const [exercises, muscleGroups] = await Promise.all([
    prisma.exercise.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, trackingType: true, isUnilateral: true },
    }),
    prisma.muscleGroup.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { day, exercises, muscleGroups };
}

export type DayForEdit = NonNullable<Awaited<ReturnType<typeof getDayForEdit>>>;
