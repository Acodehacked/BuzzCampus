"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, Field, Input } from "@buzz/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      // Deliberately vague: saying which half was wrong tells an attacker
      // whether an address is registered.
      setError("That email and password don't match an account");
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/feed");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl tracking-tight text-text-primary-dark">
        Welcome back
      </h1>
      <p className="mt-1.5 text-sm text-text-muted">
        Sign in to see what&apos;s happening on campus.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Campus email" required>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
            />
          )}
        </Field>

        <Field label="Password" required>
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-danger-500">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          loading={pending}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        No account yet?{" "}
        <Link
          href="/register"
          className="text-text-primary-dark underline underline-offset-4 hover:opacity-80"
        >
          Join with your campus email
        </Link>
      </p>
    </>
  );
}
