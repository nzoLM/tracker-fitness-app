import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion · Tracker Push/Pull" };

export default function SignInPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Connexion</h1>
      <AuthForm mode="sign-in" googleEnabled={isGoogleEnabled} />
    </>
  );
}
