# Ichabod Engine 🎃

![ichabod logo](./images/ichabod-browser-logo%20300.jpg)

Headless browser scraping microservice. Accepts a JSON recipe, executes it against a live page using Playwright, and returns structured data.

Powers [Ichabod Browser](https://ichabodbrowser.com).

Licensed under MIT — free to self-host and modify. Cannot be used to offer a competing commercial service.

---

## How It Works

```bash
POST /scrape  →  Navigate  →  Act  →  Extract  →  Return JSON
POST /discover →  Fetch  →  Sanitize HTML  →  Return for LLM analysis
GET  /health  →  Browser + server status
```

---

## Deploy to Railway

1. Fork or push this repo to GitHub
2. Create a new project in [Railway](https://railway.app)
3. Connect your GitHub repo
4. Set environment variables in the Railway dashboard (see below)
5. Railway will build the Dockerfile and deploy automatically

Your service URL will be something like `https://ichabod-engine.up.railway.app`.

---

## Environment Variables

Set these in your Railway dashboard under **Variables**.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ICHABOD_API_KEY` | Yes (production) | `null` | Bearer token for all authenticated endpoints |
| `PORT` | No | `3000` | Port the server listens on |
| `NODE_ENV` | No | `development` | Set to `production` on Railway |
| `BROWSER_HEADLESS` | No | `true` | Run Chromium headless |
| `BROWSER_TIMEOUT_MS` | No | `30000` | Max time for any browser operation |
| `BROWSER_NAV_TIMEOUT_MS` | No | `15000` | Max time for page navigation |
| `BROWSER_MAX_PAGES` | No | `5` | Max concurrent pages |
| `SCRAPE_SCROLL_PAUSE_MS` | No | `800` | Pause between scroll actions |
| `SCRAPE_WAIT_TIMEOUT_MS` | No | `10000` | Max time waiting for a selector |
| `SCRAPE_MAX_PAGES` | No | `10` | Max pages in a paginated scrape |
| `DISCOVERY_MAX_HTML_LENGTH` | No | `100000` | Max HTML chars returned to LLM |
| `LOG_LEVEL` | No | `info` | Pino log level (debug/info/warn/error) |
| `LOG_PRETTY` | No | `true` | Pretty-print logs (set to `false` in production) |

---

## Local Development

```bash
npm install
npx playwright install chromium
cp .env.local.example .env
npm run dev
```

`.env` is for local development only. Never use it in production.

---

## API Reference

### `POST /scrape`

Execute a scrape recipe.

#### Headers

```bash
Authorization: Bearer <ICHABOD_API_KEY>
Content-Type: application/json
```

#### Body

```json
{
  "url": "https://www.upwork.com/search/jobs/?q=english+teacher&sort=recency",
  "waitFor": ".job-tile",
  "actions": [
    { "type": "scroll", "times": 3 }
  ],
  "extract": [
    {
      "name": "jobs",
      "selector": ".job-tile",
      "attribute": "selector",
      "multiple": true,
      "fields": [
        { "name": "title", "selector": ".job-title a", "attribute": "text" },
        { "name": "budget", "selector": ".budget", "attribute": "text" },
        { "name": "link", "selector": ".job-title a", "attribute": "href" }
      ]
    }
  ],
  "options": {
    "waitUntil": "networkidle"
  }
}
```

#### Response

```json
{
  "ok": true,
  "data": [
    { "title": "English Tutor Needed", "budget": "$25/hr", "link": "/jobs/..." }
  ],
  "meta": {
    "url": "https://...",
    "itemCount": 12,
    "duration": 4821,
    "scrapedAt": "2026-02-23T10:00:00.000Z",
    "timestamp": "2026-02-23T10:00:00.000Z"
  }
}
```

---

### `POST /discover`

Fetch a URL and return sanitized HTML for LLM analysis.

#### Body — single URL

```json
{
  "url": "https://www.upwork.com/search/jobs/?q=english+teacher",
  "options": { "waitUntil": "networkidle" }
}
```

#### Body — multiple candidate URLs

```json
{
  "candidates": [
    "https://www.upwork.com/search/jobs/?q=english+teacher",
    "https://www.upwork.com/freelance-jobs/english-teaching/"
  ],
  "options": { "waitUntil": "networkidle" }
}
```

---

### `GET /health`

No authentication required.

#### Response

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "browser": { "connected": true, "activePages": 0, "maxPages": 5 },
    "uptime": 3600,
    "memory": { "rss": 12345678 }
  }
}
```

---

## Adding a New Action

1. Create `src/actions/yourAction.js`
2. Export a single async function `(page, action) => {}`
3. Register it in `src/actions/index.js`

## Adding a New Route

1. Create `src/routes/yourRoute.js`
2. Create `src/controllers/yourController.js`
3. Add validation schema to `src/middleware/validate.js`
4. Mount it in `src/routes/index.js`
