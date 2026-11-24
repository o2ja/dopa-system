import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm rounded-card border border-line bg-card p-6 shadow-soft sm:p-8">
        <h1 className="font-display text-3xl text-ink">Dopa staff</h1>
        <p className="mt-1 text-sm text-muted">Sign in to open the POS and admin.</p>
        <LoginForm />
      </div>
    </main>
  );
}
