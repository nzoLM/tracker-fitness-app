import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseGroups } from "@/components/program-day";
import { formatDay, formatTime } from "@/lib/dates";
import { requireSession } from "@/lib/session";
import { getWorkout } from "@/lib/workout";

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
  const workout = await getWorkout(user.id, id);
  if (!workout) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold wrap-break-word">{workout.programDay?.name ?? "Séance"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDay(workout.startedAt)}, commencée à {formatTime(workout.startedAt)}
        {workout.finishedAt && `, terminée à ${formatTime(workout.finishedAt)}`}
      </p>

      {workout.programDay ? (
        <ExerciseGroups blocks={workout.programDay.exercises} className="mt-6" />
      ) : (
        <p className="mt-6 text-muted-foreground">Ce jour a été retiré du programme.</p>
      )}
    </>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-foreground/10" />
      ))}
    </div>
  );
}
