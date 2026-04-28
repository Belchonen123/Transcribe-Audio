# Transcribe Audio

Speaker-aware transcription app: upload audio or video, get transcripts with speaker labels via [AssemblyAI](https://www.assemblyai.com/) and a [Convex](https://www.convex.dev/) backend (storage, jobs, webhooks).

## Repository layout

| Path | Purpose |
|------|---------|
| `transcribe-mvp/` | Next.js 14 app + Convex functions |

## Prerequisites

- Node.js 18+
- npm (workspaces enabled at repo root)
- Convex account and CLI (`npx convex`)
- AssemblyAI API key

## Setup

From the repository root:

```bash
npm install
```

### Environment variables

Create **`transcribe-mvp/.env.local`** (never commit this file) with at least:

```bash
# Convex — match your deployment (same URL as `npx convex dev` / dashboard)
CONVEX_DEPLOYMENT=dev:your-deployment-slug
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Convex dashboard → Settings → Environment Variables (backend): ASSEMBLYAI_API_KEY, CONVEX_SITE_URL, WEBHOOK_SECRET
```

Configure **`ASSEMBLYAI_API_KEY`**, **`CONVEX_SITE_URL`** (your `.convex.site` HTTP URL), and **`WEBHOOK_SECRET`** in the [Convex dashboard](https://dashboard.convex.dev) for the same deployment.

### Run locally

```bash
npm run dev
```

In another terminal (first time or when Convex code changes):

```bash
npm run convex:dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

## Tech stack

- Next.js 14 (App Router), Tailwind CSS
- Convex (database, file storage, scheduled actions, HTTP webhook)
- AssemblyAI Universal models (`speech_models`)

## License

Private / use per your organization.
