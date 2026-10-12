"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

// Désactivé pendant l'envoi, pour éviter un double envoi au double tap
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={cn("cursor-pointer disabled:opacity-60", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
