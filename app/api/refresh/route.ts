import { NextRequest, NextResponse } from "next/server";
import { isAuthed, isCron } from "@/lib/auth";
import { listRaces, setSummary } from "@/lib/store";
import { fetchRaceSummary } from "@/lib/claude";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  // Vercel Cron hits GET by default
  return handle(req);
}

async function handle(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";

  if (all) {
    if (!isCron(req) && !(await isAuthed())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const races = await listRaces();
    const results = await Promise.all(
      races.map(async (r) => {
        const s = await fetchRaceSummary(r.id, r.label);
        await setSummary(s);
        return { id: r.id, ok: !s.error };
      }),
    );
    return NextResponse.json({ refreshed: results.length, results });
  }

  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const races = await listRaces();
  const race = races.find((r) => r.id === id);
  if (!race) return NextResponse.json({ error: "not found" }, { status: 404 });
  const summary = await fetchRaceSummary(race.id, race.label);
  await setSummary(summary);
  return NextResponse.json({ summary });
}
