"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, Field, Input, Surface } from "@buzz/ui";
import { registerSchema } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const register = trpc.account.register.useMutation({
    onSuccess: async () => {
      // Straight into onboarding — a confirmation screen here is friction
      // for no benefit, and the four welcome panels do more to explain the
      // product than any amount of copy on this form could.
      await signIn("credentials", { email, password, redirect: false });
      router.push("/welcome");
      router.refresh();
    },
    onError: (error) => setErrors({ form: error.message }),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      department: department || undefined,
    });

    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!flat[key]) flat[key] = issue.message;
      }
      setErrors(flat);
      return;
    }

    setErrors({});
    register.mutate(parsed.data);
  }

  return (
    <>
      <h1 className="display-xl text-3xl text-text-primary-dark">
        Join Buzz
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
        Campus email only. You start with 2 credits so you can ask for help
        before you&apos;ve given any.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Name" required error={errors.name}>
          {(id) => (
            <Input
              id={id}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              invalid={Boolean(errors.name)}
            />
          )}
        </Field>

        <Field label="Campus email" required error={errors.email}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(errors.email)}
              placeholder="you@university.edu"
            />
          )}
        </Field>

        <Field
          label="Password"
          required
          error={errors.password}
          hint="8+ characters"
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={Boolean(errors.password)}
            />
          )}
        </Field>

        <Field label="Department" hint="optional" error={errors.department}>
          {(id) => (
            <Input
              id={id}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Computer Science"
            />
          )}
        </Field>

        {errors.form ? (
          <p role="alert" className="text-xs text-danger-500">
            {errors.form}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="pop-light"
          size="lg"
          className="w-full justify-center"
          loading={register.isPending}
        >
          Create account
        </Button>
      </form>

      <Surface className="mt-6 p-3">
        <p className="text-xs leading-relaxed text-text-muted">
          Your starter credits arrive as a real ledger entry, not a magic
          number — you can see the grant in your wallet the moment you sign in.
        </p>
      </Surface>

      <p className="mt-6 text-sm text-text-muted">
        Already here?{" "}
        <Link
          href="/login"
          className="text-text-primary-dark underline underline-offset-4 hover:opacity-80"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
