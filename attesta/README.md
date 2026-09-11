# TrustAgent AI — setup

## 1. Install dependencies
```
npm install
```

## 2. Supabase
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Create two Storage buckets: `policy-documents` and `questionnaires`. Private is fine —
   every read/write goes through server routes with the service role key, never client-direct.

## 3. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project settings → API.
- `GOOGLE_API_KEY` — Google AI Studio.
- `NEXT_PUBLIC_DEMO_ORG_ID` — any UUID. Auth is stubbed for the hackathon; see `lib/demoOrg.ts`.

## 4. Run it
```
npm run dev
```
Visit `/knowledge-base`, upload a policy PDF, then go to `/questionnaires` and upload a blank
questionnaire — it'll auto-process and drop you into the review dashboard.

## Known shortcuts
Each is commented inline where it matters; the summary:
- **No real auth** — a single hardcoded org id stands in for login (`lib/demoOrg.ts`). Every
  function and route already takes `orgId` as a parameter, so swapping in real Supabase Auth
  later is a one-file change.
- **`/api/questionnaires/[id]/process` runs sequentially and inline**, not queued. Fine for a
  demo-sized questionnaire; may hit a serverless timeout on a very large one (comment in that file).
- **PDF ingestion also runs inline** on upload rather than as a background job — same tradeoff,
  fine at hackathon scale.
- **Dependency versions in `package.json` are indicative**, not pinned to exact latest — run
  `npm install` and let it resolve, or bump anything that's fallen behind.
