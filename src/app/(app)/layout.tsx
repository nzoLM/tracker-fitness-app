import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

// Layout statique : il ne lit pas la session, pour que l'en-tête s'affiche tout de suite.
// Chaque page vérifie la session au plus près des données avec requireSession(),
// derrière un <Suspense> (Cache Components).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
          <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
            Tracker Push/Pull
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
