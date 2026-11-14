// Research for the in-game AI helper. Before answering, a small planner model decides whether the question needs
// research, and picks at most two jobs for "mini helpers" that run side by side:
//   code: read the parts of the game's own files that matter (how the ball, flips, netcode... really work)
//   web:  look the topic up on Wikipedia (general questions, history, how things work in the real world)
// Each mini helper reads what it found and writes short notes in plain words. The main helper then answers from
// its notes. The game shows the mini helpers working while this happens (src/worker.js streams the progress).

export const MINI_MODEL = '@cf/openai/gpt-oss-20b';
const SOURCE_RAW = 'https://raw.githubusercontent.com/vendemiaraul-cyber/Rocket-League-fake/main/';
// public/play.html is read from this Worker's own files; the rest from the public source repo.
const CODE_FILES = ['public/play.html', 'src/match.js', 'src/physics.js', 'src/worker.js', 'README.md'];
const CHUNK_LINES = 24, MAX_LINE = 360, MAX_EXCERPT = 9000;
const SKIP_LINE = /SWEAR_|SLUR_|PLACE_NEG|PLACE_SKIP|LEET=|data:image|base64,/;
const STOP = new Set('the and for with that this how does what why when where are was were you your from into game rocket strike work works working code coded about can will would which then than there their them they its it\'s'.split(' '));
const UA = 'RocketStrikeHelper/1.0 (https://github.com/vendemiaraul-cyber/Rocket-League-fake)';

export async function aiRun(env, model, messages, maxTokens) {
  try { return await env.AI.run(model, { messages, max_tokens: maxTokens, reasoning_effort: 'low' }); }
  catch (e) { return await env.AI.run(model, { messages }); }
}
export function aiText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  if (r.choices && r.choices[0] && r.choices[0].message && typeof r.choices[0].message.content === 'string') return r.choices[0].message.content;
  if (typeof r.output_text === 'string') return r.output_text;
  if (Array.isArray(r.output)) {
    const parts = [];
    for (const o of r.output) if (o && o.type === 'message' && Array.isArray(o.content)) for (const c of o.content) if (c && typeof c.text === 'string') parts.push(c.text);
    return parts.join('\n');
  }
  return '';
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

// ---- planning ----
const PLAN_SYSTEM = `You plan research for the helper inside Rocket Strike, a rocket-car football browser game.
The helper already has notes on: controls, tips, multiplayer and invite links, settings, chat rules, error messages and troubleshooting.
Decide whether answering the player's LATEST message needs research beyond those notes. Reply with JSON only, no other text:
{"tasks":[{"kind":"code"|"web","q":"search words","label":"short label"}]}
- "code": look inside the game's own source code, for questions about HOW something in the game works or is made (ball physics, flips,
  boost numbers, the bot, netcode/multiplayer sync, the server, the helper itself, a specific error). q = 3-8 words likely to appear in
  the code (for example: ball bounce gravity stepBall, flip jump dodge, snapshot interpolation websocket).
- "web": look up a general topic on Wikipedia (facts, history, science, real Rocket League, programming ideas like WebSockets or physics).
  q = a short Wikipedia search (2-5 words, in English).
- label: 2-5 words in the player's language describing the job (for example "ball physics", "history of Rocket League").
Use at most 2 tasks, and 0 tasks ({"tasks":[]}) for greetings, simple tips, controls, settings, rules or problems the notes cover.
Never plan research for unsafe, adult or hateful topics, personal information, or cheating.`;

export async function planResearch(env, msgs) {
  const recent = msgs.slice(-4).map(m => `${m.role === 'user' ? 'PLAYER' : 'HELPER'}: ${m.content.slice(0, 500)}`).join('\n');
  let r;
  try { r = await withTimeout(aiRun(env, MINI_MODEL, [{ role: 'system', content: PLAN_SYSTEM }, { role: 'user', content: recent }], 800), 15000); }
  catch (e) { return []; }
  return parsePlan(aiText(r));
}
export function parsePlan(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return [];
  let j; try { j = JSON.parse(m[0]); } catch { return []; }
  const tasks = Array.isArray(j && j.tasks) ? j.tasks : [];
  const out = [];
  for (const t of tasks) {
    if (!t || (t.kind !== 'code' && t.kind !== 'web')) continue;
    const q = String(t.q || '').replace(/[^\p{L}\p{N} _.'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    const label = String(t.label || q).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 40);
    if (q.length < 2) continue;
    out.push({ kind: t.kind, q, label: label || q });
    if (out.length === 2) break;
  }
  return out;
}

// ---- the game's code ----
let codeCache = null;   // { at, chunks:[{text, low}] }
async function loadCode(env) {
  if (codeCache && Date.now() - codeCache.at < 15 * 60 * 1000) return codeCache.chunks;
  const texts = await Promise.all(CODE_FILES.map(async f => {
    try {
      let r = null;
      if (f.startsWith('public/') && env.ASSETS) r = await env.ASSETS.fetch(new Request('https://assets.local/' + f.slice(7)));
      if (!r || !r.ok) r = await fetch(SOURCE_RAW + f, { headers: { 'user-agent': UA }, cf: { cacheTtl: 600 } });
      return r.ok ? await r.text() : '';
    } catch { return ''; }
  }));
  const chunks = [];
  texts.forEach(t => {
    const lines = t.split('\n').filter(l => !SKIP_LINE.test(l)).map(l => l.length > MAX_LINE ? l.slice(0, MAX_LINE) + '…' : l);
    for (let i = 0; i < lines.length; i += CHUNK_LINES) {
      const text = lines.slice(i, i + CHUNK_LINES).join('\n').trim();
      if (text) chunks.push({ text, low: text.toLowerCase() });
    }
  });
  if (chunks.length) codeCache = { at: Date.now(), chunks };
  return chunks;
}
const terms = q => [...new Set(String(q).toLowerCase().split(/[^a-z0-9_]+/).filter(w => w.length >= 3 && !STOP.has(w)))].slice(0, 10);
function count(hay, w) { let n = 0, i = 0; while ((i = hay.indexOf(w, i)) !== -1 && n < 6) { n++; i += w.length; } return n; }
export function pickChunks(chunks, q) {
  const ws = terms(q);
  if (!ws.length || !chunks.length) return [];
  const df = ws.map(w => chunks.reduce((n, c) => n + (c.low.includes(w) ? 1 : 0), 0));
  const scored = chunks.map((c, i) => {
    let s = 0, hit = 0;
    ws.forEach((w, k) => { const n = count(c.low, w); if (n) { hit++; s += Math.log(1 + chunks.length / df[k]) * (1 + Math.log(n)); } });
    return { i, s: s * hit };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  const out = []; let size = 0;
  for (const x of scored) {
    const t = chunks[x.i].text;
    if (size + t.length > MAX_EXCERPT) continue;
    out.push(t); size += t.length;
    if (out.length >= 6) break;
  }
  return out;
}
async function researchCode(env, task, question) {
  const chunks = pickChunks(await loadCode(env), task.q);
  if (!chunks.length) return { ok: false, notes: '' };
  const r = await aiRun(env, MINI_MODEL, [
    { role: 'system', content: 'You are a research helper for the Rocket Strike game helper. Read the excerpts of the game\'s own code and write notes (at most 130 words) that answer the research question in plain words: what happens, the numbers that matter, and how a player notices it. Do not paste code and do not mention file names, function or variable names. If the excerpts don\'t answer it, say what is missing.' },
    { role: 'user', content: `Research question: ${task.label} (${task.q})\nThe player asked: ${question.slice(0, 400)}\n\nCODE EXCERPTS:\n${chunks.map((c, i) => `--- excerpt ${i + 1} ---\n${c}`).join('\n')}` },
  ], 1000);
  const notes = aiText(r).trim().slice(0, 1500);
  return { ok: !!notes, notes };
}

// ---- Wikipedia ----
async function researchWeb(env, task, question, lang) {
  const host = `https://${/^[a-z]{2,3}$/.test(lang) ? lang : 'en'}.wikipedia.org`;
  const u = `${host}/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrlimit=3&gsrsearch=${encodeURIComponent(task.q)}` +
    '&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exlimit=3&exchars=1800';
  let pages = [];
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json' } });
    const j = r.ok ? await r.json() : null;
    pages = ((j && j.query && j.query.pages) || []).filter(p => p && p.extract).sort((a, b) => (a.index || 0) - (b.index || 0)).slice(0, 3);
  } catch { pages = []; }
  if (!pages.length) return { ok: false, notes: '', sources: [] };
  const sources = pages.map(p => ({ title: String(p.title).slice(0, 80), url: String(p.fullurl || `${host}/wiki/${encodeURIComponent(p.title)}`) }));
  const r = await aiRun(env, MINI_MODEL, [
    { role: 'system', content: 'You are a research helper for the Rocket Strike game helper. Read the Wikipedia extracts and write notes (at most 130 words) that answer the research question for a young player, in plain words. Say which article each fact comes from. Use only what the extracts say.' },
    { role: 'user', content: `Research question: ${task.label} (${task.q})\nThe player asked: ${question.slice(0, 400)}\n\n${pages.map(p => `--- Wikipedia: ${p.title} ---\n${String(p.extract).slice(0, 1800)}`).join('\n')}` },
  ], 1000);
  const notes = aiText(r).trim().slice(0, 1500);
  return { ok: !!notes, notes, sources };
}

export async function runTask(env, task, question, lang) {
  try {
    const res = await withTimeout(task.kind === 'code' ? researchCode(env, task, question) : researchWeb(env, task, question, lang), 25000);
    return { sources: [], ...res };
  } catch (e) { return { ok: false, notes: '', sources: [] }; }
}
