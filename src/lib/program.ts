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

// Regroupe les blocs consécutifs d'un même superset ; un bloc seul forme un groupe d'un élément
export function groupBySuperset(blocks: ProgramBlock[]) {
  const groups: ProgramBlock[][] = [];
  for (const block of blocks) {
    const last = groups.at(-1);
    if (last && block.supersetGroup !== null && last[0].supersetGroup === block.supersetGroup) {
      last.push(block);
    } else {
      groups.push([block]);
    }
  }
  return groups;
}

export function formatReps(repMin: number | null, repMax: number | null) {
  if (repMin === null && repMax === null) return "max reps propres";
  if (repMin === null || repMax === null || repMin === repMax) return `${repMin ?? repMax} reps`;
  return `${repMin}-${repMax} reps`;
}

export function formatRest(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  if (rest === 0) return `${minutes} min`;
  return `${minutes} min ${String(rest).padStart(2, "0")}`;
}
