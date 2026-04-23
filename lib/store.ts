import { Redis } from "@upstash/redis";
import type { Race, Summary } from "./types";

const redis = Redis.fromEnv();

const RACES_KEY = "races";
const summaryKey = (id: string) => `summary:${id}`;

export async function listRaces(): Promise<Race[]> {
  return (await redis.get<Race[]>(RACES_KEY)) ?? [];
}

export async function addRace(label: string): Promise<Race> {
  const races = await listRaces();
  const race: Race = {
    id: crypto.randomUUID(),
    label: label.trim(),
    createdAt: Date.now(),
  };
  await redis.set(RACES_KEY, [...races, race]);
  return race;
}

export async function removeRace(id: string): Promise<void> {
  const races = await listRaces();
  await redis.set(
    RACES_KEY,
    races.filter((r) => r.id !== id),
  );
  await redis.del(summaryKey(id));
}

export async function getSummary(id: string): Promise<Summary | null> {
  return (await redis.get<Summary>(summaryKey(id))) ?? null;
}

export async function getSummaries(
  ids: string[],
): Promise<Record<string, Summary | null>> {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await getSummary(id)] as const),
  );
  return Object.fromEntries(entries);
}

export async function setSummary(summary: Summary): Promise<void> {
  await redis.set(summaryKey(summary.raceId), summary);
}
