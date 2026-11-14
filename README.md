# Rocket Strike

Rocket-car football in the browser: drive, boost, jump, flip and score against a bot or other players online.
Built with three.js; multiplayer runs on Cloudflare Workers with Durable Objects.

## What's in here

| Path | What it is |
| --- | --- |
| `public/index.html` | The main page: what the game is, how to play with friends online and through invite links, and the PLAY button. Shows whether the game server is online and how many matches are open, and links to the live Cloudflare and Netlify sites (change those in your own copy). |
| `public/play.html` | The whole game (one file). Plays against the bot anywhere; online play turns on when it finds the server. |
| `src/worker.js` | The multiplayer server: serves the game, answers `/api/health`, relays players through rooms at `/ws`, and runs each match. |
| `src/match.js`, `src/physics.js` | The match the server runs (lobby, vote, kickoff, ball, bot, goals, clock) and its physics, copied from the game. |
| `wrangler.jsonc` | Cloudflare config: static assets, the `GameRoom` Durable Object and its migration. |
| `functions/` | Pages Functions: on a Cloudflare Pages site, forward `/api/health` and `/ws` to a linked Worker, or (`server.json`) send players straight to it. |
| `scripts/site-server.mjs` | Netlify build step that turns the `GAME_SERVER` setting into `public/server.json`. |
| `netlify.toml`, `index.html` | Let Netlify, Cloudflare Pages and GitHub Pages serve the game page. |

## How multiplayer works

- The game shows where it's hosted (Cloudflare Workers, Cloudflare Pages, Netlify, Vercel, GitHub Pages, local…), from the address or, on a custom domain, from the page's response headers.
- When the page opens it asks `/api/health`. If the answer says `"platform": "cloudflare"`, the MULTIPLAYER button connects; otherwise the game stays in bot-only mode.
- Every room is one Durable Object. `lobby` is the server list; each hosted match gets its own room named after its code (for example `rs-ab12cd`).
- Each player sends their state (car, chat, votes) about 30 times a second over a WebSocket, and the room relays it to everyone else.
- **The server runs the match.** Each match room's Durable Object runs the lobby timer, vote, kickoff, ball, bot, goals and clock (`src/match.js`, with the physics in `src/physics.js` copied from the game) and sends the match state about 30 times a second. No browser has to stay in front, so the host can switch tabs and the match goes on. The host only has the START MATCH button and decides reports; those decisions go to the server.
- **Away players never block play.** If a player's tab is hidden, goes quiet for 1.5 s, or they leave mid-match, their car is taken off the field until they're back. The host can switch on **AUTOPILOT** in the lobby (off by default); then the server drives away players' cars with the bot's AI (shown as "NAME · AUTO") and they take over from where the car is when they return.
- Players drive their own car and send where it is; the server lets those cars touch its ball. On each player's screen the ball is the server's ball run forward by the measured delay and replayed with their own car's recent path, so their touches show right away and match what the server decides. Other cars and the bot are shown a moment in the past and glide between updates.
- With an older Worker that doesn't run matches (`/api/health` without `"match": "server"`), the host's browser runs the match as before.
- **Invite links:** in the lobby, COPY INVITE LINK gives `play.html?join=<code>` (plus `&server=` when the server isn't the site itself). Opening it joins that match as soon as the server list loads.
- In the lobby everyone's car is parked next to yours with their name, and the host is marked HOST (also on their name tag during the match).
- **Settings** (menu → SETTINGS): Join our Discord server; graphics (quality, resolution, glow, FPS counter, saved in the browser); Custom server (paste a server link, or run the matches you host on your own device, `rd-…` rooms, with customs: match length, players, bot, unlimited boost); Proof (what the game does and every link it uses).
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

## Messages to Discord

Settings → Community has **Send a message to Discord directly here**. The game posts to `/api/discord` on the game server, and the Worker forwards it to a Discord webhook with the player's name and anonymous player ID (`RS-XXXXXX`, kept in their browser). To turn it on:

1. In Discord: **Edit Channel → Integrations → Webhooks → New Webhook**, pick the channel, **Copy Webhook URL**.
2. In Cloudflare: your Worker → **Settings → Variables and Secrets → Add**, type **Secret**, name `DISCORD_WEBHOOK`, paste the URL, save.

The webhook stays secret (it's never in the code). Limits: 300 characters, one message every 30 seconds per player, about 20 a minute in total, no @everyone/@here pings, and the game's swear filter runs first. `/api/health` reports `"discord": true` when it's set up.

## Notes

- Each WebSocket message counts toward your Durable Objects usage. The free plan covers casual play; check Cloudflare's pricing page if lots of people play at once.
- Limits in `src/worker.js`: 12 players per match room, 16 KB per message, 90 messages per second per player.
