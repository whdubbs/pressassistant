# Race Tracker

A single-user Next.js app that tracks US political races you care about and generates daily Claude-powered news briefings with sources.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Vercel KV for persistence (race list + cached summaries)
- Vercel Cron for the 8am ET daily refresh
- Anthropic SDK with the `web_search` server-side tool
- Password cookie for single-user auth

## Local dev

```bash
cd race-tracker
npm install
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY, APP_PASSWORD, CRON_SECRET
# KV vars come from `vercel env pull` once KV is linked
npm run dev
```

## Deploy (GitHub + Vercel)

1. **Push** this repo to GitHub.
2. In Vercel, **Import Project** → pick the repo → set **Root Directory** to `race-tracker`.
3. **Storage tab** → Create a KV (Upstash Redis) store → Connect to the project. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
4. **Environment Variables**:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `APP_PASSWORD` — the password you'll use to sign in
   - `CRON_SECRET` — a long random string (Vercel sends this as `Authorization: Bearer <CRON_SECRET>` on cron hits)
5. **Deploy**. The cron in `vercel.json` runs daily at `0 12 * * *` UTC → 8am ET in EDT / 7am ET in EST. Adjust if you want to pin to a specific local hour year-round.

## How scheduling works (watch-outs)

- Vercel Cron hits `GET /api/refresh?all=1` once a day. The route checks for `Authorization: Bearer $CRON_SECRET` before running.
- Cron expressions are **UTC**. `0 12 * * *` is 8am ET during Daylight Saving (Mar–Nov) and 7am ET during Standard Time.
- `maxDuration = 300` lets the function run up to 5 min. Races are refreshed in parallel via `Promise.all`, so total wall-clock time ≈ the slowest single race (~20–40s with web search).
- Check **Project → Logs → Cron** after deploy to confirm the first run fired.

## Costs

- Claude API cost per race refresh: roughly $0.05–$0.20 depending on how many searches the model runs (capped at 8). With 10 races once a day that's ~$0.50–$2/day.
- KV free tier covers this workload easily.
