// Shared by the Pages Functions below. A Cloudflare Pages site can't run the multiplayer
// server itself (it needs Durable Objects), so it forwards to a Worker deployed from this repo.
// The link is a service binding named GAME that the site owner adds in the Pages dashboard;
// no address is written here, so copies of this repo are never connected to anyone's server.
export function notLinked() {
  return Response.json(
    { ok: false, platform: 'cloudflare', runtime: 'pages', reason: 'not_linked' },
    { status: 503, headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } },
  );
}
