# Rocket Strike

Rocket-car football in the browser: drive, boost, jump, flip and score against a bot or other players online.
Built with three.js; multiplayer runs on Cloudflare Workers with Durable Objects.

## What's in here

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole game (one file). Plays against the bot anywhere; online play turns on when it finds the server. |
| `src/worker.js` | The multiplayer server: serves the game, answers `/api/health`, and relays players through rooms at `/ws`. |
| `wrangler.jsonc` | Cloudflare config: static assets, the `GameRoom` Durable Object and its migration. |
| `netlify.toml`, `index.html` | Let Netlify, Cloudflare Pages and GitHub Pages serve the game page. |

## How multiplayer works

- The game shows where it's hosted (Cloudflare Workers, Cloudflare Pages, Netlify, Vercel, GitHub Pages, local…), from the address or, on a custom domain, from the page's response headers.
- When the page opens it asks `/api/health`. If the answer says `"platform": "cloudflare"`, the MULTIPLAYER button connects; otherwise the game stays in bot-only mode.
- Every room is one Durable Object. `lobby` is the server list; each hosted match gets its own room named after its code (for example `rs-ab12cd`).
- Each player sends their state (car, chat, votes) about 30 times a second over a WebSocket, and the room relays it to everyone else. The host's browser is the referee for the ball, score, clock and reports.
- No accounts: anyone who opens the link can host or join. Names, strikes and suspensions are stored in each player's browser.

## Deploy on Cloudflare

### From the dashboard (connect this GitHub repo)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**, and pick this repo.
2. Leave the build command empty and keep the deploy command `npx wrangler deploy`.
3. Deploy. The game is live at `https://rocket-strike.<your-subdomain>.workers.dev`, and every push to `main` redeploys it.

### From your computer

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Run it locally with `npx wrangler dev` and open http://localhost:8787 in two tabs to test multiplayer.

### Cloudflare Pages, Netlify, GitHub Pages

These serve the game page (the root `index.html` forwards to `public/`, and `netlify.toml` points Netlify at `public/`), but they can't run the multiplayer server. The game shows where it's running ("Running on Cloudflare Pages", "Running on Netlify"…) and stays bot-only there until it's pointed at a Worker (see below). For online play, deploy the repo as a **Worker** as described above.

## Using the server from another site

If the game page is hosted somewhere else, point it at your Worker by setting `GAME_SERVER` near the networking section of `public/index.html`, or open the page with `?server=https://rocket-strike.<your-subdomain>.workers.dev`.

## Notes

- Each WebSocket message counts toward your Durable Objects usage. The free plan covers casual play; check Cloudflare's pricing page if lots of people play at once.
- Limits in `src/worker.js`: 12 players per match room, 16 KB per message, 90 messages per second per player.
