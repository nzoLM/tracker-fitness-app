import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DayEditor } from "@/components/day-editor";
import { getDayForEdit } from "@/lib/program";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Modifier un jour · Tracker program",
};

export default function EditDayPage({ params }: PageProps<"/programme/[dayId]">) {
  return (
    <Suspense fallback={<EditDaySkeleton />}>
      <EditDayContent params={params} />
    </Suspense>
  );
}

async function EditDayContent({ params }: { params: PageProps<"/programme/[dayId]">["params"] }) {
  const { dayId } = await params;
  const { user } = await requireSession();
  const data = await getDayForEdit(user.id, dayId);
  if (!data) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold wrap-break-word">Modifier {data.day.name}</h1>
      <div className="mt-6">
        <DayEditor {...data} />
      </div>
    </>
  );
}

function EditDaySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-foreground/20" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-foreground/10" />
      ))}
    </div>
  );
}
