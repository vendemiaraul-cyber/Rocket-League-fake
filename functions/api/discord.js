// Forwards messages for the Discord server to the linked Worker (see src/worker.js).
import { notLinked } from '../_link.js';

export function onRequest({ request, env }) {
  if (!env.GAME) return notLinked();
  return env.GAME.fetch(request);
}
