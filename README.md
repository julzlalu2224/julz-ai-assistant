# james-ai-assistant

> A minimal, production-ready Express API that powers a **streaming** AI assistant for James's personal portfolio website.
> Keeps your API key server-side, streams responses via SSE, logs every request, and tracks token usage.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Streaming (SSE) Integration](#streaming-sse-integration)
- [Token Usage Monitoring](#token-usage-monitoring)
- [Customising the AI Persona](#customising-the-ai-persona)
- [Deployment](#deployment)
  - [Render](#render)
  - [Railway](#railway)
  - [Vercel (Node server mode)](#vercel-node-server-mode)
- [Security Notes](#security-notes)

---

## Tech Stack

| Layer        | Technology                    |
|-------------|-------------------------------|
| Runtime      | Node.js ≥ 18                  |
| Framework    | Express 4                     |
| AI           | OpenAI SDK v4 (or OpenRouter) |
| Config       | dotenv                        |
| CORS         | cors                          |
| Rate Limit   | express-rate-limit            |

---

## Folder Structure

```
james-ai-assistant/
├── server.js                        # Entry point
├── package.json
├── .env.example                     # Copy to .env and fill in values
└── src/
    ├── config/
    │   └── cors.config.js           # Builds CORS options from FRONTEND_URL
    ├── controllers/
    │   └── chat.controller.js       # Validates request, sets SSE headers, streams response
    ├── middleware/
    │   ├── error.middleware.js      # Centralised JSON error handler
    │   └── logger.middleware.js     # Structured access logger with token usage
    ├── routes/
    │   └── chat.routes.js           # POST /api/chat + rate limiter
    └── services/
        └── ai.service.js            # OpenAI streaming client + token stats tracker
```

---

## Getting Started

### 1 — Clone & install

```bash
git clone https://github.com/julzlalu2224/james-ai-assistant.git
cd james-ai-assistant
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Open .env and set OPENAI_API_KEY and FRONTEND_URL
```

### 3 — Run in development

```bash
npm run dev     # uses nodemon for auto-reload
```

### 4 — Run in production

```bash
npm start
```

The server starts on `http://localhost:3000` (or `PORT` from `.env`).

---

## Environment Variables

| Variable          | Required | Description                                              |
|-------------------|----------|----------------------------------------------------------|
| `OPENAI_API_KEY`  | ✅        | Your OpenAI (or OpenRouter) API key                     |
| `OPENAI_BASE_URL` | ❌        | Override API base URL (e.g. `https://openrouter.ai/api/v1`) |
| `OPENAI_MODEL`    | ❌        | Model name — defaults to `gpt-4o-mini`                  |
| `PORT`            | ❌        | HTTP port — defaults to `3000`                          |
| `FRONTEND_URL`    | ✅        | Allowed CORS origin(s), comma-separated                 |
| `LOG_TOKEN_USAGE` | ❌        | Set to `true` to forward token stats to stdout as JSON  |

### Example `.env`

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
FRONTEND_URL=https://yourportfolio.com
```

---

## API Reference

### `POST /api/chat`

Send a visitor message. The response is a **Server-Sent Events (SSE)** stream.

**Request body**

```json
{
  "message": "What technologies does James work with?"
}
```

**Stream events**

```
data: {"chunk":"James works primarily"}
data: {"chunk":" with JavaScript and TypeScript"}
data: {"chunk":" across the full stack..."}
data: {"done":true,"usage":{"prompt_tokens":112,"completion_tokens":48,"total_tokens":160}}
```

**Error response — 400** (before stream starts)

```json
{
  "error": "Request body must include a \"message\" string."
}
```

**Rate limit response — 429**

```json
{
  "error": "Too many requests — please try again in a few minutes."
}
```

#### Example curl request

```bash
curl -N -X POST https://your-api.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What projects has James built?"}'
```

> The `-N` flag disables curl's output buffering so you see chunks as they arrive.

### `GET /api/stats`

Returns the cumulative in-memory token usage since the server started.

```json
{
  "totalRequests": 42,
  "promptTokens": 4704,
  "completionTokens": 2016,
  "totalTokens": 6720
}
```

> Resets on server restart. For persistent tracking, pipe this endpoint into a monitoring tool or replace the in-memory store with a file/database.

### `GET /health`

Simple liveness check — returns `{ "status": "ok" }`.

---

## Streaming (SSE) Integration

The `/api/chat` endpoint uses **Server-Sent Events** so text appears word-by-word in the browser instead of waiting for the full response.

### Vanilla JS example

```js
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: userInput }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop(); // keep incomplete line

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = JSON.parse(line.slice(6));

    if (payload.chunk) {
      // Append text fragment to your UI
      outputEl.textContent += payload.chunk;
    }

    if (payload.done) {
      console.log("Token usage:", payload.usage);
    }
  }
}
```

---

## Token Usage Monitoring

Every AI request records token usage in an in-memory counter maintained by `ai.service.js`.

- **Per-request** token counts are included in the SSE terminal event (`{ done: true, usage: {...} }`).
- **Cumulative** counts are exposed at `GET /api/stats`.
- **Per-request** counts also appear in the server access log:
  ```
  [2026-02-24T10:32:01.000Z] POST /api/chat 200 1847ms | tokens: prompt=112 completion=48 total=160
  ```

---

## Customising the AI Persona

Open [src/services/ai.service.js](src/services/ai.service.js) and edit the `OWNER_CONTEXT` constant.
Replace the placeholder facts with real information about James:
- Full name, role, location
- Skills and technologies
- Project names and descriptions
- Education and contact details

The assistant will only answer questions based on what you put there.

---

## Deployment

### Render

1. Push the repo to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Connect your GitHub repo.
4. Set:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
5. Add environment variables in the Render dashboard (`OPENAI_API_KEY`, `FRONTEND_URL`, etc.).
6. Deploy. Render assigns a public URL — use it as your frontend's API base.

### Railway

1. Push the repo to GitHub.
2. Create a new project on [railway.app](https://railway.app) → **Deploy from GitHub repo**.
3. Railway auto-detects Node.js and runs `npm start`.
4. Add environment variables under **Variables** in the Railway dashboard.
5. Railway provides a public domain automatically.

### Vercel (Node server mode)

1. Install the Vercel CLI: `npm i -g vercel`
2. Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

3. Deploy:

```bash
vercel --prod
```

4. Set environment variables in the Vercel dashboard or via:

```bash
vercel env add OPENAI_API_KEY
vercel env add FRONTEND_URL
```

> **Note:** Vercel Serverless has a 10-second timeout on the Hobby plan and **does not support SSE streaming**.
> Use Render or Railway for streaming support.

---

## Security Notes

- The `OPENAI_API_KEY` never leaves the server — the frontend only talks to your Express API.
- `FRONTEND_URL` restricts which origins the browser will accept responses from.
- The JSON body parser is limited to **10 KB** to prevent large-payload attacks.
- The message field is capped at **1 000 characters** in the controller.
- Rate limiting is set to **100 requests / 15 min / IP** — adjust in `chat.routes.js`.
- `trust proxy` is enabled so the rate limiter sees the real client IP behind platform proxies.
- `X-Accel-Buffering: no` header disables Nginx proxy buffering for smooth SSE delivery.

---

## License

MIT

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Customising the AI Persona](#customising-the-ai-persona)
- [Deployment](#deployment)
  - [Render](#render)
  - [Railway](#railway)
  - [Vercel (Node server mode)](#vercel-node-server-mode)
- [Security Notes](#security-notes)

---

## Tech Stack

| Layer        | Technology                    |
|-------------|-------------------------------|
| Runtime      | Node.js ≥ 18                  |
| Framework    | Express 4                     |
| AI           | OpenAI SDK v4 (or OpenRouter) |
| Config       | dotenv                        |
| CORS         | cors                          |
| Rate Limit   | express-rate-limit            |

---

## Folder Structure

```
julz-ai-assistant/
├── server.js                    # Entry point
├── package.json
├── .env.example                 # Copy to .env and fill in values
└── src/
    ├── config/
    │   └── cors.config.js       # Builds CORS options from FRONTEND_URL
    ├── controllers/
    │   └── chat.controller.js   # Request validation, calls AI service
    ├── middleware/
    │   └── error.middleware.js  # Centralised error handler
    ├── routes/
    │   └── chat.routes.js       # POST /api/chat + rate limiter
    └── services/
        └── ai.service.js        # OpenAI client + system prompt
```

---

## Getting Started

### 1 — Clone & install

```bash
git clone https://github.com/julzlalu2224/julz-ai-assistant.git
cd julz-ai-assistant
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Open .env and set OPENAI_API_KEY and FRONTEND_URL
```

### 3 — Run in development

```bash
npm run dev     # uses nodemon for auto-reload
```

### 4 — Run in production

```bash
npm start
```

The server starts on `http://localhost:3000` (or `PORT` from `.env`).

---

## Environment Variables

| Variable          | Required | Description                                              |
|-------------------|----------|----------------------------------------------------------|
| `OPENAI_API_KEY`  | ✅        | Your OpenAI (or OpenRouter) API key                     |
| `OPENAI_BASE_URL` | ❌        | Override API base URL (e.g. `https://openrouter.ai/api/v1`) |
| `OPENAI_MODEL`    | ❌        | Model name — defaults to `gpt-4o-mini`                  |
| `PORT`            | ❌        | HTTP port — defaults to `3000`                          |
| `FRONTEND_URL`    | ✅        | Allowed CORS origin(s), comma-separated                 |

### Example `.env`

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
FRONTEND_URL=https://yourportfolio.com
```

---

## API Reference

### `POST /api/chat`

Send a visitor message and receive an AI-generated reply about the portfolio owner.

**Request body**

```json
{
  "message": "What technologies does Julz work with?"
}
```

**Success response — 200**

```json
{
  "reply": "Julz works primarily with JavaScript and TypeScript across the full stack..."
}
```

**Error response — 400**

```json
{
  "error": "Request body must include a \"message\" string."
}
```

**Rate limit response — 429**

```json
{
  "error": "Too many requests — please try again in a few minutes."
}
```

#### Example curl request

```bash
curl -X POST https://your-api.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What projects has Julz built?"}'
```

### `GET /health`

Simple liveness check — returns `{ "status": "ok" }`.

---

## Customising the AI Persona

Open [src/services/ai.service.js](src/services/ai.service.js) and edit the `OWNER_CONTEXT` constant.
Replace the placeholder facts with real information about yourself:
- Name, role, location
- Skills and technologies
- Project names and descriptions
- Education and contact details

The assistant will only answer questions based on what you put there.

---

## Deployment

### Render

1. Push the repo to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Connect your GitHub repo.
4. Set:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
5. Add environment variables in the Render dashboard (`OPENAI_API_KEY`, `FRONTEND_URL`, etc.).
6. Deploy. Render assigns a public URL — use it as your frontend's API base.

### Railway

1. Push the repo to GitHub.
2. Create a new project on [railway.app](https://railway.app) → **Deploy from GitHub repo**.
3. Railway auto-detects Node.js and runs `npm start`.
4. Add environment variables under **Variables** in the Railway dashboard.
5. Railway provides a public domain automatically.

### Vercel (Node server mode)

1. Install the Vercel CLI: `npm i -g vercel`
2. Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

3. Deploy:

```bash
vercel --prod
```

4. Set environment variables in the Vercel dashboard or via:

```bash
vercel env add OPENAI_API_KEY
vercel env add FRONTEND_URL
```

> **Note:** Vercel Serverless has a 10-second timeout on the Hobby plan.
> For streaming or slow models, Render or Railway is recommended.

---

## Security Notes

- The `OPENAI_API_KEY` never leaves the server — the frontend only talks to your Express API.
- `FRONTEND_URL` restricts which origins the browser will accept responses from.
- The JSON body parser is limited to **10 KB** to prevent large-payload attacks.
- The message field is capped at **1 000 characters** in the controller.
- Rate limiting is set to **100 requests / 15 min / IP** — adjust in `chat.routes.js`.
- `trust proxy` is enabled so the rate limiter sees the real client IP behind platform proxies.

---

## License

MIT