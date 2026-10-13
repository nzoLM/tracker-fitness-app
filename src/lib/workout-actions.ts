"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function startWorkout(formData: FormData) {
  const { user } = await requireSession();

  const programDayId = formData.get("programDayId");
  if (typeof programDayId !== "string") throw new Error("Jour du programme manquant.");

  const day = await prisma.programDay.findFirst({
    where: { id: programDayId, program: { userId: user.id } },
    select: { id: true },
  });
  if (!day) throw new Error("Jour du programme introuvable.");

  // Une seule séance en cours à la fois : on reprend celle qui existe déjà
  const workout =
    (await prisma.workout.findFirst({
      where: { userId: user.id, finishedAt: null },
      select: { id: true },
    })) ??
    (await prisma.workout.create({
      data: { userId: user.id, programDayId: day.id },
      select: { id: true },
    }));

  redirect(`/seance/${workout.id}`);
}

export type SaveSetInput = {
  workoutId: string;
  programExerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  variantId: string | null;
};

// Crée ou corrige une série ; renvoie une erreur lisible plutôt que de lever,
// pour l'afficher sur la ligne concernée
export async function saveSet(input: SaveSetInput): Promise<{ error?: string }> {
  const { user } = await requireSession();
  const { workoutId, programExerciseId, setNumber, reps, weightKg, variantId } = input;

  if (!Number.isInteger(setNumber) || setNumber < 1 || setNumber > 30) {
    return { error: "Numéro de série invalide." };
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 500) return { error: "Reps invalides." };
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000)) {
    return { error: "Charge invalide." };
  }

  // Le bloc doit appartenir au jour de cette séance, elle-même à l'utilisateur
  const block = await prisma.programExercise.findFirst({
    where: { id: programExerciseId, programDay: { workouts: { some: { id: workoutId, userId: user.id } } } },
    select: { exerciseId: true, exercise: { select: { variants: { select: { id: true } } } } },
  });
  if (!block) return { error: "Exercice introuvable dans cette séance." };
  if (variantId !== null && !block.exercise.variants.some((variant) => variant.id === variantId)) {
    return { error: "Variante invalide." };
  }

  await prisma.setLog.upsert({
    where: { workoutId_programExerciseId_setNumber: { workoutId, programExerciseId, setNumber } },
    update: { reps, weightKg, variantId },
    create: { workoutId, programExerciseId, exerciseId: block.exerciseId, setNumber, reps, weightKg, variantId },
  });
  return {};
}

export async function finishWorkout(workoutId: string) {
  const { user } = await requireSession();
  await prisma.workout.updateMany({
    where: { id: workoutId, userId: user.id, finishedAt: null },
    data: { finishedAt: new Date() },
  });
  redirect("/");
}

// Supprime la séance en cours et ses séries (démarrée par erreur)
export async function cancelWorkout(workoutId: string) {
  const { user } = await requireSession();
  await prisma.workout.deleteMany({ where: { id: workoutId, userId: user.id, finishedAt: null } });
  redirect("/");
}
