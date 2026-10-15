"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import type { TrackingType } from "@/generated/prisma/enums";
import { ExerciseBlock } from "@/components/program-day";
import { RestLauncher, RestTimerBar, useRestTimer } from "@/components/rest-timer";
import { DEFAULT_REST_SECONDS, formatWeight, groupBySuperset } from "@/lib/program-format";
import { cn } from "@/lib/utils";
import type { LoggedSet, WorkoutBlock } from "@/lib/workout";
import { cancelWorkout, finishWorkout, saveSet } from "@/lib/workout-actions";

const MAX_SETS = 30;

export function WorkoutLogger({
  workoutId,
  isFinished,
  blocks,
  sets,
  previousSets,
}: {
  workoutId: string;
  isFinished: boolean;
  blocks: WorkoutBlock[];
  sets: LoggedSet[];
  previousSets: LoggedSet[];
}) {
  const timer = useRestTimer();

  return (
    <>
      <ol className="flex flex-col gap-4">
        {groupBySuperset(blocks).map((group) => {
          const last = group.at(-1)!;
          return (
            <li
              key={group[0].id}
              className={cn(
                "rounded-xl border border-foreground/10 bg-card p-4",
                group.length > 1 && "border-l-2 border-l-foreground",
              )}
            >
              {group.length > 1 && (
                <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-foreground">
                  Superset
                </span>
              )}
              <div className="flex flex-col divide-y divide-foreground/10">
                {group.map((block) => (
                  <BlockLogger
                    key={block.id}
                    workoutId={workoutId}
                    block={block}
                    logged={sets.filter((set) => set.programExerciseId === block.id)}
                    previous={previousSets.filter((set) => set.programExerciseId === block.id)}
                  />
                ))}
              </div>
              {/* Le repos d'un superset est celui de son dernier exercice */}
              <RestLauncher
                defaultSeconds={last.restSeconds ?? DEFAULT_REST_SECONDS}
                label={group.map((block) => block.exercise.name).join(" + ")}
                timer={timer}
              />
            </li>
          );
        })}
      </ol>

      {!isFinished && <WorkoutActions workoutId={workoutId} />}

      {/* Laisse la place à la barre du chrono pour ne pas masquer le bas de page */}
      {timer.timer && <div className="h-20" />}
      <RestTimerBar timer={timer} />
    </>
  );
}

type SavedValues = { reps: number; weightKg: number | null; variantId: string | null };

type Row = {
  weight: string;
  reps: string;
  // La charge a été modifiée à la main : on ne la remplace plus automatiquement
  weightEdited: boolean;
  saved: SavedValues | null;
  status: "idle" | "saving";
  error: string | null;
};

// Virgule décimale, comme sur un clavier français
function weightToInput(kg: number | null | undefined) {
  return kg === null || kg === undefined ? "" : String(kg).replace(".", ",");
}

function parseWeight(value: string) {
  const trimmed = value.trim().replace(",", ".");
  return trimmed === "" ? null : Number(trimmed);
}

function initialRows(block: WorkoutBlock, logged: LoggedSet[], previous: LoggedSet[]): Row[] {
  const count = Math.max(block.targetSets, ...logged.map((set) => set.setNumber));
  return Array.from({ length: count }, (_, index) => {
    const setNumber = index + 1;
    const done = logged.find((set) => set.setNumber === setNumber);
    if (done) {
      return {
        weight: weightToInput(done.weightKg),
        reps: String(done.reps),
        weightEdited: true,
        saved: { reps: done.reps, weightKg: done.weightKg, variantId: done.variantId },
        status: "idle",
        error: null,
      };
    }
    // Charge de la même série la dernière fois, à défaut de la dernière série faite
    const reference =
      previous.find((set) => set.setNumber === setNumber) ?? logged.at(-1) ?? previous.at(-1);
    return {
      weight: weightToInput(reference?.weightKg),
      reps: "",
      weightEdited: false,
      saved: null,
      status: "idle",
      error: null,
    };
  });
}

const WEIGHT_LABELS: Record<TrackingType, string | null> = {
  WEIGHTED: "kg",
  BOTH: "lest kg",
  BODYWEIGHT: null,
};

function BlockLogger({
  workoutId,
  block,
  logged,
  previous,
}: {
  workoutId: string;
  block: WorkoutBlock;
  logged: LoggedSet[];
  previous: LoggedSet[];
}) {
  const { exercise } = block;
  const weightLabel = WEIGHT_LABELS[exercise.trackingType];
  const repsLabel = exercise.isUnilateral ? "reps / côté" : "reps";
  const [rows, setRows] = useState(() => initialRows(block, logged, previous));
  const [variantId, setVariantId] = useState<string | null>(
    () => logged.at(-1)?.variantId ?? previous.at(-1)?.variantId ?? exercise.variants[0]?.id ?? null,
  );

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save(index: number) {
    const row = rows[index];
    const reps = Number(row.reps);
    const weightKg = weightLabel ? parseWeight(row.weight) : null;

    if (!Number.isInteger(reps) || reps < 1) return updateRow(index, { error: "Indique les reps." });
    if (weightKg !== null && Number.isNaN(weightKg)) return updateRow(index, { error: "Charge invalide." });
    if (exercise.trackingType === "WEIGHTED" && weightKg === null) {
      return updateRow(index, { error: "Indique la charge." });
    }

    updateRow(index, { status: "saving", error: null });
    const result = await saveSet({
      workoutId,
      programExerciseId: block.id,
      setNumber: index + 1,
      reps,
      weightKg,
      variantId,
    });

    if (result.error) return updateRow(index, { status: "idle", error: result.error });

    setRows((current) =>
      current.map((other, i) => {
        if (i === index) return { ...other, status: "idle", saved: { reps, weightKg, variantId } };
        // Reporte la charge sur les séries suivantes pas encore faites ni modifiées
        if (i > index && !other.saved && !other.weightEdited) return { ...other, weight: weightToInput(weightKg) };
        return other;
      }),
    );
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <ExerciseBlock block={block} />

      {previous.length > 0 && (
        <span className="mt-2 block text-xs text-muted-foreground">
          Dernière fois : {formatPrevious(previous, exercise.variants)}
        </span>
      )}

      {exercise.variants.length > 0 && (
        <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          Variante
          <select
            value={variantId ?? ""}
            onChange={(event) => setVariantId(event.target.value || null)}
            className="h-11 rounded-lg border border-foreground/20 bg-background px-3 text-base text-foreground"
          >
            {exercise.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Unités en en-tête : dans les champs, elles mangeraient la place de la saisie */}
      <div aria-hidden className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-5 shrink-0 text-center">#</span>
        {weightLabel && <span className="flex-1 text-center">{weightLabel}</span>}
        <span className="flex-1 text-center">{repsLabel}</span>
        <span className="w-11 shrink-0" />
      </div>

      <ol className="mt-1 flex flex-col gap-2">
        {rows.map((row, index) => {
          // La variante n'entre pas en compte : chaque série garde celle avec laquelle elle a été faite
          const isDone =
            row.saved !== null &&
            row.saved.reps === Number(row.reps) &&
            row.saved.weightKg === (weightLabel ? parseWeight(row.weight) : null);

          return (
            <li key={index}>
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">{index + 1}</span>
                {weightLabel && (
                  <NumberField
                    label={`Série ${index + 1}, ${weightLabel}`}
                    value={row.weight}
                    inputMode="decimal"
                    placeholder={exercise.trackingType === "BOTH" ? "0" : ""}
                    onChange={(weight) => updateRow(index, { weight, weightEdited: true, error: null })}
                  />
                )}
                <NumberField
                  label={`Série ${index + 1}, ${repsLabel}`}
                  value={row.reps}
                  inputMode="numeric"
                  placeholder={formatRepTarget(block.repMin, block.repMax)}
                  onChange={(reps) => updateRow(index, { reps, error: null })}
                />
                <button
                  type="button"
                  onClick={() => save(index)}
                  disabled={row.status === "saving"}
                  aria-label={isDone ? `Série ${index + 1} enregistrée` : `Valider la série ${index + 1}`}
                  aria-pressed={isDone}
                  className={cn(
                    "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border disabled:opacity-60",
                    isDone
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/30 text-foreground",
                  )}
                >
                  <Check className={cn("size-5", row.status === "saving" && "animate-pulse")} aria-hidden />
                </button>
              </div>
              {row.error && (
                <span role="alert" className="mt-1 block pl-7 text-xs text-destructive">
                  {row.error}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {rows.length < MAX_SETS && (
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                weight: current.at(-1)?.weight ?? "",
                reps: "",
                weightEdited: false,
                saved: null,
                status: "idle",
                error: null,
              },
            ])
          }
          className="mt-2 flex h-10 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
          Série
        </button>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  inputMode: "decimal" | "numeric";
  onChange: (value: string) => void;
}) {
  return (
    // text-base : en dessous de 16px, iOS zoome sur le champ
    <input
      type="text"
      inputMode={inputMode}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full min-w-0 flex-1 rounded-lg border border-foreground/20 bg-background px-2 text-center text-base tabular-nums outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
    />
  );
}

function formatRepTarget(repMin: number | null, repMax: number | null) {
  if (repMin === null && repMax === null) return "max";
  if (repMin === null || repMax === null || repMin === repMax) return String(repMin ?? repMax);
  return `${repMin}-${repMax}`;
}

// « 10 kg × 8, 10 kg × 7 », « 8, 7, 6 reps » ou « Complet : 8, 7, 6 reps »
function formatPrevious(sets: LoggedSet[], variants: { id: string; name: string }[]) {
  const variant = variants.find((v) => v.id === sets.at(-1)?.variantId);
  const hasWeight = sets.some((set) => set.weightKg);
  const list = sets
    .map((set) => (set.weightKg ? `${formatWeight(set.weightKg)} kg × ${set.reps}` : String(set.reps)))
    .join(", ");
  const text = hasWeight ? list : `${list} reps`;
  return variant ? `${variant.name} : ${text}` : text;
}

function WorkoutActions({ workoutId }: { workoutId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Terminer la séance ? Les séries non validées ne seront pas enregistrées.")) {
            startTransition(() => finishWorkout(workoutId));
          }
        }}
        className="h-12 w-full cursor-pointer rounded-xl bg-foreground text-base font-semibold text-background disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Terminer la séance"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Annuler la séance ? Elle sera supprimée avec toutes ses séries.")) {
            startTransition(() => cancelWorkout(workoutId));
          }
        }}
        className="h-10 cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-60"
      >
        Annuler la séance
      </button>
    </div>
  );
}
