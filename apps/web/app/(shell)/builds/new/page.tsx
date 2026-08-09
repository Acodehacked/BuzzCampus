import { NewBuildForm } from "../../../../components/builds/NewBuildForm";
import { auth } from "../../../../server/auth";

export const metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default async function NewBuildPage() {
  const session = await auth();
  return <NewBuildForm department={session?.user?.department} />;
}
