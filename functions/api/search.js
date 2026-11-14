// Forwards the mini helpers' web search to the linked Worker (see src/worker.js and src/search.js).
import { notLinked } from '../_link.js';

export function onRequest({ request, env }) {
  if (!env.GAME) return notLinked();
  return env.GAME.fetch(request);
}
