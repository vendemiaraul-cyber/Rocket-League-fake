// A Rocket Strike match run by the server. This is the job the host's browser used to do (lobby timer,
// vote, kickoff, ball, bot, goals, clock), so the match keeps going even when the host's tab is in the
// background. It follows the same rules as hostTick / hostStartMatch / hostKickoff / hostGoal in
// public/index.html and sends the same match state ("M") the browsers already understand.
import {
  V3, Quat, makeBall, makeCar, placeCar, spawnFor, useBall, LAST, stepBall, stepCar, carBall, carPush, botThink,
  AZ, BALL_R, CAR_H,
} from './physics.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const r2 = x => Math.round(x * 100) / 100;
const r3 = x => Math.round(x * 1000) / 1000;
const BAD_CH = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u061c\\u180e\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff\\ue000-\\uf8ff]', 'g');
const cleanName = s => String(s == null ? '' : s).replace(BAD_CH, '').slice(0, 16).trim();
const num = x => (typeof x === 'number' && isFinite(x) ? x : 0);

export class Match {
  constructor(code) {
    this.M = {
      ph: 'lobby', rem: 0, lr: 30, clk: 120, sc: [0, 0], ro: [], kick: 0, gn: 0, gl: null, vr: 0, vs: 0, vw: 0, tk: 0,
      b: [0, BALL_R, 0, 0, 0, 0], bot: null, ack: [], hn: '', code, sn: [], sid: 0, ow: '', echo: [],
    };
    this.ball = makeBall();
    this.bot = makeCar(1);
    this.t = 0;
    this.startSeen = 0;
    this.hit = new Map();   // peer -> touch cooldown
    this.col = makeCar(0);  // reusable stand-in for a player's car when it touches the ball
  }

  // players: [{peer, d (their latest presence), at (ms when it arrived)}], owner: peer id
  tick(dt, players, owner, now) {
    const M = this.M;
    this.t += dt;
    useBall(this.ball);
    const ownerP = players.find(p => p.peer === owner);
    M.ow = owner || '';
    M.hn = ownerP ? cleanName(ownerP.d.nm) || 'PLAYER' : '';
    // the owner's sanctions and removals (decided in the owner's browser after a report)
    if (ownerP) {
      const d = ownerP.d;
      if (Array.isArray(d.sn)) M.sn = d.sn.filter(e => Array.isArray(e) && e.length === 3).slice(-8);
      if (typeof d.sid === 'number') M.sid = d.sid;
      if (Array.isArray(d.kick) && d.kick.length) M.ro = M.ro.filter(r => !d.kick.includes(r[0]));
      // START MATCH from the owner
      if (typeof d.st === 'number' && d.st > this.startSeen) {
        this.startSeen = d.st;
        if (M.ph === 'lobby' || M.ph === 'vote') this.start(players.map(p => p.peer));
      }
    }

    switch (M.ph) {
      case 'lobby':
        if (players.length >= 2) { M.lr -= dt; if (M.lr <= 0) { M.ph = 'vote'; M.rem = 15; M.vr++; M.vs = M.vw = 0; } }
        else M.lr = 30;
        break;
      case 'vote': {
        M.rem -= dt; let s = 0, w = 0; const voters = [];
        for (const p of players) { const v = p.d.v; if (v && v.r === M.vr) { if (v.c === 's') s++; else w++; voters.push(p.peer); } }
        M.vs = s; M.vw = w;
        if (M.rem <= 0 || (players.length && voters.length >= players.length)) {
          if (s > w) this.start(voters); else { M.ph = 'lobby'; M.lr = 30; }
        }
        break;
      }
      case 'countdown': M.rem -= dt; if (M.rem <= 0) { M.ph = 'play'; M.rem = 0; } break;
      case 'play': M.clk -= dt; if (M.clk <= 0) { M.clk = 0; M.ph = 'over'; M.rem = 8; } break;
      case 'goal': M.rem -= dt; if (M.rem <= 0) { if (M.clk <= 0) { M.ph = 'over'; M.rem = 8; } else this.kickoff(); } break;
      case 'over': M.rem -= dt; if (M.rem <= 0) { M.ph = 'lobby'; M.lr = 30; M.ro = []; this.bot.active = false; } break;
    }

    const live = M.ph === 'countdown' || M.ph === 'play' || M.ph === 'goal';
    if (live) this.physics(dt, players, now);
    else this.bot.active = false;
  }

  start(peerIds) {
    const M = this.M;
    const list = peerIds.slice(0, 6); const teams = [[], []];
    list.forEach((p, i) => teams[i % 2].push(p));
    if (teams[0].length !== teams[1].length) teams[teams[0].length < teams[1].length ? 0 : 1].push('bot');
    const ro = []; for (let t = 0; t < 2; t++) teams[t].forEach((peer, slot) => ro.push([peer, t, slot, teams[t].length]));
    M.ro = ro; M.sc = [0, 0]; M.clk = 120; M.gl = null;
    this.kickoff();
  }

  kickoff() {
    const M = this.M, B = this.ball;
    M.kick++; M.ph = 'countdown'; M.rem = 2.4; M.gl = null; LAST.touch = null;
    B.pos.set(0, BALL_R, 0); B.vel.set(0, 0, 0); B.spin.set(0, 0, 0); B.scored = false;
    const br = M.ro.find(r => r[0] === 'bot');
    if (br) { this.bot.team = br[1]; this.bot.nick = 'BOT'; const s = spawnFor(br); placeCar(this.bot, s.pos, s.yaw); this.bot.active = true; }
    else this.bot.active = false;
    this.hit.clear();
  }

  goal(team) {
    const M = this.M, lt = LAST.touch, B = this.ball;
    M.ph = 'goal'; M.rem = 4.2; M.gn++; M.sc[team]++;
    M.gl = { n: M.gn, t: team, s: Math.round(B.vel.length() * 3.6), own: lt && lt.team !== team ? 1 : 0, aer: lt && lt.aerial ? 1 : 0,
      who: lt ? cleanName(lt.name) : '', x: r2(B.pos.x), y: r2(B.pos.y) };
    B.scored = true;
  }

  physics(dt, players, now) {
    const M = this.M, B = this.ball, bot = this.bot;
    // slow motion right after a goal, like the browsers
    let ts = 1;
    if (M.ph === 'goal') { const g = 4.2 - M.rem; ts = g < 1.0 ? 0.3 : lerp(0.3, 1, sstep(1.0, 1.5, g)); }
    const sdt = dt * ts;
    // bot controls
    if (bot.active) {
      if (M.ph === 'play') botThink(bot, this.t);
      else { const bi = bot.inp; bi.throttle = M.ph === 'goal' ? 0.5 : 0; bi.steer = bi.pitch = bi.roll = 0; bi.boost = false; bi.jumpPressed = false; }
      bot.boost = Math.min(100, bot.boost + 8 * dt);   // stands in for boost pads
    }
    // where each player's car is right now: their latest update run forward by the time since they sent it
    const cars = [];
    for (const p of players) {
      const r = M.ro.find(x => x[0] === p.peer); const c = p.d.c;
      if (!r || !Array.isArray(c) || c.length < 11) continue;
      const s = c.map(num);
      const e = clamp((now - p.at) / 1000 + clamp(num(p.d.rt), 10, 600) / 2000, 0, 0.3);
      cars.push({ peer: p.peer, team: r[1], nick: cleanName(p.d.nm) || 'PLAYER',
        pos: new V3(s[0] + s[7] * e, Math.max(CAR_H, s[1] + s[8] * e), s[2] + s[9] * e),
        q: new Quat(s[3], s[4], s[5], s[6]).normalize(), vel: new V3(s[7], s[8], s[9]), grounded: !!(s[10] & 2) });
    }
    const n = Math.max(1, Math.ceil(sdt * 120)), h = sdt / n;
    const col = this.col;
    for (let i = 0; i < n; i++) {
      if (bot.active) { stepCar(bot, h); for (const c of cars) carPush(bot, { pos: tmpPos(c, i * h), vel: c.vel }); }
      if (!B.scored && M.ph !== 'countdown') {
        stepBall(h);
        if (bot.active) carBall(bot);
        for (const c of cars) {
          col.team = c.team; col.nick = c.nick; col.pos.copy(tmpPos(c, i * h)); col.q.copy(c.q); col.vel.copy(c.vel);
          col.angVel.set(0, 0, 0); col.grounded = c.grounded; col.hitCD = (this.hit.get(c.peer) || 0) - h;
          carBall(col); this.hit.set(c.peer, col.hitCD);
        }
        if (M.ph === 'play') {
          if (B.pos.z < -AZ - BALL_R) { this.goal(0); break; }
          if (B.pos.z > AZ + BALL_R) { this.goal(1); break; }
        }
      }
    }
    bot.inp.jumpPressed = false;
  }

  // the match state to send: same shape as the host browser's M
  snapshot(players, now) {
    const M = this.M, B = this.ball, bot = this.bot;
    M.tk = (M.tk + 1) % 1e6;
    M.b = [r2(B.pos.x), r2(B.pos.y), r2(B.pos.z), r2(B.vel.x), r2(B.vel.y), r2(B.vel.z)];
    M.bot = bot.active ? [r2(bot.pos.x), r2(bot.pos.y), r2(bot.pos.z), r3(bot.q.x), r3(bot.q.y), r3(bot.q.z), r3(bot.q.w),
      r2(bot.vel.x), r2(bot.vel.y), r2(bot.vel.z), (bot.boosting ? 1 : 0) | (bot.grounded ? 2 : 0)] : null;
    // echo each player's latest stamp and how long we held it, so they can measure their real round trip
    M.echo = players.filter(p => typeof p.d.ts === 'number').map(p => [p.peer, p.d.ts, Math.round(now - p.at)]);
    M.rem = r2(M.rem); M.lr = r2(M.lr); M.clk = r2(M.clk);
    return M;
  }
}
const _tp = new V3();
function tmpPos(c, t) { return _tp.copy(c.pos).addScaledVector(c.vel, t); }
