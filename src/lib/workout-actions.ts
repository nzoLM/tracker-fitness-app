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
