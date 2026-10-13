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
