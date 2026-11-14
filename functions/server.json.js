// Tells the game which Worker to connect to directly, so players skip the extra hop through this
// site's /ws Pages Function. Set GAME_SERVER (your Worker's address) in the Pages project's
// Settings > Variables and Secrets, then redeploy. Without it the game uses the GAME binding as before.
const RE = /^https?:\/\/[a-z0-9.-]+(:\d+)?\/?$/i;

export function onRequest({ env }) {
  let v = String((env && env.GAME_SERVER) || '').trim();
  if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
  v = v.replace(/\/+$/, '');
  if (!RE.test(v)) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return Response.json({ server: v }, { headers: { 'cache-control': 'no-store' } });
}
