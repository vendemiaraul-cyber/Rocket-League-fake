// Rocket Strike game server for Cloudflare Workers.
//
// GET /api/health        -> {"ok":true,"platform":"cloudflare"}; the game uses this to detect the server.
// POST /api/discord     -> posts a player's message to the Discord server (webhook kept in the DISCORD_WEBHOOK secret).
// GET /ws?room=<name>    -> WebSocket into a room. "lobby" is the server list; every hosted
//                           match gets its own room named by its code (e.g. "rs-ab12cd").
// anything else          -> the static game in ./public.
//
// Each room is one Durable Object. It keeps each player's latest "presence" (car, chat, votes) and
// relays every change to the other players in the room. Match rooms (rs-...) also run the match
// itself (src/match.js): ball, bot, goals, clock, kickoff and voting, and send the match state about
// 30 times a second as a player called "srv". So no browser has to stay in front for the match to run.
import { Match } from './match.js';

const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const MAX_MSG = 16 * 1024;          // bytes per message
const MAX_PEERS = { lobby: 400, game: 12 };
const MAX_RATE = 90;                // messages per second per connection
const TICK_MS = 16, SEND_MS = 33;   // match: physics about 60 times a second, state about 30 times a second

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, platform: 'cloudflare', runtime: 'workers', match: 'server', discord: !!env.DISCORD_WEBHOOK, time: Date.now() }, {
        headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
      });
    }

    if (url.pathname === '/api/discord') return discordMessage(request, env);

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 });
      }
      const room = (url.searchParams.get('room') || '').toLowerCase();
      if (!ROOM_RE.test(room)) return new Response('Bad room name', { status: 400 });
      const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};

// ---- messages from the game to the Discord server ----
// The webhook address is a secret (Cloudflare: Worker > Settings > Variables and Secrets > DISCORD_WEBHOOK),
// so it never appears in the game's code. Players can send one message every 30 seconds.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' };
const HOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const CTRL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u061c\\u180e\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff\\ue000-\\uf8ff]', 'g');
const lastSent = new Map();
let burstStart = 0, burstCount = 0;
async function discordMessage(request, env) {
  const json = (o, status = 200) => Response.json(o, { status, headers: { ...CORS, 'cache-control': 'no-store' } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  const hook = String(env.DISCORD_WEBHOOK || '').trim();
  if (!HOOK_RE.test(hook)) return json({ ok: false, reason: 'not_set_up' }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, reason: 'bad_request' }, 400); }
  const clean = (v, n) => String(v == null ? '' : v).replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const text = clean(b && b.text, 300);
  const name = (clean(b && b.name, 16) || 'PLAYER').replace(/discord|clyde/gi, '*');
  const id = /^RS-[A-Z0-9]{6}$/.test(b && b.id) ? b.id : 'unknown';
  if (text.length < 2) return json({ ok: false, reason: 'empty' }, 400);
  const now = Date.now(), ip = request.headers.get('cf-connecting-ip') || '?';
  const last = Math.max(lastSent.get(ip) || 0, lastSent.get(id) || 0);
  if (now - last < 30000) return json({ ok: false, reason: 'slow_down', wait: Math.ceil((30000 - (now - last)) / 1000) }, 429);
  if (now - burstStart > 60000) { burstStart = now; burstCount = 0; }
  if (++burstCount > 20) return json({ ok: false, reason: 'busy' }, 429);
  lastSent.set(ip, now); if (id !== 'unknown') lastSent.set(id, now);
  if (lastSent.size > 5000) lastSent.clear();
  const from = clean(request.headers.get('origin') || '', 100).replace(/^https?:\/\//, '');
  const payload = {
    username: (name + ' · Rocket Strike').slice(0, 80),
    allowed_mentions: { parse: [] },   // no @everyone, @here or pings
    embeds: [{ description: text, color: 0xff7a1a, footer: { text: 'Player ID ' + id + (from ? ' · sent from ' + from : '') }, timestamp: new Date(now).toISOString() }],
  };
  try {
    const r = await fetch(hook + '?wait=true', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) return json({ ok: false, reason: 'discord_error', status: r.status }, 502);
  } catch { return json({ ok: false, reason: 'discord_error' }, 502); }
  return json({ ok: true });
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    // peer id -> latest presence string (already JSON). Kept in memory only: players resend
    // their presence many times a second, so nothing is lost if the object restarts.
    this.presence = new Map();
    this.parsed = new Map();   // peer -> { d: presence object, at: ms it arrived }
    this.rate = new Map();
    this.match = null; this.loop = 0; this.room = ''; this.lastStep = 0; this.lastSend = 0;
  }

  // ---- the match (rs-... rooms only) ----
  ensureLoop() {
    if (this.loop || !/^rs-/.test(this.room)) return;
    if (!this.match) this.match = new Match(this.room);
    this.lastStep = Date.now();
    this.loop = setInterval(() => this.step(), TICK_MS);
  }
  players() {
    const out = [];
    for (const ws of this.ctx.getWebSockets()) {
      const a = this.attOf(ws); if (!a) continue;
      const p = this.parsed.get(a.peer);
      out.push({ peer: a.peer, joined: a.joined || 0, d: p ? p.d : {}, at: p ? p.at : Date.now() });
    }
    return out;
  }
  step() {
    const now = Date.now();
    const ps = this.players();
    if (!ps.length) { clearInterval(this.loop); this.loop = 0; this.match = null; return; }
    const owner = ps.reduce((a, b) => (b.joined < a.joined ? b : a)).peer;
    const dt = Math.min(0.05, Math.max(0, (now - this.lastStep) / 1000)); this.lastStep = now;
    try { this.match.tick(dt, ps, owner, now); } catch (e) { console.error('match tick', e && e.stack); }
    if (now - this.lastSend >= SEND_MS) { this.lastSend = now; this.broadcast(this.srvMessage(ps, now)); }
  }
  srvMessage(ps, now) {
    const M = this.match.snapshot(ps || this.players(), now);
    return JSON.stringify({ t: 'p', peer: 'srv', d: { host: 1, srv: 1, ts: now, g: M } });
  }

  async fetch(request) {
    const url = new URL(request.url);
    const room = (url.searchParams.get('room') || '').toLowerCase();
    const limit = room === 'lobby' ? MAX_PEERS.lobby : MAX_PEERS.game;
    if (this.ctx.getWebSockets().length >= limit) {
      return new Response('Room is full', { status: 503 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const peer = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.room = room;
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer, room, joined: Date.now() });

    // Tell the newcomer who they are and who is already here, then tell everyone else.
    const peers = [];
    for (const ws of this.ctx.getWebSockets()) {
      const other = this.peerOf(ws);
      if (!other || other === peer) continue;
      peers.push({ peer: other, d: this.presence.get(other) || '{}' });
    }
    server.send(`{"t":"hello","peer":"${peer}","peers":[${peers.map(p => `{"peer":"${p.peer}","d":${p.d}}`).join(',')}]}`);
    this.broadcast(`{"t":"join","peer":"${peer}"}`, server);
    this.ensureLoop();
    if (this.match) server.send(this.srvMessage(null, Date.now()));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const peer = this.peerOf(ws);
    if (!peer) return;
    if (typeof message !== 'string' || message.length > MAX_MSG) return;
    if (!this.allow(peer)) return;

    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'p' && msg.d && typeof msg.d === 'object' && !Array.isArray(msg.d)) {
      const d = JSON.stringify(msg.d);
      this.presence.set(peer, d);
      this.parsed.set(peer, { d: msg.d, at: Date.now() });
      if (!this.room) { const a = this.attOf(ws); if (a && a.room) this.room = a.room; }
      if (!this.loop) this.ensureLoop();
      this.broadcast(`{"t":"p","peer":"${peer}","d":${d}}`, ws);
    } else if (msg.t === 'ping') {
      ws.send(`{"t":"pong","c":${Number(msg.c) || 0},"s":${Date.now()}}`);
    }
  }

  async webSocketClose(ws, code, reason) {
    this.drop(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch {}
  }

  async webSocketError(ws) {
    this.drop(ws);
  }

  drop(ws) {
    const peer = this.peerOf(ws);
    if (!peer) return;
    this.presence.delete(peer);
    this.parsed.delete(peer);
    this.rate.delete(peer);
    this.broadcast(`{"t":"leave","peer":"${peer}"}`, ws);
  }

  attOf(ws) {
    try { return ws.deserializeAttachment() || null; } catch { return null; }
  }

  peerOf(ws) {
    const a = this.attOf(ws); return a && a.peer;
  }

  allow(peer) {
    const now = Date.now();
    let r = this.rate.get(peer);
    if (!r || now - r.start >= 1000) { r = { start: now, n: 0 }; this.rate.set(peer, r); }
    r.n++;
    return r.n <= MAX_RATE;
  }

  broadcast(text, except) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(text); } catch {}
    }
  }
}
