import { Suspense } from "react";
import { requireSession } from "@/lib/session";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />}>
      <Greeting />
    </Suspense>
  );
}

async function Greeting() {
  const { user } = await requireSession();

  return (
    <>
      <h1 className="text-2xl font-bold">Salut {user.name} 👋</h1>
      <p className="mt-2 text-muted-foreground">La séance du jour arrive bientôt ici.</p>
    </>
  );
}
