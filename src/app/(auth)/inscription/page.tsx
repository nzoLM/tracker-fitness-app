import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Inscription · Tracker Push/Pull" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Créer un compte</h1>
      <AuthForm mode="sign-up" googleEnabled={isGoogleEnabled} />
    </>
  );
}
