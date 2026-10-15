// Fonctions pures, utilisables côté serveur comme côté client

// Regroupe les blocs consécutifs d'un même superset ; un bloc seul forme un groupe d'un élément
export function groupBySuperset<T extends { supersetGroup: number | null }>(blocks: T[]) {
  const groups: T[][] = [];
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

const weightFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

// 12.5 → « 12,5 »
export function formatWeight(kg: number) {
  return weightFormatter.format(kg);
}

// Repos proposé quand le programme n'en précise pas
export const DEFAULT_REST_SECONDS = 90;
// Temps d'effort moyen d'une série, doublé pour un exercice unilatéral (un côté puis l'autre)
const SET_WORK_SECONDS = 40;

type EstimableBlock = {
  targetSets: number;
  restSeconds: number | null;
  supersetGroup: number | null;
  exercise: { isUnilateral: boolean };
};

// Durée prévue d'une séance d'après le programme, hors échauffement.
// Un superset se fait par tours : une série de chaque exercice, puis le repos du dernier.
export function estimateDurationSeconds(blocks: EstimableBlock[]) {
  const groups = groupBySuperset(blocks);
  let total = 0;
  for (const group of groups) {
    const work = group.reduce(
      (sum, block) => sum + block.targetSets * SET_WORK_SECONDS * (block.exercise.isUnilateral ? 2 : 1),
      0,
    );
    const rounds = Math.max(...group.map((block) => block.targetSets));
    const rest = group.at(-1)!.restSeconds ?? DEFAULT_REST_SECONDS;
    total += work + rounds * rest;
  }
  // Pas de repos après la toute dernière série
  const lastRest = groups.at(-1)?.at(-1)?.restSeconds ?? DEFAULT_REST_SECONDS;
  return groups.length > 0 ? total - lastRest : 0;
}

// Arrondi aux 5 minutes : « 40 min », « 1 h 05 »
export function formatDuration(seconds: number) {
  const minutes = Math.max(5, Math.round(seconds / 60 / 5) * 5);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export type AverageDuration = { seconds: number; count: number };

// La moyenne réelle prime sur l'estimation dès qu'une séance a été faite
export function durationLabel(estimateSeconds: number, average: AverageDuration | undefined) {
  if (average) {
    const sessions = average.count > 1 ? `${average.count} séances` : "1 séance";
    return `≈ ${formatDuration(average.seconds)} en moyenne (${sessions})`;
  }
  return `≈ ${formatDuration(estimateSeconds)} estimées`;
}
