import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WorkoutLogger } from "@/components/workout-logger";
import { formatDay, formatTime } from "@/lib/dates";
import { durationLabel, estimateDurationSeconds } from "@/lib/program-format";
import { requireSession } from "@/lib/session";
import { getAverageDurations, getWorkout } from "@/lib/workout";

export const metadata: Metadata = {
  title: "Séance · Tracker program",
};

export default function WorkoutPage({ params }: PageProps<"/seance/[id]">) {
  return (
    <Suspense fallback={<WorkoutSkeleton />}>
      <WorkoutContent params={params} />
    </Suspense>
  );
}

async function WorkoutContent({ params }: { params: PageProps<"/seance/[id]">["params"] }) {
  const { id } = await params;
  const { user } = await requireSession();
  const data = await getWorkout(user.id, id);
  if (!data) notFound();
  const { workout, sets, previousSets } = data;
  const averages = workout.programDay
    ? await getAverageDurations(user.id, [workout.programDay.id])
    : null;

  return (
    <>
      <h1 className="text-2xl font-bold wrap-break-word">{workout.programDay?.name ?? "Séance"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDay(workout.startedAt)}, commencée à {formatTime(workout.startedAt)}
        {workout.finishedAt && `, terminée à ${formatTime(workout.finishedAt)}`}
      </p>
      {workout.programDay && averages && (
        <p className="mt-1 text-sm text-muted-foreground">
          Durée {durationLabel(estimateDurationSeconds(workout.programDay.exercises), averages.get(workout.programDay.id))}
        </p>
      )}

      <div className="mt-6">
        {workout.programDay ? (
          <WorkoutLogger
            workoutId={workout.id}
            isFinished={workout.finishedAt !== null}
            blocks={workout.programDay.exercises}
            sets={sets}
            previousSets={previousSets}
          />
        ) : (
          <p className="text-muted-foreground">Ce jour a été retiré du programme.</p>
        )}
      </div>
    </>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-foreground/10" />
      ))}
    </div>
  );
}
