"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from "lucide-react";
import type { TrackingType } from "@/generated/prisma/enums";
import type { DayForEdit } from "@/lib/program";
import {
  createExercise,
  deleteProgramDay,
  saveProgramDay,
  type CatalogExercise,
} from "@/lib/program-actions";
import { DEFAULT_REST_SECONDS, formatRest } from "@/lib/program-format";
import { cn } from "@/lib/utils";

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
const SET_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: "WEIGHTED", label: "Charge (barre, haltères, machine)" },
  { value: "BODYWEIGHT", label: "Poids du corps" },
  { value: "BOTH", label: "Poids du corps, lest possible" },
];

const field =
  "h-11 w-full min-w-0 rounded-lg border border-foreground/20 bg-background px-3 text-base text-foreground outline-none focus:border-foreground";
const fieldLabel = "flex min-w-0 flex-col gap-1 text-xs text-muted-foreground";
const iconButton =
  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-foreground/20 disabled:cursor-default disabled:opacity-30";

type EditorBlock = {
  // Clé React stable, y compris pour les blocs pas encore enregistrés
  key: string;
  id: string | null;
  exerciseId: string;
  targetSets: number;
  repMin: string;
  repMax: string;
  maxReps: boolean;
  restSeconds: number | null;
  linkedToNext: boolean;
  notes: string;
};

function toEditorBlocks(blocks: DayForEdit["day"]["exercises"]): EditorBlock[] {
  return blocks.map((block, index) => {
    const next = blocks[index + 1];
    return {
      key: block.id,
      id: block.id,
      exerciseId: block.exerciseId,
      targetSets: block.targetSets,
      repMin: block.repMin === null ? "" : String(block.repMin),
      repMax: block.repMax === null ? "" : String(block.repMax),
      maxReps: block.repMin === null && block.repMax === null,
      restSeconds: block.restSeconds,
      linkedToNext: block.supersetGroup !== null && next?.supersetGroup === block.supersetGroup,
      notes: block.notes ?? "",
    };
  });
}

function parseReps(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function DayEditor({ day, exercises, muscleGroups }: DayForEdit) {
  const [name, setName] = useState(day.name);
  const [rotationSlot, setRotationSlot] = useState<number | null>(day.rotationSlot);
  const [blocks, setBlocks] = useState(() => toEditorBlocks(day.exercises));
  const [catalog, setCatalog] = useState<CatalogExercise[]>(exercises);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const otherDays = day.program.days.filter((other) => other.id !== day.id);
  const usedSlots = [...new Set(otherDays.flatMap((other) => other.rotationSlot ?? []))].sort((a, b) => a - b);
  const nextFreeSlot = Math.max(0, ...usedSlots, day.rotationSlot ?? 0) + 1;
  const slotOptions = [...new Set([...usedSlots, day.rotationSlot ?? nextFreeSlot, nextFreeSlot])].sort(
    (a, b) => a - b,
  );

  function updateBlock(index: number, patch: Partial<EditorBlock>) {
    setBlocks((current) => current.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  function removeBlock(index: number) {
    setBlocks((current) => current.filter((_, i) => i !== index));
  }

  function addBlock(exerciseId: string) {
    setBlocks((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        id: null,
        exerciseId,
        targetSets: 3,
        repMin: "8",
        repMax: "12",
        maxReps: false,
        restSeconds: DEFAULT_REST_SECONDS,
        linkedToNext: false,
        notes: "",
      },
    ]);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveProgramDay({
        dayId: day.id,
        name,
        rotationSlot,
        blocks: blocks.map((block) => ({
          id: block.id,
          exerciseId: block.exerciseId,
          targetSets: block.targetSets,
          repMin: block.maxReps ? null : parseReps(block.repMin),
          repMax: block.maxReps ? null : parseReps(block.repMax),
          restSeconds: block.restSeconds,
          linkedToNext: block.linkedToNext,
          notes: block.notes,
        })),
      });
      // Sans erreur, l'action redirige vers le programme
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-card p-4">
        <label className={fieldLabel}>
          Nom du jour
          <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <label className={fieldLabel}>
          Place dans la rotation
          <select
            value={rotationSlot ?? ""}
            onChange={(event) => setRotationSlot(event.target.value === "" ? null : Number(event.target.value))}
            className={field}
          >
            <option value="">Bonus, hors rotation</option>
            {slotOptions.map((slot) => {
              const sharedWith = otherDays.filter((other) => other.rotationSlot === slot).map((other) => other.name);
              return (
                <option key={slot} value={slot}>
                  Rotation {slot}
                  {sharedWith.length > 0 ? `, au choix avec ${sharedWith.join(", ")}` : ""}
                </option>
              );
            })}
          </select>
        </label>
      </section>

      <section className="flex flex-col">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Exercices
        </h2>
        {blocks.length === 0 && <p className="text-sm text-muted-foreground">Aucun exercice pour l&apos;instant.</p>}
        <ol className="flex flex-col">
          {blocks.map((block, index) => (
            <li key={block.key} className="flex flex-col">
              <BlockEditor
                block={block}
                index={index}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                catalog={catalog}
                onChange={(patch) => updateBlock(index, patch)}
                onMove={(direction) => moveBlock(index, direction)}
                onRemove={() => removeBlock(index)}
              />
              {index < blocks.length - 1 && (
                <div className="flex justify-center py-2">
                  <button
                    type="button"
                    aria-pressed={block.linkedToNext}
                    onClick={() => updateBlock(index, { linkedToNext: !block.linkedToNext })}
                    className={cn(
                      "flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs",
                      block.linkedToNext
                        ? "border-foreground bg-foreground text-background"
                        : "border-dashed border-foreground/30 text-muted-foreground",
                    )}
                  >
                    <Link2 className="size-3.5" aria-hidden />
                    {block.linkedToNext ? "En superset avec le suivant" : "Enchaîner en superset"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <AddExercise
        catalog={catalog}
        muscleGroups={muscleGroups}
        onAdd={addBlock}
        onCreated={(exercise) => {
          setCatalog((current) => [...current, exercise].sort((a, b) => a.name.localeCompare(b.name, "fr")));
          addBlock(exercise.id);
        }}
      />

      <section className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-12 w-full cursor-pointer rounded-xl bg-foreground text-base font-semibold text-background disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <Link
          href="/programme"
          className="flex h-10 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
        >
          Annuler les modifications
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Supprimer « ${day.name} » ? Les séances déjà faites sont conservées.`)) {
              startTransition(() => deleteProgramDay(day.id));
            }
          }}
          className="mt-4 h-10 cursor-pointer text-sm text-destructive disabled:opacity-60"
        >
          Supprimer ce jour
        </button>
      </section>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  catalog,
  onChange,
  onMove,
  onRemove,
}: {
  block: EditorBlock;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  catalog: CatalogExercise[];
  onChange: (patch: Partial<EditorBlock>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const restOptions = [...new Set([...REST_OPTIONS, ...(block.restSeconds ? [block.restSeconds] : [])])].sort(
    (a, b) => a - b,
  );
  const setOptions = [...new Set([...SET_OPTIONS, block.targetSets])].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
      <label className={fieldLabel}>
        Exercice {index + 1}
        <select
          value={block.exerciseId}
          onChange={(event) => onChange({ exerciseId: event.target.value })}
          className={field}
        >
          {catalog.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className={fieldLabel}>
          Séries
          <select
            value={block.targetSets}
            onChange={(event) => onChange({ targetSets: Number(event.target.value) })}
            className={field}
          >
            {setOptions.map((sets) => (
              <option key={sets} value={sets}>
                {sets}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Reps min
          <input
            inputMode="numeric"
            value={block.maxReps ? "" : block.repMin}
            disabled={block.maxReps}
            placeholder={block.maxReps ? "max" : ""}
            onChange={(event) => onChange({ repMin: event.target.value })}
            className={cn(field, "text-center disabled:opacity-40")}
          />
        </label>
        <label className={fieldLabel}>
          Reps max
          <input
            inputMode="numeric"
            value={block.maxReps ? "" : block.repMax}
            disabled={block.maxReps}
            placeholder={block.maxReps ? "max" : ""}
            onChange={(event) => onChange({ repMax: event.target.value })}
            className={cn(field, "text-center disabled:opacity-40")}
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.maxReps}
          onChange={(event) => onChange({ maxReps: event.target.checked })}
          className="size-5 accent-(--foreground-2)"
        />
        Max reps propres
      </label>

      <label className={fieldLabel}>
        Repos après la série
        <select
          value={block.restSeconds ?? ""}
          onChange={(event) => onChange({ restSeconds: event.target.value === "" ? null : Number(event.target.value) })}
          className={field}
        >
          <option value="">Par défaut ({formatRest(DEFAULT_REST_SECONDS)})</option>
          {restOptions.map((seconds) => (
            <option key={seconds} value={seconds}>
              {formatRest(seconds)}
            </option>
          ))}
        </select>
      </label>

      <label className={fieldLabel}>
        Consignes
        <textarea
          value={block.notes}
          maxLength={500}
          rows={2}
          placeholder="Tempo, seuil pour ajouter du lest..."
          onChange={(event) => onChange({ notes: event.target.value })}
          className={cn(field, "h-auto py-2")}
        />
      </label>

      <div className="flex items-center justify-end gap-2">
        <button type="button" aria-label="Monter" disabled={isFirst} onClick={() => onMove(-1)} className={iconButton}>
          <ArrowUp className="size-4" aria-hidden />
        </button>
        <button type="button" aria-label="Descendre" disabled={isLast} onClick={() => onMove(1)} className={iconButton}>
          <ArrowDown className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Retirer l'exercice"
          onClick={onRemove}
          className={cn(iconButton, "text-destructive")}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function AddExercise({
  catalog,
  muscleGroups,
  onAdd,
  onCreated,
}: {
  catalog: CatalogExercise[];
  muscleGroups: DayForEdit["muscleGroups"];
  onAdd: (exerciseId: string) => void;
  onCreated: (exercise: CatalogExercise) => void;
}) {
  const [selected, setSelected] = useState(catalog[0]?.id ?? "");
  const [creating, setCreating] = useState(catalog.length === 0);
  const [draft, setDraft] = useState({
    name: "",
    trackingType: "WEIGHTED" as TrackingType,
    isUnilateral: false,
    muscleGroupId: muscleGroups[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createExercise(draft);
      if ("error" in result) return setError(result.error);
      onCreated(result.exercise);
      setDraft((current) => ({ ...current, name: "" }));
      setCreating(false);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed border-foreground/30 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ajouter un exercice</h2>

      {!creating ? (
        <>
          <div className="flex gap-2">
            <select
              aria-label="Exercice à ajouter"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className={cn(field, "flex-1")}
            >
              {catalog.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Ajouter"
              disabled={!selected}
              onClick={() => onAdd(selected)}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-foreground text-background disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-10 cursor-pointer self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Nouvel exercice absent de la liste
          </button>
        </>
      ) : (
        <>
          <label className={fieldLabel}>
            Nom
            <input
              value={draft.name}
              maxLength={60}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            Suivi
            <select
              value={draft.trackingType}
              onChange={(event) => setDraft({ ...draft, trackingType: event.target.value as TrackingType })}
              className={field}
            >
              {TRACKING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Muscle principal
            <select
              value={draft.muscleGroupId}
              onChange={(event) => setDraft({ ...draft, muscleGroupId: event.target.value })}
              className={field}
            >
              {muscleGroups.map((muscle) => (
                <option key={muscle.id} value={muscle.id}>
                  {muscle.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isUnilateral}
              onChange={(event) => setDraft({ ...draft, isUnilateral: event.target.checked })}
              className="size-5 accent-(--foreground-2)"
            />
            Un bras ou une jambe à la fois
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={pending || !draft.name.trim()}
              className="h-11 flex-1 cursor-pointer rounded-lg bg-foreground text-sm font-semibold text-background disabled:opacity-40"
            >
              {pending ? "Création..." : "Créer et ajouter"}
            </button>
            {catalog.length > 0 && (
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-11 cursor-pointer rounded-lg border border-foreground/20 px-4 text-sm"
              >
                Annuler
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
