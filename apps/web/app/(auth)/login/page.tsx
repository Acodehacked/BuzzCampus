import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "../../../components/auth/LoginForm";
import { auth } from "../../../server/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/feed");

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
