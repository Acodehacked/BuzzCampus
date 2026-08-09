import { redirect } from "next/navigation";
import { auth } from "../../server/auth";

export default async function AdminIndex() {
  const session = await auth();
  // Route each role to the console it can actually open.
  redirect(session?.user?.role === "mentor" ? "/admin/builds" : "/admin/campus");
}
