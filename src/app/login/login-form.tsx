"use client";

import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("password");
    // Read at submit time so the page itself stays static (no searchParams during prerender).
    const next = new URLSearchParams(location.search).get("next") ?? "";
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      if (res.ok) {
        location.href = /^\/(?![/\\])/.test(next) ? next : "/pos";
        return;
      }
      setError(res.status === 401 ? "Incorrect password." : "Something went wrong. Try again.");
    } catch {
      setError("Network error. Try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          aria-describedby="login-error"
          className="mt-1.5 w-full rounded-card border border-line bg-paper px-3.5 py-3 text-base text-ink"
        />
      </div>
      <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-wine">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-card bg-ink px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
