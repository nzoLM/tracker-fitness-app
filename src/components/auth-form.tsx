"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_EMAIL: "Adresse email invalide.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet email.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 8 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
};

function toMessage(error: { code?: string }) {
  return (error.code && ERROR_MESSAGES[error.code]) || "Une erreur est survenue, réessaie.";
}

const inputClass =
  "h-12 w-full border-b-2 border-foreground px-4 text-base outline-none focus:border-foreground";

export function AuthForm({ mode, googleEnabled }: { mode: Mode; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } = isSignUp
      ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
      : await authClient.signIn.email({ email, password });

    if (error) {
      setError(toMessage(error));
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (error) {
      setError(toMessage(error));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Prénom
            <input name="name" required autoComplete="given-name" className={inputClass} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Mot de passe
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer h-12 rounded-xl bg-foreground text-base font-semibold text-background disabled:opacity-60"
        >
          {isSignUp ? "Créer mon compte" : "Se connecter"}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-foreground/20" />
            ou
            <span className="h-px flex-1 bg-foreground/20" />
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending}
            className="cursor-pointer h-12 rounded-xl border border-foreground/20 bg-card text-base font-medium disabled:opacity-60"
          >
            Continuer avec Google
          </button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <Link
          href={isSignUp ? "/connexion" : "/inscription"}
          className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isSignUp ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </div>
  );
}
