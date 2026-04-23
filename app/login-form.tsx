"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setError("Incorrect password.");
      setBusy(false);
    }
  }

  return (
    <div className="container login">
      <div className="brand">
        <span className="brand-dot" />
        <span className="brand-label">Race Tracker</span>
      </div>
      <h1>Welcome back.</h1>
      <p className="sub">Sign in to view your daily race briefings.</p>
      <form onSubmit={submit}>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
