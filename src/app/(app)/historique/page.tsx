import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { dayOfWeek, formatDay, formatDayMonth, formatTime } from "@/lib/dates";
import { formatDuration } from "@/lib/program-format";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getWeeklyHistory, type HistoryWorkout, type WeekSummary } from "@/lib/workout";

export const metadata: Metadata = {
  title: "Historique · Tracker program",
};

const sectionTitle = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </Suspense>
  );
}

async function HistoryContent() {
  const { user } = await requireSession();
  const now = new Date();
  const weeks = await getWeeklyHistory(user.id, now);

  if (!weeks) {
    return (
      <>
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="mt-2 text-muted-foreground">Aucun programme actif pour le moment.</p>
      </>
    );
  }

  const [current, ...past] = weeks;

  return (
    <>
      <h1 className="text-2xl font-bold">Historique</h1>

      <div className="mt-6 flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Cette semaine</h2>
          {/* Jours restants aujourd'hui compris, jusqu'à dimanche */}
          <WeekCard week={current} daysLeft={7 - dayOfWeek(now)} />
        </section>

        {past.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className={sectionTitle}>Semaines précédentes</h2>
            {past.map((week) => (
              <WeekCard key={week.start.toISOString()} week={week} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function WeekCard({ week, daysLeft }: { week: WeekSummary; daysLeft?: number }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">Semaine du {formatDayMonth(week.start)}</h3>
        <span className="shrink-0 text-lg font-bold tabular-nums">
          {week.done} / {week.planned}
        </span>
      </div>

      <ProgressSegments done={week.done} planned={week.planned} />

      <p className="text-sm text-muted-foreground">
        {weekStatus(week, daysLeft)}
        {week.bonus > 0 && ` · ${plural(week.bonus, "séance")} bonus`}
      </p>

      {week.workouts.length > 0 && (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-lg bg-background/60">
          {week.workouts.map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} />
          ))}
        </ul>
      )}
    </article>
  );
}

function weekStatus(week: WeekSummary, daysLeft: number | undefined) {
  if (week.done >= week.planned) return "Objectif atteint";
  if (week.missed !== null) return `${plural(week.missed, "séance")} manquée${week.missed > 1 ? "s" : ""}`;
  const remaining = week.planned - week.done;
  return `Encore ${plural(remaining, "séance")}, ${plural(daysLeft ?? 0, "jour")} restant${(daysLeft ?? 0) > 1 ? "s" : ""}`;
}

// Une case par séance prévue, remplie par séance faite
function ProgressSegments({ done, planned }: { done: number; planned: number }) {
  return (
    <div aria-hidden className="flex gap-1.5">
      {Array.from({ length: planned }, (_, index) => (
        <span
          key={index}
          className={cn("h-2 flex-1 rounded-full", index < done ? "bg-foreground" : "bg-foreground/15")}
        />
      ))}
    </div>
  );
}

function WorkoutRow({ workout }: { workout: HistoryWorkout }) {
  const seconds = (workout.finishedAt.getTime() - workout.startedAt.getTime()) / 1000;

  return (
    <li>
      <Link href={`/seance/${workout.id}`} className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <span className="block font-medium wrap-break-word">
            {workout.dayName ?? "Séance supprimée du programme"}
            {workout.isBonus && <span className="ml-2 text-xs text-muted-foreground">Bonus</span>}
          </span>
          <span className="block text-xs text-muted-foreground first-letter:uppercase">
            {formatDay(workout.startedAt)} à {formatTime(workout.startedAt)} · {formatDuration(seconds)} ·{" "}
            {plural(workout.setCount, "série")}
          </span>
        </div>
        <span aria-hidden className="text-muted-foreground">
          ›
        </span>
      </Link>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-foreground/10" />
      ))}
    </div>
  );
}
