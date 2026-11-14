// Rocket Strike game server for Cloudflare Workers.
//
// GET /api/health        -> {"ok":true,"platform":"cloudflare"}; the game uses this to detect the server.
// GET /ws?room=<name>    -> WebSocket into a room. "lobby" is the server list; every hosted
//                           match gets its own room named by its code (e.g. "rs-ab12cd").
// anything else          -> the static game in ./public.
//
// Each room is one Durable Object. It does not run the game: the host's browser is the referee.
// The room keeps each player's latest "presence" (car, chat, votes, the host's match state)
// and relays every change to the other players in the room.

const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const MAX_MSG = 16 * 1024;          // bytes per message
const MAX_PEERS = { lobby: 400, game: 12 };
const MAX_RATE = 90;                // messages per second per connection

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, platform: 'cloudflare', runtime: 'workers', time: Date.now() }, {
        headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
      });
    }

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

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    // peer id -> latest presence string (already JSON). Kept in memory only: players resend
    // their presence many times a second, so nothing is lost if the object restarts.
    this.presence = new Map();
    this.rate = new Map();
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
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peer });

    // Tell the newcomer who they are and who is already here, then tell everyone else.
    const peers = [];
    for (const ws of this.ctx.getWebSockets()) {
      const other = this.peerOf(ws);
      if (!other || other === peer) continue;
      peers.push({ peer: other, d: this.presence.get(other) || '{}' });
    }
    server.send(`{"t":"hello","peer":"${peer}","peers":[${peers.map(p => `{"peer":"${p.peer}","d":${p.d}}`).join(',')}]}`);
    this.broadcast(`{"t":"join","peer":"${peer}"}`, server);

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
    this.rate.delete(peer);
    this.broadcast(`{"t":"leave","peer":"${peer}"}`, ws);
  }

  peerOf(ws) {
    try { const a = ws.deserializeAttachment(); return a && a.peer; } catch { return null; }
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
