import { notLinked } from './_link.js';

// /ws on a Pages site: hand the WebSocket straight to the linked Worker.
export async function onRequest({ request, env }) {
  if (!env.GAME) return notLinked();
  return env.GAME.fetch(request);
}
