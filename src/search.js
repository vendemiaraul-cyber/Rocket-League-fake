// Web search for the helper's mini helpers, through SearXNG (a free, open metasearch engine) running on Hugging Face
// Spaces. The game asks GET /api/search?q=...; this Worker asks the SearXNG instances in turn (JSON if the instance
// allows it, otherwise it reads the normal results page), remembers which ones work, and caches answers for an hour.
// No AI is involved, so searches don't use the AI allowance. Set SEARXNG_URLS (comma-separated https addresses) in the
// Worker's variables to use your own instance first, for example your own copy ("Duplicate this Space") of one below.
const DEFAULT_INSTANCES = [
  'https://cjj-on-hf-searxng.hf.space',       // hf.co/spaces/CJJ-on-HF/SearXNG (JSON on)
  'https://underrate-searxng-public.hf.space', // hf.co/spaces/underrate/searxng-public (results page only)
];
const UA = 'RocketStrikeHelper/1.0 (+https://github.com/vendemiaraul-cyber/Rocket-League-fake)';
const down = new Map();            // instance -> time until which it's skipped after failing
const lastOk = { url: '', at: 0 };

export function instances(env) {
  const own = String((env && env.SEARXNG_URLS) || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(u => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(u));
  return [...new Set([...own, ...DEFAULT_INSTANCES])].slice(0, 5);
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const text = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
}).replace(/\s+/g, ' ').trim();
const goodUrl = u => /^https?:\/\/[^\s"<>]{3,400}$/i.test(u) && !/\.hf\.space\//i.test(u);

function fromJson(j) {
  return (Array.isArray(j && j.results) ? j.results : []).map(r => ({ title: text(r.title).slice(0, 120), url: String(r.url || ''), content: text(r.content).slice(0, 300) }));
}
// SearXNG's normal results page (simple theme): <article class="result ..."> <h3><a href="URL">TITLE</a></h3> <p class="content">…</p>
export function fromHtml(html) {
  const out = [];
  const re = /<article[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 10) {
    const a = m[1].match(/<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const c = m[1].match(/<p[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    out.push({ title: text(a[2]).slice(0, 120), url: text(a[1]), content: c ? text(c[1]).slice(0, 300) : '' });
  }
  return out;
}

async function ask(base, q, lang) {
  const qs = `q=${encodeURIComponent(q)}&language=${encodeURIComponent(lang)}&safesearch=1&categories=general`;
  const headers = { 'user-agent': UA, 'accept-language': lang + ',en;q=0.8' };
  const go = (u, accept) => fetch(u, { headers: { ...headers, accept }, signal: AbortSignal.timeout(7000), redirect: 'follow' });
  let r = await go(`${base}/search?${qs}&format=json`, 'application/json');
  if (r.ok && /json/.test(r.headers.get('content-type') || '')) return { results: fromJson(await r.json()), how: 'json' };
  r = await go(`${base}/search?${qs}`, 'text/html');
  if (r.ok && /html/.test(r.headers.get('content-type') || '')) return { results: fromHtml(await r.text()), how: 'page' };
  throw new Error('HTTP ' + r.status);
}

// -> { ok, results:[{title,url,content}], via, how }
export async function searchWeb(env, q, lang = 'en') {
  q = String(q || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  lang = /^[a-z]{2}$/.test(lang) ? lang : 'en';
  if (q.length < 2) return { ok: false, results: [], reason: 'empty' };
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`https://search-cache.local/?l=${lang}&q=${encodeURIComponent(q.toLowerCase())}`);
  if (cache) { try { const hit = await cache.match(key); if (hit) return { ...(await hit.json()), cached: true }; } catch {} }
  const now = Date.now();
  const list = instances(env);
  const order = [...list.filter(u => !(down.get(u) > now)), ...list.filter(u => down.get(u) > now)];
  for (const base of order.slice(0, 3)) {
    try {
      const { results, how } = await ask(base, q, lang);
      const clean = results.filter(r => r.title && goodUrl(r.url)).slice(0, 6);
      if (!clean.length) throw new Error('no results');
      down.delete(base); lastOk.url = base; lastOk.at = now;
      const out = { ok: true, results: clean, via: new URL(base).host, how };
      if (cache) { try { await cache.put(key, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=3600' } })); } catch {} }
      return out;
    } catch (e) { down.set(base, now + 10 * 60 * 1000); }
  }
  return { ok: false, results: [], reason: 'no_engine' };
}

// For "see what works": asks every instance once and says how each one answered.
export async function testInstances(env) {
  const out = [];
  await Promise.all(instances(env).map(async base => {
    const t0 = Date.now();
    try { const { results, how } = await ask(base, 'rocket league', 'en'); out.push({ host: new URL(base).host, ok: results.length > 0, how, results: results.length, ms: Date.now() - t0 }); }
    catch (e) { out.push({ host: new URL(base).host, ok: false, error: String(e && e.message || e).slice(0, 80), ms: Date.now() - t0 }); }
  }));
  return out.sort((a, b) => (b.ok - a.ok) || a.ms - b.ms);
}
