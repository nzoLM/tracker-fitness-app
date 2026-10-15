import Link from "next/link";
import { Pencil, Timer } from "lucide-react";
import type { TrackingType } from "@/generated/prisma/enums";
import type { ProgramBlock, ProgramDayWithExercises } from "@/lib/program";
import { formatReps, formatRest, groupBySuperset } from "@/lib/program-format";
import { cn } from "@/lib/utils";

const TRACKING_LABELS: Record<TrackingType, string> = {
  WEIGHTED: "Charge",
  BODYWEIGHT: "Poids du corps",
  BOTH: "Poids du corps, lest possible",
};

export function ProgramDay({
  day,
  alternatives,
  duration,
  defaultOpen,
}: {
  day: ProgramDayWithExercises;
  // Autres jours de la même place de rotation, interchangeables avec celui-ci
  alternatives: string[];
  duration: string;
  defaultOpen: boolean;
}) {
  const rotationLabel =
    day.rotationSlot === null
      ? "Bonus, hors rotation"
      : alternatives.length > 0
        ? `Rotation ${day.rotationSlot}, au choix avec ${alternatives.join(", ")}`
        : `Rotation ${day.rotationSlot}`;

  return (
    <details open={defaultOpen} className="group rounded-xl border border-foreground/10 bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold wrap-break-word">{day.name}</h2>
          <span className="block text-xs text-muted-foreground">
            {rotationLabel} · {day.exercises.length} exercices
          </span>
          <span className="block text-xs text-muted-foreground">{duration}</span>
        </div>
        <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <ExerciseGroups blocks={day.exercises} className="px-4" />
      <div className="flex justify-end p-4">
        <Link
          href={`/programme/${day.id}`}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-foreground/20 px-4 text-sm font-medium"
        >
          <Pencil className="size-4" aria-hidden />
          Modifier
        </Link>
      </div>
    </details>
  );
}

// Exercices d'un jour, avec les supersets regroupés
export function ExerciseGroups({ blocks, className }: { blocks: ProgramBlock[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {groupBySuperset(blocks).map((group) =>
        group.length === 1 ? (
          <li key={group[0].id} className="rounded-lg bg-background/60 p-3">
            <ExerciseBlock block={group[0]} />
            <RestLine seconds={group[0].restSeconds} />
          </li>
        ) : (
          <li key={group[0].id} className="rounded-lg border-l-2 border-foreground bg-background/60 p-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Superset
            </span>
            <ol className="mt-2 flex flex-col gap-3 divide-y divide-foreground/10">
              {group.map((block) => (
                <li key={block.id} className="pb-3 last:pb-0">
                  <ExerciseBlock block={block} />
                </li>
              ))}
            </ol>
            {/* Le repos du superset est celui de son dernier exercice */}
            <RestLine seconds={group.at(-1)!.restSeconds} suffix="après le superset" />
          </li>
        ),
      )}
    </ol>
  );
}

// Sans hooks ni accès serveur : réutilisé dans la saisie de séance (composant client)
export function ExerciseBlock({ block }: { block: ProgramBlock }) {
  const { exercise } = block;
  const muscles = exercise.muscles.map((m) => m.muscleGroup.name).join(", ");

  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-semibold wrap-break-word">{exercise.name}</h3>
      <span className="text-sm text-foreground">
        {block.targetSets} × {formatReps(block.repMin, block.repMax)}
        {exercise.isUnilateral && " par côté"}
      </span>
      <span className="text-xs text-muted-foreground">
        {TRACKING_LABELS[exercise.trackingType]}
        {muscles && ` · ${muscles}`}
      </span>
      {block.notes && <p className="mt-1 text-sm">{block.notes}</p>}
      {exercise.notes && (
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Technique</summary>
          <p className="mt-1 text-muted-foreground">{exercise.notes}</p>
        </details>
      )}
    </div>
  );
}

function RestLine({ seconds, suffix }: { seconds: number | null; suffix?: string }) {
  if (seconds === null) return null;
  return (
    <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Timer className="size-3.5" aria-hidden />
      Repos {formatRest(seconds)}
      {suffix && ` ${suffix}`}
    </span>
  );
}
