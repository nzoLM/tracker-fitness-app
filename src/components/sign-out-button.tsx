"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="cursor-pointer h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      Déconnexion
    </button>
  );
}
