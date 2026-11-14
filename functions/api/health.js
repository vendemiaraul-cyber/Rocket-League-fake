import { notLinked } from '../_link.js';

// GET /api/health on a Pages site: ask the linked Worker, or say that none is linked.
export async function onRequest({ request, env }) {
  if (!env.GAME) return notLinked();
  try {
    const res = await env.GAME.fetch(request);
    const body = await res.json();
    return Response.json({ ...body, via: 'pages' }, {
      status: res.status,
      headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' },
    });
  } catch {
    return notLinked();
  }
}
