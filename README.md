# Job Aggregator — Starter

Searches Adzuna and Jooble in parallel, merges + dedupes the results, and shows
them in one list. Click a listing and it opens the original posting (Naukri,
company site, LinkedIn-sourced page, wherever it actually lives) in a new tab.

## 1. Get free API keys (5 minutes)

- **Adzuna**: https://developer.adzuna.com/ → sign up → you get an `App ID`
  and `App Key`.
- **Jooble**: https://jooble.org/api/about → request access → you get an API
  key by email, usually within minutes.

## 2. Backend setup

```bash
cd backend
cp .env.example .env
# paste your ADZUNA_APP_ID, ADZUNA_APP_KEY, JOOBLE_API_KEY into .env
npm install
npm run dev
```

Runs on `http://localhost:5000`. Test it directly in your browser:
`http://localhost:5000/api/jobs/search?query=developer&location=bangalore`

If a key is missing or wrong, that source is just skipped — the response's
`sourceErrors` field tells you which one, and the UI shows a banner about it.

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Search from there — it calls the backend at
`localhost:5000`.

## How it works

```
Frontend (React)
   → GET /api/jobs/search?query=...&location=...
        → Backend calls Adzuna + Jooble in parallel (Promise.allSettled,
          so one failing source doesn't break the search)
        → Normalizes both into one shape: { title, company, location,
          salary, description, url, source, postedAt }
        → Dedupes by title + company
   ← Merged JSON list
Frontend renders it, links out to job.url
```

## Next steps worth adding

- **Add JSearch (RapidAPI)** as a third source for LinkedIn/Indeed-style
  coverage — drop in a `searchJSearch()` adapter in `server.js` following the
  same pattern as `searchAdzuna`/`searchJooble`, and push it into the
  `SOURCES` array.
- **Cache results** (e.g. Redis or even an in-memory Map keyed by
  `query+location`) so repeat searches don't re-hit rate-limited free tiers.
- **Pagination** — the `page` query param is already wired into both
  adapters; add "load more" on the frontend.
- **Persist searches / saved jobs** once you add user accounts.
