"use server";

import { redirect } from "next/navigation";
import type { TrackingType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const MAX_BLOCKS = 30;
const MAX_NAME_LENGTH = 60;
const MAX_NOTES_LENGTH = 500;
const TRACKING_TYPES: TrackingType[] = ["WEIGHTED", "BODYWEIGHT", "BOTH"];

export type BlockInput = {
  // null pour un bloc ajouté dans l'éditeur
  id: string | null;
  exerciseId: string;
  targetSets: number;
  // Les deux à null = max reps propres
  repMin: number | null;
  repMax: number | null;
  restSeconds: number | null;
  // Enchaîné en superset avec le bloc suivant
  linkedToNext: boolean;
  notes: string;
};

export type SaveDayInput = {
  dayId: string;
  name: string;
  rotationSlot: number | null;
  blocks: BlockInput[];
};

function isIntBetween(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function validateBlock(block: BlockInput, index: number): string | null {
  const label = `Exercice ${index + 1}`;
  if (typeof block.exerciseId !== "string") return `${label} : exercice manquant.`;
  if (!isIntBetween(block.targetSets, 1, 20)) return `${label} : entre 1 et 20 séries.`;
  const { repMin, repMax } = block;
  if ((repMin === null) !== (repMax === null)) return `${label} : indique les deux bornes de reps.`;
  if (repMin !== null && repMax !== null) {
    if (!isIntBetween(repMin, 1, 500) || !isIntBetween(repMax, 1, 500)) return `${label} : reps invalides.`;
    if (repMin > repMax) return `${label} : le minimum de reps dépasse le maximum.`;
  }
  if (block.restSeconds !== null && !isIntBetween(block.restSeconds, 0, 900)) return `${label} : repos invalide.`;
  if (typeof block.notes !== "string" || block.notes.length > MAX_NOTES_LENGTH) return `${label} : note trop longue.`;
  return null;
}

// Enregistre un jour en une fois. Les blocs existants sont mis à jour sur place
// (et non recréés) pour que les séries déjà faites restent rattachées à leur bloc.
export async function saveProgramDay(input: SaveDayInput): Promise<{ error: string }> {
  const { user } = await requireSession();
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name || name.length > MAX_NAME_LENGTH) return { error: "Nom du jour invalide." };
  if (input.rotationSlot !== null && !isIntBetween(input.rotationSlot, 1, 20)) {
    return { error: "Place dans la rotation invalide." };
  }
  if (!Array.isArray(input.blocks) || input.blocks.length > MAX_BLOCKS) return { error: "Trop d'exercices." };
  for (const [index, block] of input.blocks.entries()) {
    const error = validateBlock(block, index);
    if (error) return { error };
  }

  const day = await prisma.programDay.findFirst({
    where: { id: input.dayId, program: { userId: user.id } },
    select: { id: true, exercises: { select: { id: true, exerciseId: true } } },
  });
  if (!day) return { error: "Jour introuvable." };

  const ownExercises = await prisma.exercise.findMany({
    where: { userId: user.id, id: { in: input.blocks.map((block) => block.exerciseId) } },
    select: { id: true },
  });
  const ownExerciseIds = new Set(ownExercises.map((exercise) => exercise.id));
  if (input.blocks.some((block) => !ownExerciseIds.has(block.exerciseId))) return { error: "Exercice inconnu." };

  // Un bloc dont l'exercice a changé devient un nouveau bloc : son historique
  // appartient à l'ancien exercice
  const existing = new Map(day.exercises.map((block) => [block.id, block.exerciseId]));
  const blocks = input.blocks.map((block) => ({
    ...block,
    id: block.id && existing.get(block.id) === block.exerciseId ? block.id : null,
  }));
  const keptIds = blocks.flatMap((block) => block.id ?? []);

  // Numéros de superset recalculés depuis les liaisons « enchaîné avec le suivant »
  let group = 0;
  const supersetGroups = blocks.map((block, index) => {
    const linkedToPrevious = index > 0 && blocks[index - 1].linkedToNext;
    const linkedToNext = block.linkedToNext && index < blocks.length - 1;
    if (!linkedToPrevious && linkedToNext) group += 1;
    return linkedToPrevious || linkedToNext ? group : null;
  });

  await prisma.$transaction(async (tx) => {
    await tx.programDay.update({ where: { id: day.id }, data: { name, rotationSlot: input.rotationSlot } });
    await tx.programExercise.deleteMany({ where: { programDayId: day.id, id: { notIn: keptIds } } });
    // Positions passées en négatif le temps de réordonner, à cause de l'unicité (jour, position)
    await tx.programExercise.updateMany({
      where: { programDayId: day.id },
      data: { position: { multiply: -1 } },
    });
    for (const [index, block] of blocks.entries()) {
      const data = {
        exerciseId: block.exerciseId,
        position: index + 1,
        targetSets: block.targetSets,
        repMin: block.repMin,
        repMax: block.repMax,
        restSeconds: block.restSeconds,
        supersetGroup: supersetGroups[index],
        notes: block.notes.trim() || null,
      };
      if (block.id) {
        await tx.programExercise.update({ where: { id: block.id }, data });
      } else {
        await tx.programExercise.create({ data: { ...data, programDayId: day.id } });
      }
    }
  });

  redirect("/programme");
}

export async function createProgramDay() {
  const { user } = await requireSession();
  const program = await prisma.program.findFirst({
    where: { userId: user.id, isActive: true },
    select: { id: true, days: { select: { position: true }, orderBy: { position: "desc" }, take: 1 } },
  });
  if (!program) throw new Error("Aucun programme actif.");

  const day = await prisma.programDay.create({
    data: { programId: program.id, name: "Nouveau jour", position: (program.days[0]?.position ?? 0) + 1 },
    select: { id: true },
  });
  redirect(`/programme/${day.id}`);
}

// Les séances déjà faites sont conservées, détachées du jour
export async function deleteProgramDay(dayId: string) {
  const { user } = await requireSession();
  await prisma.programDay.deleteMany({ where: { id: dayId, program: { userId: user.id } } });
  redirect("/programme");
}

export type NewExerciseInput = {
  name: string;
  trackingType: TrackingType;
  isUnilateral: boolean;
  muscleGroupId: string;
};

export type CatalogExercise = { id: string; name: string; trackingType: TrackingType; isUnilateral: boolean };

export async function createExercise(
  input: NewExerciseInput,
): Promise<{ exercise: CatalogExercise } | { error: string }> {
  const { user } = await requireSession();
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name || name.length > MAX_NAME_LENGTH) return { error: "Nom de l'exercice invalide." };
  if (!TRACKING_TYPES.includes(input.trackingType)) return { error: "Type de suivi invalide." };
  if (typeof input.isUnilateral !== "boolean") return { error: "Valeur unilatérale invalide." };

  const [muscle, duplicate] = await Promise.all([
    prisma.muscleGroup.findUnique({ where: { id: input.muscleGroupId }, select: { id: true } }),
    prisma.exercise.findUnique({ where: { userId_name: { userId: user.id, name } }, select: { id: true } }),
  ]);
  if (!muscle) return { error: "Groupe musculaire invalide." };
  if (duplicate) return { error: "Un exercice porte déjà ce nom." };

  const exercise = await prisma.exercise.create({
    data: {
      userId: user.id,
      name,
      trackingType: input.trackingType,
      isUnilateral: input.isUnilateral,
      muscles: { create: { muscleGroupId: muscle.id, role: "PRIMARY" } },
    },
    select: { id: true, name: true, trackingType: true, isUnilateral: true },
  });
  return { exercise };
}
