// Build step for static hosts (Netlify and similar).
// If the GAME_SERVER environment variable is set in the host's settings, this writes
// public/server.json so every player on that site uses that game server automatically.
// The address lives only in the host's settings, never in the code.
import { writeFileSync, rmSync } from 'node:fs';

const RE = /^https?:\/\/[a-z0-9.-]+(:\d+)?\/?$/i;
const out = new URL('../public/server.json', import.meta.url);
let v = (process.env.GAME_SERVER || '').trim();
if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
v = v.replace(/\/+$/, '');

if (!v) {
  rmSync(out, { force: true });
  console.log('GAME_SERVER is not set: players use this site\'s server or pick one in the game.');
} else if (!RE.test(v)) {
  console.error('GAME_SERVER must be just the server address, like https://my-game.example.workers.dev');
  process.exit(1);
} else {
  writeFileSync(out, JSON.stringify({ server: v }) + '\n');
  console.log('Default game server for this site: ' + v);
}
