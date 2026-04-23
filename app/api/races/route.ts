import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { addRace, listRaces, removeRace, getSummaries } from "@/lib/store";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const races = await listRaces();
  const summaries = await getSummaries(races.map((r) => r.id));
  return NextResponse.json({ races, summaries });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { label } = (await req.json()) as { label?: string };
  if (!label || !label.trim()) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  const race = await addRace(label);
  return NextResponse.json({ race });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await removeRace(id);
  return NextResponse.json({ ok: true });
}
