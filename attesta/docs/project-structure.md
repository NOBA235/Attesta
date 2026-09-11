# TrustAgent AI — project structure

```
trustagent-ai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                        # sidebar nav, org switcher, auth guard
│   │   ├── page.tsx                          # overview: doc count, in-progress questionnaires
│   │   ├── knowledge-base/
│   │   │   └── page.tsx                      # upload/manage policy PDFs
│   │   └── questionnaires/
│   │       ├── page.tsx                      # list of questionnaires + statuses
│   │       ├── new/page.tsx                  # upload a blank .xlsx
│   │       └── [id]/page.tsx                 # the review dashboard (renders the Task 4 component)
│   ├── api/
│   │   ├── documents/
│   │   │   ├── upload/route.ts               # POST: store PDF in Supabase Storage, create `documents` row
│   │   │   └── [id]/route.ts                 # DELETE a policy doc + its chunks
│   │   ├── ingest/route.ts                   # POST: parse + chunk + embed one document (Task 1)
│   │   ├── questionnaires/
│   │   │   ├── upload/route.ts               # POST: parse .xlsx -> `questionnaires` + `questionnaire_items`
│   │   │   ├── [id]/route.ts                 # GET questionnaire + all items
│   │   │   ├── [id]/process/route.ts         # POST: run RAG (Task 3) over every pending item
│   │   │   ├── [id]/items/[itemId]/route.ts  # PATCH: approve or edit a single answer
│   │   │   └── [id]/export/route.ts          # GET: stream back the completed .xlsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                                   # shadcn/ui primitives (button, textarea, card, etc.)
│   ├── knowledge-base/
│   │   ├── document-uploader.tsx
│   │   └── document-list.tsx
│   └── review/
│       └── questionnaire-review-dashboard.tsx   # Task 4 deliverable
├── lib/
│   ├── supabase/
│   │   ├── client.ts                         # browser client (anon key)
│   │   ├── server.ts                         # server/route-handler client (service role)
│   │   └── database.types.ts                 # generated via `supabase gen types typescript`
│   ├── ai/
│   │   ├── embeddings.ts                     # shared GoogleGenerativeAIEmbeddings instance
│   │   ├── chatModel.ts                      # shared ChatGoogleGenerativeAI factory (flash/pro)
│   │   └── rag/
│   │       ├── answerQuestion.ts             # Task 3 deliverable
│   │       └── chunkAndEmbedDocument.ts       # ingestion-side counterpart (chunk PDF -> embed -> insert)
│   ├── parsing/
│   │   ├── pdf.ts                            # pdf-parse wrapper + text chunking
│   │   └── xlsx.ts                           # read blank questionnaire / write completed one
│   └── utils.ts                              # cn() helper (shadcn) and misc formatting
├── supabase/
│   └── schema.sql                            # Task 2 deliverable
├── types/
│   └── questionnaire.ts                      # shared types used by lib and components
├── middleware.ts                             # Supabase auth session refresh
├── .env.local.example
└── package.json
```

## Why this shape

- **Route groups** `(auth)` and `(dashboard)` keep the marketing/login flow separate from the authenticated app without affecting the URL.
- **`app/api/*` mirrors the domain**, not the tables — `documents` for the knowledge base, `questionnaires` for the Q&A workflow — so each route file has one clear job and is easy to hand off to a teammate.
- **`lib/ai` is split from `lib/parsing`**: parsing (PDF/xlsx) is pure I/O, AI (embeddings/chat/RAG) is the "smart" layer. This makes it trivial to swap `gemini-1.5-flash` for `gemini-1.5-pro` in one file, or add a second retrieval strategy later, without touching parsing code.
- **`ingest/route.ts` and `[id]/process/route.ts` are separate from upload routes** so upload can respond instantly (fast UX) while chunking/embedding/answering happens as a follow-up call — important for a 6-day build where you don't want to debug streaming/background jobs under time pressure. If you have time, promote these to a queue (e.g. Supabase Edge Function or a simple `setTimeout`-free background worker); for the MVP, a second POST triggered right after upload is fine.
- **One shared `types/questionnaire.ts`** so the RAG layer and the review UI never drift out of sync on field names.
