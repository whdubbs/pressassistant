"use client";

import { useState } from "react";
import type { Race, Summary } from "@/lib/types";

type Props = {
  initialRaces: Race[];
  initialSummaries: Record<string, Summary | null>;
};

export default function Dashboard({ initialRaces, initialSummaries }: Props) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [summaries, setSummaries] =
    useState<Record<string, Summary | null>>(initialSummaries);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  async function addRace(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    const res = await fetch("/api/races", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setAdding(false);
    if (!res.ok) return;
    const { race } = (await res.json()) as { race: Race };
    setRaces((r) => [...r, race]);
    setLabel("");
    // auto-refresh newly added race
    refresh(race.id);
  }

  async function removeRace(id: string) {
    if (!confirm("Remove this race?")) return;
    const res = await fetch(`/api/races?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setRaces((r) => r.filter((x) => x.id !== id));
    setSummaries((s) => {
      const { [id]: _, ...rest } = s;
      return rest;
    });
  }

  async function refresh(id: string) {
    setRefreshing((r) => ({ ...r, [id]: true }));
    try {
      const res = await fetch(`/api/refresh?id=${encodeURIComponent(id)}`, {
        method: "POST",
      });
      if (res.ok) {
        const { summary } = (await res.json()) as { summary: Summary };
        setSummaries((s) => ({ ...s, [id]: summary }));
      }
    } finally {
      setRefreshing((r) => ({ ...r, [id]: false }));
    }
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="container">
      <div className="header-row">
        <div>
          <div className="brand">
            <span className="brand-dot" />
            <span className="brand-label">Race Tracker</span>
          </div>
          <h1>Your races, briefed daily.</h1>
          <p className="sub">
            AI-generated intel on the political races you care about.
          </p>
        </div>
        <button onClick={logout}>Sign out</button>
      </div>

      <form className="add-row" onSubmit={addRace}>
        <input
          placeholder="e.g. 2026 Ohio US Senate, or PA-07 congressional"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button className="primary" type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {races.length === 0 && (
        <div className="empty">
          Add a race above to get started. Briefings refresh every morning.
        </div>
      )}

      {races.map((race) => {
        const s = summaries[race.id];
        const isRefreshing = !!refreshing[race.id];
        return (
          <div key={race.id} className="race">
            <div className="race-head">
              <div>
                <h2>{race.label}</h2>
                <div className="meta">
                  {s?.updatedAt
                    ? `Updated ${new Date(s.updatedAt).toLocaleString()}`
                    : "Not yet fetched"}
                </div>
              </div>
              <div className="actions">
                <button
                  onClick={() => refresh(race.id)}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing…" : "Refresh"}
                </button>
                <button className="danger" onClick={() => removeRace(race.id)}>
                  Remove
                </button>
              </div>
            </div>

            {s?.error && <div className="error">Error: {s.error}</div>}

            {s?.content && (
              <div
                className="content"
                dangerouslySetInnerHTML={{ __html: renderMd(s.content) }}
              />
            )}

            {!s && !isRefreshing && (
              <div className="meta" style={{ marginTop: 10 }}>
                Click Refresh to fetch the first briefing.
              </div>
            )}

            {s?.sources && s.sources.length > 0 && (
              <div className="sources">
                <strong>Sources</strong>
                <ol>
                  {s.sources.map((src, i) => (
                    <li key={i}>
                      <a href={src.url} target="_blank" rel="noreferrer">
                        {src.title || src.url}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderMd(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^- (.+)$/gm, "• $1");
}
