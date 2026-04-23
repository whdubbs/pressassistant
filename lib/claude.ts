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

const SYSTEM = `You are a political news analyst. For the given US election race, produce a concise, up-to-date briefing using web search.

Structure your response in markdown with these sections:
- **Race overview**: seat, state/district, cycle, election date
- **Candidates**: declared/likely candidates with party, incumbency, notable positioning
- **Latest developments**: 3-6 bullets of the most important recent news (polls, endorsements, fundraising, scandals, debates)
- **What to watch**: 2-3 bullets on upcoming inflection points

Be factual and neutral. Cite sources inline where relevant. Do not speculate beyond what sources support.`;

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
      model: "claude-opus-4-7",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 8,
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        {
          role: "user",
          content: `Brief me on this race: ${label}\n\nSearch the web for the latest news (within the past 2-3 weeks if available) and produce the briefing.`,
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
