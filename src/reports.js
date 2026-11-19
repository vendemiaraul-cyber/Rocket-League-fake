// Player reports -> your Discord server, through a Discord webhook. The webhook's address is a secret: it lives
// only in the Worker's settings (REPORT_WEBHOOK, added as a secret in the Cloudflare dashboard), never in the code.
// The game posts a report (POST /api/report) after its own checks; the server only forwards it when both players
// are really in that match right now, takes their names from what the room itself sees, and rate-limits per player,
// so the webhook can't be used to spam your server.
const REASON = { cheat: 'Cheating', chat: 'Offensive chat', name: 'Offensive name', grief: 'Griefing', spam: 'Spam', other: 'Something else' };
const ACTION = { cheat: 'removed and suspended for unnatural movement', slur: 'given two strikes for a slur', chat: 'given a chat strike', warn: 'warned for putting down a country' };
const CTRL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]', 'g');
// plain text for Discord: no control characters, no mentions or links that ping or preview, markdown escaped
export function safe(s, n) {
  return String(s == null ? '' : s).replace(CTRL, ' ').replace(/https?:\/\/\S+/gi, '[link]').replace(/@/g, '@​')
    .replace(/([\\*_~`|>#\[\]()])/g, '\\$1').replace(/\s+/g, ' ').trim().slice(0, n);
}
const seen = new Map();    // ip -> [times]
let hourStart = 0, hourCount = 0;

export async function report(request, env, CORS) {
  const json = (o, status = 200) => Response.json(o, { status, headers: { ...CORS, 'cache-control': 'no-store' } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
  if (!env.REPORT_WEBHOOK || !/^https:\/\/(discord\.com|discordapp\.com|canary\.discord\.com|ptb\.discord\.com)\/api\/webhooks\//.test(env.REPORT_WEBHOOK))
    return json({ ok: false, reason: 'not_set_up' }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, reason: 'bad_request' }, 400); }
  const room = String((b && b.room) || '').toLowerCase(), from = String(b.from || ''), target = String(b.target || '');
  if (!/^r[sd]-[a-z0-9]{3,12}$/.test(room) || !/^[a-f0-9]{12}$/.test(from) || !/^[a-f0-9]{12}$/.test(target) || from === target)
    return json({ ok: false, reason: 'bad_request' }, 400);
  // rate limits: per player 1 report every 15 s and 8 an hour (host actions: 16 an hour); 60 an hour overall
  const now = Date.now(), ip = request.headers.get('cf-connecting-ip') || '?';
  const isAction = b.kind === 'action';
  const list = (seen.get(ip) || []).filter(t => now - t < 3600000);
  if (!isAction && list.length && now - list[list.length - 1] < 15000) return json({ ok: false, reason: 'slow_down' }, 429);
  if (list.length >= (isAction ? 16 : 8)) return json({ ok: false, reason: 'too_many' }, 429);
  if (now - hourStart > 3600000) { hourStart = now; hourCount = 0; }
  if (hourCount >= 60) return json({ ok: false, reason: 'busy' }, 429);
  // both players must be in that match right now; names come from the room, not from the request
  let peers = [];
  try {
    const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
    const r = await stub.fetch(new Request('https://room.internal/internal/peers?room=' + encodeURIComponent(room)));
    peers = r.ok ? (await r.json()).peers || [] : [];
  } catch { peers = []; }
  // (for a host action the reported player may already have been removed, so players who left in the last 2 minutes count)
  const A = peers.find(p => p.peer === from && !p.left), T = peers.find(p => p.peer === target && (!p.left || isAction));
  if (!A || !T) return json({ ok: false, reason: 'not_in_match' }, 403);
  list.push(now); seen.set(ip, list); hourCount++; if (seen.size > 5000) seen.clear();

  const nmA = safe(A.nm || 'Player', 16) || 'Player', nmT = safe(T.nm || 'Player', 16) || 'Player';
  const site = safe(String(b.site || '').replace(/^https?:\/\//, ''), 60);
  let payload;
  if (isAction) {     // the host's game confirmed a report and acted on it
    const act = ACTION[b.action];
    if (!act) return json({ ok: false, reason: 'bad_request' }, 400);
    payload = { embeds: [{ color: 0x59e09a, title: `✅ ${nmT} was ${act}`, description: `Confirmed by the host's game (host: ${nmA}) · match \`${room}\``, timestamp: new Date(now).toISOString(), footer: { text: 'Rocket Strike · ' + (site || 'game') } }] };
  } else {
    const reasons = (Array.isArray(b.reasons) ? b.reasons : []).filter(r => REASON[r]).slice(0, 6);
    if (!reasons.length) return json({ ok: false, reason: 'bad_request' }, 400);
    const c = b.checks && typeof b.checks === 'object' ? b.checks : {};
    const lines = [];
    const LV = { high: 'UNNATURAL', low: 'inconclusive', ok: 'looks normal', nodata: 'not enough data' };
    if (c.cheat) lines.push(`Movement: **${LV[c.cheat.level] || 'unknown'}**` + (c.cheat.top ? ` · top speed ${Math.round(+c.cheat.top || 0)} km/h` : '') +
      (c.cheat.teleport ? ` · ${+c.cheat.teleport || 0} teleports` : '') + (c.cheat.flying ? ` · ${+c.cheat.flying || 0} flying` : ''));
    if (c.chat) lines.push(`Chat: ${+c.chat.slurs || 0} slurs, ${+c.chat.strong || 0} swears, ${+c.chat.insults || 0} put-downs, ${+c.chat.total || 0} messages checked` + (c.chat.spam ? ' · **flooding**' : ''));
    if (Array.isArray(c.flagged)) for (const f of c.flagged.slice(0, 3)) lines.push(`> ${safe(f, 90)}`);
    if (c.name) lines.push(`Name: ${c.name === 3 ? '**slur**' : c.name === 2 ? '**breaks the rules**' : 'looks fine'}`);
    const bad = (c.cheat && c.cheat.level === 'high') || (c.chat && (c.chat.slurs || c.chat.strong || c.chat.spam)) || c.name >= 2;
    const fields = [
      { name: 'Reported by', value: nmA, inline: true },
      { name: 'Match', value: '`' + room + '`', inline: true },
      { name: 'Reasons', value: reasons.map(r => REASON[r]).join(', ') },
    ];
    if (lines.length) fields.push({ name: "Automatic checks (on the reporter's device)", value: lines.join('\n').slice(0, 1000) });
    const note = safe(b.note, 200);
    if (note) fields.push({ name: 'Note', value: note });
    payload = { embeds: [{ color: bad ? 0xff3b4a : 0xffae42, title: `🚩 ${nmT} was reported`, fields, timestamp: new Date(now).toISOString(),
      footer: { text: 'Rocket Strike · ' + (site || 'game') + (bad ? ' · the game found something' : ' · nothing found automatically') } }] };
  }
  payload.username = 'Rocket Strike Reports';
  payload.allowed_mentions = { parse: [] };
  try {
    const r = await fetch(env.REPORT_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) { console.error('report webhook', r.status); return json({ ok: false, reason: r.status === 429 ? 'busy' : 'webhook_error' }, 502); }
  } catch (e) { console.error('report webhook', e && e.message); return json({ ok: false, reason: 'webhook_error' }, 502); }
  return json({ ok: true });
}
