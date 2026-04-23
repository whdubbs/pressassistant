import { isAuthed } from "@/lib/auth";
import { listRaces, getSummaries } from "@/lib/store";
import LoginForm from "./login-form";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAuthed())) {
    return <LoginForm />;
  }
  const races = await listRaces();
  const summaries = await getSummaries(races.map((r) => r.id));
  return <Dashboard initialRaces={races} initialSummaries={summaries} />;
}
