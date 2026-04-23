import Anthropic from "@anthropic-ai/sdk";
import type { Source, Summary } from "./types";

function resolveApiKey(): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  const candidates = [
    "PressAssistant_AI_Key",
    "PRESSASSISTANT_AI_KEY",
    "pressassistant_ai_key",
    "ANTHROPIC_API_KEY",
  ];
  for (const name of candidates) {
    if (env[name]) return env[name];
  }
  // last-ditch: any env var with "pressassistant" in the name (case-insensitive)
  for (const [k, v] of Object.entries(env)) {
    if (/pressassistant/i.test(k) && v) return v;
  }
  return undefined;
}

const apiKey = resolveApiKey();
const client = new Anthropic({ apiKey });

const SYSTEM = `You are a political news analyst writing concise briefings for a professional audience (think: a campaign strategist, journalist, or policy staffer checking their reading list in the morning). Use web search aggressively to surface the freshest material.

Write in markdown with exactly these three sections, in this order:

**What's changed in the past 1 day**
- 2-4 tight bullets on anything that happened in the last 24 hours (news, polls, filings, endorsements, gaffes). If nothing meaningful happened, say "No significant developments in the past 24 hours." Do not pad.
- Each bullet must end with an inline markdown link to the primary source, e.g. "Husted endorsed by state Farm Bureau ([Cleveland.com](https://cleveland.com/...))."

**What's changed in the past week**
- 3-6 bullets covering the past 7 days (excluding anything already in the 24h section).
- Same inline linking requirement.

**Race overview**
- One paragraph, maximum ~4 sentences. Seat + state/district + cycle + election date + the core dynamic (who's in, who's ahead, what's the key tension). No bullets, no bold sub-labels, just prose.

Rules:
- Professional, neutral tone. No hype, no filler phrases ("it's worth noting", "in a surprising move").
- Every factual claim in the two "What's changed" sections must have an inline source link. If you can't source it, don't include it.
- Prefer primary sources (campaign filings, official statements, reputable local papers and wires) over aggregators.
- Today's date is ${new Date().toISOString().slice(0, 10)}. Use it to judge what counts as "past day" vs "past week".
- Do not invent URLs. If web search didn't surface a link, drop the bullet.`;

export async function fetchRaceSummary(
  raceId: string,
  label: string,
): Promise<Summary> {
  if (!apiKey) {
    const visible = Object.keys(process.env)
      .filter((k) => /press|anthropic|ai_key/i.test(k))
      .join(", ") || "(none found)";
    return {
      raceId,
      updatedAt: Date.now(),
      content: "",
      sources: [],
      error: `API key not found in env. Matching var names visible to server: ${visible}`,
    };
  }
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 5,
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        {
          role: "user",
          content: `Race: ${label}\n\nProduce the briefing. Prioritize news from the past 24 hours and past 7 days — that's the whole point. Run multiple searches if needed to separate "yesterday" from "this week".`,
        },
      ],
    });

    const textParts: string[] = [];
    const sources: Source[] = [];
    const seen = new Set<string>();

    for (const block of response.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;
      if (b.type === "text" && typeof b.text === "string") {
        textParts.push(b.text);
        if (Array.isArray(b.citations)) {
          for (const c of b.citations) {
            const url: string | undefined = c?.url;
            if (url && !seen.has(url)) {
              seen.add(url);
              sources.push({ url, title: c?.title });
            }
          }
        }
      }
    }

    return {
      raceId,
      updatedAt: Date.now(),
      content: textParts.join("\n\n").trim() || "(no content returned)",
      sources,
    };
  } catch (err) {
    return {
      raceId,
      updatedAt: Date.now(),
      content: "",
      sources: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
