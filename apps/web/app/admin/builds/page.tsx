import { BuildsConsole } from "../../../components/admin/BuildsConsole";

export const metadata = { title: "Builds admin" };
export const dynamic = "force-dynamic";

export default function AdminBuildsPage() {
  return <BuildsConsole />;
}
