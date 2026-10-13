"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Play, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_SECONDS = 15;
// Durée d'affichage de « Repos terminé » avant que la barre disparaisse
const DONE_DISPLAY_MS = 5000;

type Timer = { endAt: number; total: number; label: string };

// Le temps restant est calculé depuis l'heure de fin et non décrémenté,
// pour rester juste quand le navigateur ralentit l'onglet (écran verrouillé)
export function useRestTimer() {
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0;
  const isDone = timer !== null && remaining === 0;

  useEffect(() => {
    if (!isDone) return;
    if (audioRef.current) beep(audioRef.current);
    navigator.vibrate?.([300, 150, 300]);
    const id = setTimeout(() => setTimer(null), DONE_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [isDone]);

  function start(seconds: number, label: string) {
    // L'audio ne peut démarrer qu'après un geste de l'utilisateur : on le prépare ici
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume();
    const startAt = Date.now();
    setNow(startAt);
    setTimer({ endAt: startAt + seconds * 1000, total: seconds, label });
  }

  function adjust(deltaSeconds: number) {
    setTimer((current) =>
      current && {
        ...current,
        endAt: Math.max(Date.now(), current.endAt + deltaSeconds * 1000),
        total: Math.max(0, current.total + deltaSeconds),
      },
    );
  }

  return { timer, remaining, isDone, start, adjust, stop: () => setTimer(null) };
}

export type RestTimer = ReturnType<typeof useRestTimer>;

function beep(context: AudioContext) {
  for (let i = 0; i < 3; i++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain).connect(context.destination);
    const startAt = context.currentTime + i * 0.3;
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.15);
  }
}

export function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Réglage du repos d'un exercice (ou d'un superset) et lancement du chrono
export function RestLauncher({
  defaultSeconds,
  label,
  timer,
}: {
  defaultSeconds: number;
  label: string;
  timer: RestTimer;
}) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const stepButton =
    "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-foreground/20 disabled:opacity-40";

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        aria-label={`Raccourcir le repos de ${STEP_SECONDS} secondes`}
        disabled={seconds <= STEP_SECONDS}
        onClick={() => setSeconds((s) => s - STEP_SECONDS)}
        className={stepButton}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => timer.start(seconds, label)}
        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground/15 text-sm font-semibold"
      >
        <Play className="size-4" aria-hidden />
        Repos {formatClock(seconds)}
      </button>
      <button
        type="button"
        aria-label={`Allonger le repos de ${STEP_SECONDS} secondes`}
        onClick={() => setSeconds((s) => s + STEP_SECONDS)}
        className={stepButton}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

// Barre fixe au-dessus de la navigation pendant le repos
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  if (!timer.timer) return null;
  const { total, label } = timer.timer;
  const progress = total > 0 ? 1 - timer.remaining / total : 1;

  return (
    <div
      role="timer"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-foreground/10 bg-card"
    >
      <div className="h-1 bg-foreground/10">
        <div className="h-full bg-foreground transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
          <span className={cn("text-2xl font-bold tabular-nums", timer.isDone && "text-foreground")}>
            {timer.isDone ? "Repos terminé" : formatClock(timer.remaining)}
          </span>
        </div>
        {!timer.isDone && (
          <>
            <button
              type="button"
              aria-label={`Retirer ${STEP_SECONDS} secondes`}
              onClick={() => timer.adjust(-STEP_SECONDS)}
              className="h-11 cursor-pointer rounded-lg border border-foreground/20 px-3 text-sm"
            >
              -{STEP_SECONDS}
            </button>
            <button
              type="button"
              aria-label={`Ajouter ${STEP_SECONDS} secondes`}
              onClick={() => timer.adjust(STEP_SECONDS)}
              className="h-11 cursor-pointer rounded-lg border border-foreground/20 px-3 text-sm"
            >
              +{STEP_SECONDS}
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Arrêter le chrono"
          onClick={timer.stop}
          className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-foreground/20"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
