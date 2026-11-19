// Forwards player reports to the linked Worker, which sends them to Discord (see src/reports.js).
import { notLinked } from '../_link.js';

export function onRequest({ request, env }) {
  if (!env.GAME) return notLinked();
  return env.GAME.fetch(request);
}
