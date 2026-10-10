import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <p className="mb-8 text-sm font-semibold uppercase tracking-widest text-foreground">
        Tracker program
      </p>
      {children}
    </main>
  );
}
