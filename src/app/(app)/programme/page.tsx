import type { Metadata } from "next";
import { Suspense } from "react";
import { ProgramDay } from "@/components/program-day";
import { SubmitButton } from "@/components/submit-button";
import { getActiveProgram } from "@/lib/program";
import { createProgramDay } from "@/lib/program-actions";
import { durationLabel, estimateDurationSeconds } from "@/lib/program-format";
import { requireSession } from "@/lib/session";
import { getAverageDurations } from "@/lib/workout";

export const metadata: Metadata = {
  title: "Programme · Tracker program",
};

export default function ProgramPage() {
  return (
    <Suspense fallback={<ProgramSkeleton />}>
      <ProgramContent />
    </Suspense>
  );
}

async function ProgramContent() {
  const { user } = await requireSession();
  const program = await getActiveProgram(user.id);

  if (!program) {
    return (
      <>
        <h1 className="text-2xl font-bold">Programme</h1>
        <p className="mt-2 text-muted-foreground">Aucun programme actif pour le moment.</p>
      </>
    );
  }

  const durations = await getAverageDurations(
    user.id,
    program.days.map((day) => day.id),
  );

  return (
    <>
      <h1 className="text-2xl font-bold wrap-break-word">{program.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {program.sessionsPerWeek} séances prévues par semaine
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {program.days.map((day, index) => (
          <ProgramDay
            key={day.id}
            day={day}
            alternatives={program.days
              .filter((other) => other.id !== day.id && other.rotationSlot !== null && other.rotationSlot === day.rotationSlot)
              .map((other) => other.name)}
            duration={durationLabel(estimateDurationSeconds(day.exercises), durations.get(day.id))}
            defaultOpen={index === 0}
          />
        ))}
      </div>

      <form action={createProgramDay} className="mt-4">
        <SubmitButton
          pendingLabel="Création..."
          className="h-12 w-full rounded-xl border border-dashed border-foreground/30 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Ajouter un jour
        </SubmitButton>
      </form>
    </>
  );
}

function ProgramSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-foreground/10" />
      ))}
    </div>
  );
}
