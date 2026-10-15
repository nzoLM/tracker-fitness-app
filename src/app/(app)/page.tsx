import Link from "next/link";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { formatDay, formatTime } from "@/lib/dates";
import { durationLabel, estimateDurationSeconds } from "@/lib/program-format";
import { requireSession } from "@/lib/session";
import { getTodayPlan, type TodayPlan } from "@/lib/workout";
import { startWorkout } from "@/lib/workout-actions";

const primaryButton =
  "flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-base font-semibold text-background";
const secondaryButton =
  "flex h-10 shrink-0 items-center justify-center rounded-lg border border-foreground/20 px-4 text-sm font-medium";
const sectionTitle = "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { user } = await requireSession();
  const plan = await getTodayPlan(user.id);

  return (
    <>
      <h1 className="text-2xl font-bold">Salut {user.name} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">{formatDay(new Date())}</p>

      <div className="mt-6 flex flex-col gap-8">
        {!plan ? (
          <p className="text-muted-foreground">
            Aucun programme actif.{" "}
            <Link href="/programme" className="text-foreground underline underline-offset-4">
              Voir mon programme
            </Link>
          </p>
        ) : plan.inProgress ? (
          <InProgress workout={plan.inProgress} />
        ) : (
          <>
            <TodaySuggestion plan={plan} />
            <OtherDays days={plan.otherDays} durations={plan.durations} />
          </>
        )}
      </div>
    </>
  );
}

function InProgress({ workout }: { workout: NonNullable<TodayPlan["inProgress"]> }) {
  const startedToday = formatDay(workout.startedAt) === formatDay(new Date());

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>Séance en cours</h2>
      <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-card p-4">
        <div>
          <h3 className="text-lg font-bold">{workout.programDay?.name ?? "Séance"}</h3>
          <span className="text-xs text-muted-foreground">
            Commencée {startedToday ? "" : `le ${formatDay(workout.startedAt)} `}à {formatTime(workout.startedAt)}
          </span>
        </div>
        <Link href={`/seance/${workout.id}`} className={primaryButton}>
          Reprendre
        </Link>
      </div>
    </section>
  );
}

function TodaySuggestion({ plan }: { plan: TodayPlan }) {
  const last = plan.lastRotationWorkout;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className={sectionTitle}>Séance du jour</h2>
        <span className="text-xs text-muted-foreground">
          {last?.programDay
            ? `Dernière séance : ${last.programDay.name}, ${formatDay(last.startedAt)}`
            : "Première séance du programme"}
          {plan.suggestedDays.length > 1 && " · au choix"}
        </span>
      </div>

      {plan.suggestedDays.map((day) => (
        <form
          key={day.id}
          action={startWorkout}
          className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-card p-4"
        >
          <input type="hidden" name="programDayId" value={day.id} />
          <div>
            <h3 className="text-lg font-bold">{day.name}</h3>
            <span className="block text-xs text-muted-foreground">{day.exercises.length} exercices</span>
            <span className="block text-xs text-muted-foreground">{dayDuration(day, plan.durations)}</span>
          </div>
          <SubmitButton pendingLabel="Démarrage..." className={primaryButton}>
            Commencer
          </SubmitButton>
        </form>
      ))}
    </section>
  );
}

function OtherDays({ days, durations }: { days: TodayPlan["otherDays"]; durations: TodayPlan["durations"] }) {
  if (days.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>Autre séance</h2>
      <ul className="flex flex-col divide-y divide-foreground/10 rounded-xl border border-foreground/10 bg-card">
        {days.map((day) => (
          <li key={day.id}>
            <form action={startWorkout} className="flex items-center justify-between gap-3 p-4">
              <input type="hidden" name="programDayId" value={day.id} />
              <div className="min-w-0">
                <h3 className="font-semibold wrap-break-word">{day.name}</h3>
                <span className="block text-xs text-muted-foreground">
                  {day.rotationSlot === null ? "Bonus" : `Rotation ${day.rotationSlot}`} ·{" "}
                  {day.exercises.length} exercices
                </span>
                <span className="block text-xs text-muted-foreground">{dayDuration(day, durations)}</span>
              </div>
              <SubmitButton pendingLabel="..." className={secondaryButton}>
                Commencer
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function dayDuration(day: TodayPlan["otherDays"][number], durations: TodayPlan["durations"]) {
  return durationLabel(estimateDurationSeconds(day.exercises), durations.get(day.id));
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-foreground/10" />
    </div>
  );
}
