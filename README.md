# Rocket Strike

Rocket-car football in the browser: drive, boost, jump, flip and score against a bot or other players online.
Built with three.js; multiplayer runs on Cloudflare Workers with Durable Objects.

## What's in here

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole game (one file). Plays against the bot anywhere; online play turns on when it finds the server. |
| `src/worker.js` | The multiplayer server: serves the game, answers `/api/health`, and relays players through rooms at `/ws`. |
| `wrangler.jsonc` | Cloudflare config: static assets, the `GameRoom` Durable Object and its migration. |
| `functions/` | Pages Functions: on a Cloudflare Pages site, forward `/api/health` and `/ws` to a linked Worker, or (`server.json`) send players straight to it. |
| `scripts/site-server.mjs` | Netlify build step that turns the `GAME_SERVER` setting into `public/server.json`. |
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

### Multiplayer on a Cloudflare Pages site

Pages serves the game, and the `functions/` folder forwards multiplayer to a Worker deployed from this same repo. Nothing in the code points at a specific server: each site owner links their own.

1. Deploy the Worker (steps above). Note its name, for example `rocket-strike`.
2. Open your **Pages** project → **Settings** → **Bindings** → **Add** → **Service binding**.
3. Variable name `GAME`, service: your Worker. Save.
4. Redeploy the Pages project (Deployments → latest → Retry deployment).

The game then shows "Running on Cloudflare Pages · linked to a Worker · game server online". Without the link it shows "game server not linked yet" and plays against the bot.

**Faster: connect players straight to the Worker.** With only the binding, every connection goes through this site's `/ws` Pages Function first. To skip that hop, add a variable in the Pages project → **Settings → Variables and Secrets**: `GAME_SERVER` = your Worker's address (for example `https://my-game.example.workers.dev`), then redeploy. `functions/server.json.js` hands that address to the game, which then connects directly, the same way Netlify does. The menu shows "Running on Cloudflare Pages · game server on Cloudflare Workers". Keep the binding as a fallback.

### Netlify, GitHub Pages

These serve the game page (`netlify.toml` points Netlify at `public/`; the root `index.html` forwards to `public/`) but can't run the server themselves.

**Connect a Netlify site to your Worker so players don't paste anything:**

1. In Netlify, open your project → **Project configuration → Environment variables → Add a variable**.
2. Key `GAME_SERVER`, value your Worker's address (for example `https://my-game.example.workers.dev`).
3. **Deploys → Trigger deploy → Deploy project**.

The build step (`scripts/site-server.mjs`) writes `public/server.json`, and the game uses that server by default. The address stays in your Netlify settings, not in the code. The game then shows "Running on Netlify · game server on Cloudflare Workers".

Without it, players can still join a server through **MULTIPLAYER → Game server → CHANGE** by pasting a server's address.

## Using the server from another site

Which server a player uses, first match wins: `?server=https://<worker-address>` in the page link, then a server they picked in **MULTIPLAYER → Game server → CHANGE** (saved only on their device), then the site's `server.json` (from the host's `GAME_SERVER` setting, above), then `GAME_SERVER` in `public/index.html`, then the site itself.

## Notes

- Each WebSocket message counts toward your Durable Objects usage. The free plan covers casual play; check Cloudflare's pricing page if lots of people play at once.
- Limits in `src/worker.js`: 12 players per match room, 16 KB per message, 90 messages per second per player.
