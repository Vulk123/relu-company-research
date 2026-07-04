# Relu Company Research Assistant

An AI-powered Company Research Assistant built for the **Relu Consultancy — AI & Automation Developer** hiring hackathon.

Enter a company name or website URL and the app will: resolve the official
site, crawl its key pages, pull supporting context from the web via
Serper.dev, run AI analysis via OpenRouter, identify competitors, and
generate a downloadable, professional PDF report — all through a
ChatGPT-style interface.

**Author:** Gargi Rathore

---

## 1. Features

| Requirement | Implementation |
|---|---|
| Company name or URL input | `app/page.js` — single input box detects URL vs. name |
| Official website resolution | `lib/serper.js` → `findOfficialWebsite()` |
| Website crawling | `lib/crawler.js` — discovers Home/About/Products/Services/Solutions/Contact/Pricing, dedupes, ignores login/irrelevant pages, extracts clean text |
| Search integration | `lib/serper.js` — Serper.dev used to resolve websites, gather contact info, and find competitors |
| AI integration | `lib/openrouter.js` — calls any OpenRouter model, returns structured JSON (summary, products, pain points, competitors) |
| Competitor analysis | Same OpenRouter call, cross-checked against Serper competitor search results |
| Chat interface | `app/page.js` — chat-style conversation with progress indicators |
| PDF generation | `lib/pdf.js` — client-side jsPDF, single-click download |
| Discord integration (bonus) | `app/api/discord/route.js` — posts applicant + research summary + PDF attachment to a Discord channel via the Bot API |
| No auth / no DB | API keys are entered in the sidebar and kept in the browser's `localStorage`; nothing is persisted server-side |

## 2. Architecture

```
Browser (React / Next.js App Router)
  │
  ├── Sidebar: OpenRouter key, Serper key, model picker, Discord bot config
  ├── Chat UI: input → /api/research → renders ResultCard
  │
  ├── POST /api/research  (Next.js Route Handler, Node runtime)
  │     1. Resolve official website (Serper, if a name was given)
  │     2. Crawl website          (lib/crawler.js, cheerio)
  │     3. Gather search context  (lib/serper.js)
  │     4. AI analysis            (lib/openrouter.js) → structured JSON
  │     5. Return result to browser
  │
  ├── Client-side PDF generation  (lib/pdf.js, jsPDF) on "Download" click
  │
  └── POST /api/discord   (Next.js Route Handler)
        Uploads the generated PDF + applicant/company info to a Discord
        channel via the Discord Bot REST API (multipart file upload).
```

**Why keys are sent per-request instead of stored in env vars:** the brief
requires no authentication, no accounts, and no database. Each user (or
evaluator) pastes their own OpenRouter/Serper/Discord credentials into the
sidebar; they're kept only in that browser's `localStorage` and are sent to
this app's own API routes over HTTPS to make the corresponding third-party
calls. They are never logged, written to disk, or forwarded anywhere except
the intended third-party API. Optional server-side fallback env vars are
also supported — see below.

## 3. Tech Stack

- **Framework:** Next.js 14 (App Router, Route Handlers as serverless functions)
- **UI:** React, plain CSS-in-JS (no external UI framework — keeps the bundle small and the dark theme fully custom)
- **Crawling:** `fetch` + `cheerio` for HTML parsing
- **Search:** Serper.dev REST API
- **AI:** OpenRouter Chat Completions API (model-agnostic — user picks any supported model)
- **PDF:** `jsPDF` (client-side)
- **Bonus:** Discord Bot REST API (`POST /channels/{id}/messages` with multipart file upload)

## 4. Getting Started Locally

### Prerequisites
- Node.js 18.17+ (Node 20 LTS recommended)
- npm

### Install & run

```bash
git clone <your-repo-url>
cd relu-company-research
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In the sidebar:
1. Switch to the **API** tab and paste your **OpenRouter** and **Serper.dev** API keys.
2. Pick an AI model from the dropdown.
3. Click **Save Configuration**.
4. Type a company name or URL in the chat box and press Enter.

For the Discord bonus feature, switch to the **DISCORD** tab, paste the bot
token + channel ID (provided by the evaluator) and your applicant name/email,
then Save. After a report is generated, click **Send to Discord** on the
result card (or wire it to auto-send — see `app/page.js` `handleSendToDiscord`).

### Production build

```bash
npm run build
npm run start
```

## 5. Environment Variables

No environment variables are **required** — all keys can be entered in the
UI at runtime. The following are **optional** server-side fallbacks (useful
if you want the app pre-configured for an evaluator so they don't have to
paste keys):

| Variable | Required? | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | No | Fallback OpenRouter key if none is sent from the UI |
| `SERPER_API_KEY` | No | Fallback Serper.dev key if none is sent from the UI |
| `NEXT_PUBLIC_DEFAULT_MODEL` | No | Preselects a default model in the dropdown (e.g. `anthropic/claude-3.5-sonnet`) |
| `DISCORD_BOT_TOKEN` | No | Fallback Discord bot token |
| `DISCORD_CHANNEL_ID` | No | Fallback Discord channel ID |

See `.env.example` for a template. Copy it to `.env.local` for local
development:

```bash
cp .env.example .env.local
```

## 6. Deployment (Vercel)

1. Push this repository to your own GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Framework preset: **Next.js** (auto-detected). No build command changes needed.
4. (Optional) Add the environment variables from section 5 under **Project → Settings → Environment Variables** if you want server-side fallback keys.
5. Deploy. Vercel will give you a public URL (e.g. `https://relu-company-research.vercel.app`).

The same steps work on Netlify or Cloudflare Pages with their respective
Next.js adapters.

## 7. How the Crawler Avoids Duplicates & Junk

- Links are resolved to absolute URLs and restricted to the same origin as the target site.
- A `Set` of visited URLs prevents fetching the same page twice.
- Each discovered link is classified into one page "type" (home/about/products/services/solutions/contact/pricing) via keyword-pattern matching on the URL path; only the **first** URL found for each type is queued, which naturally dedupes near-identical links (e.g. `/products` vs `/products/`).
- Login/signup/account/cart/checkout/legal pages and non-HTML assets (images, PDFs, archives) are filtered out via an ignore-list before ever being fetched.
- A page cap (`MAX_PAGES = 6`) and per-request timeout (8s) keep crawling fast and bounded for the 6-hour hackathon format.

## 8. Known Limitations / Notes

- AI-generated pain points and competitor suggestions are inferential — they're grounded in crawled/search content but are not guaranteed facts, consistent with the assignment's brief ("AI-generated Pain Points").
- Very large or JS-heavy (SPA) websites may return thin content since the crawler does a plain HTTP fetch rather than headless-browser rendering; this keeps the app dependency-light and fast, which is an intentional trade-off for a 6-hour scope.
- No data is persisted anywhere (no DB), per the assignment's requirements.

## 9. Project Structure

```
relu-company-research/
├── app/
│   ├── page.js                 # Chat UI (client component)
│   ├── layout.js
│   ├── globals.css
│   └── api/
│       ├── research/route.js   # Main orchestration endpoint
│       └── discord/route.js    # Discord bonus integration
├── lib/
│   ├── serper.js                # Serper.dev search helpers
│   ├── crawler.js                # Website crawler (cheerio)
│   ├── openrouter.js             # OpenRouter AI analysis
│   └── pdf.js                    # jsPDF report builder
├── .env.example
├── package.json
└── README.md
```
