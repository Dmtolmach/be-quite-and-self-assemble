  // ---------- during a game: race against your own best run (the ghost 👻 on the score band) ----------

  // (2) the ghost: your best run in this game, replayed beside you. Saved when you set a new personal best.
  // Only games whose goal is the same every time (ice, liquids, gel): the drug game draws new red windows each time.
  const GHOST_GAMES = ['ice', 'demix', 'gel'];
  function ghostLoad(g) { if (!GHOST_GAMES.includes(g.id)) return null;
    try { const o = JSON.parse(localStorage.getItem('mdlab-ghost-' + g.id) || 'null'); return o && o.r && o.r.length > 8 ? o : null; } catch (e) { return null; } }
  function ghostSave(G) { const g = G.g; if (!GHOST_GAMES.includes(g.id) || !G.rec || G.rec.length < 8) return;
    try { localStorage.setItem('mdlab-ghost-' + g.id, JSON.stringify({ v: G.peak, st: starsFor(g, G.peak), r: G.rec.map((q) => [+q.s.toFixed(2), +q.T.toFixed(3), +q.v.toFixed(4)]) })); } catch (e) {} }
  function ghostAt(gh, s) { const r = gh.r; let i = 0; while (i < r.length - 1 && r[i + 1][0] <= s) i++; return r[i]; }
  function ghostTick() {
    const G = game, sm = $('ghostS');
    const gh = G && !G.g.proto && !G.speed && !G.level && !battle && !classOn && !G.guided && $('gghostOn').checked && optOpen('ghost') ? G.ghost : null;
    if (!gh) { if (!sm.hidden) sm.hidden = true; return; }
    const g = G.g, s = G.cd ? 0 : GAME_SEC * Math.min(1, (eng.time - G.t0) / g.D), vg = ghostAt(gh, s)[2];
    sm.hidden = false; sm.style.left = (100 * Math.max(0, Math.min(1, vg / (g.scale || 1)))) + '%'; // your best run's score at this second
  }
  setInterval(ghostTick, 120);
