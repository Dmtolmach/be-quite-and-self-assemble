  // ---------- class battle: teams take turns on the same game from the same start; highest score wins ----------
  function battleShow(msg, cls, go, stop) { coachSay(msg, cls); const b = $('coachBtn'), k = $('coachSkip'); b.hidden = false; b.textContent = go; k.hidden = false; k.textContent = stop; }
  function battleTable() {
    const b = battle, best = Math.max(...b.scores.map((x) => x.v));
    return '<table class="btable"><tbody>' + b.scores.map((x, i) => `<tr class="${b.done && x.v === best ? 'win' : ''}"><td>${b.done && x.v === best ? '🏆 ' : ''}${T('Team {n}', { n: i + 1 })}</td><td>${b.g.fmt(x.v)}</td><td>${starStr(x.st)}</td></tr>`).join('') +
      Array.from({ length: b.n - b.scores.length }, (_, i) => `<tr class="todo"><td>${T('Team {n}', { n: b.scores.length + i + 1 })}</td><td>–</td><td></td></tr>`).join('') + '</tbody></table>';
  }
  function battleStart() {
    if (!gameSel) return; if (game) endGame(null);
    gameLevel = 0; battle = { n: +$('bTeams').value, g: gameSel, seed: 1 + ((Math.random() * 1e9) | 0), scores: [], k: 0, done: false };
    if (typeof sheet === 'function') sheet(false); $('greplay').hidden = true; $('gres').innerHTML = ''; $('ghud').hidden = true;
    battleShow(T('Class battle: {n} teams. Team 1, get ready!', { n: battle.n }), 'guide', T('Start'), T('End battle')); syncBoxStart();
  }
  function battleGo() {
    if (battle.done) { const n = battle.n; battle = null; $('bTeams').value = n; battleStart(); return; }
    coachHide(); battle.keep = true; startGame(); battle.keep = false;
  }
  function battleEnd(G) {
    const g = G.g, st = starsFor(g, G.peak); battle.scores.push({ v: G.peak, st }); battle.k++;
    $('hudGoal').textContent = $('hudTip').textContent = ''; $('gagain').hidden = true;
    if (G.snap) { restoreSnap(G.snap); running = false; $('pause').textContent = T('Resume'); showReport(report()); }
    if (battle.k >= battle.n) { battle.done = true; const best = Math.max(...battle.scores.map((x) => x.v)), w = battle.scores.map((x, i) => (x.v === best ? i + 1 : 0)).filter(Boolean);
      $('gres').innerHTML = battleTable();
      salute(w.length > 1 ? T('A draw between {t}!', { t: w.map((n) => T('Team {n}', { n })).join(', ') }) : T('Team {n} wins!', { n: w[0] }));
      battleShow(w.length > 1 ? T('A draw between {t}!', { t: w.map((n) => T('Team {n}', { n })).join(', ') }) : T('Team {n} wins!', { n: w[0] }), 'good', T('New battle'), T('Close')); }
    else { $('gres').innerHTML = battleTable(); battleShow(T('Team {n}, get ready!', { n: battle.k + 1 }), 'guide', T('Start'), T('End battle')); }
    drawReplay(G);
  }
  // the winner's salute: fireworks over the box and the winning words in rainbow letters (about 6 s; text only with reduced motion)
  function salute(text) {
    const o = gfxShow(); clearTimeout(cdTimer); SFX.fanfare();
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    o.innerHTML = (calm ? '' : '<canvas class="salute"></canvas>') + `<span class="saltxt">${text.split(' ').map((w, j, a) => `<b>${[...w].map((c, i) => `<i style="--i:${a.slice(0, j).join('').length + i + j}">${c}</i>`).join('')}</b>`).join(' ')}</span>`;
    cdTimer = setTimeout(() => { o.hidden = true; o.innerHTML = ''; }, calm ? 3500 : 6500); if (calm) return;
    const c = o.querySelector('canvas'), g = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = (c.width = Math.max(1, o.clientWidth * dpr)), H = (c.height = Math.max(1, o.clientHeight * dpr)), S = Math.min(W, H) / 400;
    const rockets = [], sparks = [], t0 = performance.now(); let last = t0, nextAt = 0, n = 0;
    function launch() { const hue = (n * 67 + 360 * Math.random()) % 360; n++;
      rockets.push({ x: W * (0.12 + 0.76 * Math.random()), y: H, vx: (Math.random() - 0.5) * 60 * S, vy: -(330 + 120 * Math.random()) * S, top: H * (0.12 + 0.3 * Math.random()), hue }); SFX.whistle(); }
    function explode(r) { SFX.bang(); const k = 70 + ((40 * Math.random()) | 0), two = Math.random() < 0.4, ring = Math.random() < 0.3;
      for (let i = 0; i < k; i++) { const a = (2 * Math.PI * i) / k + 0.05 * Math.random(), v = (ring ? 150 : 40 + 140 * Math.random()) * S;
        sparks.push({ x: r.x, y: r.y, vx: v * Math.cos(a), vy: v * Math.sin(a), life: 1, fade: 0.45 + 0.35 * Math.random(), hue: two && i % 2 ? (r.hue + 150) % 360 : r.hue + 20 * (Math.random() - 0.5), tw: Math.random() < 0.3 }); } }
    function frame(now) {
      if (!c.isConnected) return; const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
      if (t < 4.8 && t >= nextAt) { launch(); if (Math.random() < 0.35) launch(); nextAt = t + 0.28 + 0.3 * Math.random(); }
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.vy += 120 * S * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        g.fillStyle = `hsl(${r.hue},100%,75%)`; g.beginPath(); g.arc(r.x, r.y, 2.6 * S, 0, 7); g.fill();
        if (r.y <= r.top || r.vy >= 0) { explode(r); rockets.splice(i, 1); } }
      for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i], d = Math.exp(-1.6 * dt); p.vx *= d; p.vy = p.vy * d + 70 * S * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.fade * dt;
        if (p.life <= 0) { sparks.splice(i, 1); continue; } if (p.tw && Math.random() < 0.3) continue;
        g.fillStyle = `hsla(${p.hue},100%,${55 + 25 * p.life}%,${Math.min(1, 1.5 * p.life)})`; g.beginPath(); g.arc(p.x, p.y, (1 + 1.8 * p.life) * S, 0, 7); g.fill(); }
      if (t < 6.5) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  window.__salute = salute; // for tests
  function battleStop() { if ($('gfx').querySelector('.saltxt')) { clearTimeout(cdTimer); $('gfx').hidden = true; $('gfx').innerHTML = ''; } battle = null; coachHide(); syncBoxStart(); }
  $('bStart').addEventListener('click', battleStart);

