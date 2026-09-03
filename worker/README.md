# portfolio-chat worker

Gemini proxy for the chat widget on the portfolio site. Exists for one reason:
**the API key must not be in the static site.** GitHub Pages serves every file
publicly, and leaked keys get scraped and abused within hours.

```
browser  ──POST──▶  this Worker  ──x-goog-api-key──▶  Gemini API
                    (key = secret)
```

## Deploy

1. **Gemini key** — https://aistudio.google.com/apikey → Create API key.
   Free tier, Google account only, no card.

2. **Cloudflare account** — https://dash.cloudflare.com/sign-up.
   Workers free tier, no card.

3. **Deploy:**
   ```bash
   npm install -g wrangler
   cd worker
   wrangler login
   wrangler secret put GEMINI_API_KEY     # paste the key when prompted
   wrangler deploy
   ```
   Note the URL it prints, e.g. `https://portfolio-chat.<subdomain>.workers.dev`.

4. **Point the site at it** — in `../chat.js`:
   ```js
   const CHAT_ENDPOINT = 'https://portfolio-chat.<subdomain>.workers.dev';
   ```
   Commit and push. Done.

## Notes

- Until `CHAT_ENDPOINT` is set the widget runs offline, answering from
  `LOCAL_KB` in `chat.js`. It also falls back there if the Worker errors, so
  the site never shows a dead chat box.
- `ALLOWED_ORIGINS` blocks other websites from embedding the endpoint. It does
  **not** stop `curl` — CORS is browser-side only. The real caps are the
  500-char message limit, the 8-turn history limit, and Gemini's free-tier
  quota. Worst case someone burns the daily quota and the widget falls back to
  offline answers. **Do not enable Gemini paid billing on this key** — free
  tier means an abused endpoint costs nothing.
- Gemini free-tier requests may be used by Google to improve their models.
  Everything sent here is already public portfolio text, so this is fine, but
  do not extend the prompt with anything private.
- Edit the `PROFILE` block in `worker.js` to change what the assistant knows.
  Keep `LOCAL_KB` in `chat.js` roughly in sync.
- `MODEL` is a constant at the top of `worker.js`; change it if Google renames
  the free-tier model.
