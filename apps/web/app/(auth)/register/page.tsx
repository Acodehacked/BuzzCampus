import { redirect } from "next/navigation";
import { RegisterForm } from "../../../components/auth/RegisterForm";
import { auth } from "../../../server/auth";

export const metadata = { title: "Join" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/feed");

  return <RegisterForm />;
}
