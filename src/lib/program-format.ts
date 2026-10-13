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
