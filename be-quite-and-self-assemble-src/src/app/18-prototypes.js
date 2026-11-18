  // ---------- prototype games (switched on in Teacher options) ----------
  // Ideas to try with a class before they become real games: many small goals instead of one 30-second score, a moving target to follow,
  // levels that speed up during the run, lives and combos, the same start every time (fixed seed), and more feedback for every success.
  const PROTOS = [
    { id: 'p-stream', proto: true, seed: 20261116, title: 'Micelle stream', sub: 'Drug · dose after dose, 3 lives', sys: 'dumbbell', ordered: true, range: [0.4, 5.0], box: '48', conc: 34,
      prm: { nDrug: 20, drugPerMic: 5, extraTails: 3, preSteps: 1000, epsDB: 2.5, epsBB: 2.5, epsAS: 0, sigA: 1.0, drugXs: [3, 18.5, 34, 49.5].map((d) => DRUG_X0 - d) },
      flowU: 0.8, bandW: 9, spill: 0.39, hotT: 2.5, rate: 2, D: 1e9, raw: true, noSnap: true, lab: 'Score', fmt: (v) => String(Math.round(v)), stars: [20, 40, 60], scale: 90, lvlLab: 'Level',
      how: 'Heat the red zone while a micelle passes: every dose delivered scores, in a row they score more. Drug freed outside the zone while you heat is wasted; every 4 wasted doses cost a life.',
      pstart(G) { G.pc = new Float32Array(eng.N); G.del = 0; G.lost = 0; G.left = 20; },
      level(G, l) { eng.p.flowU = this.flowU * (1 + 0.12 * (l - 1)); if (eng.p.hotBand) eng.p.hotBand.w = Math.max(6, this.bandW * (1 - 0.07 * (l - 1))); G.spill = this.spill + 0.03 * (l - 1); setT(tset); },
      tick(G, s, dts) { // a drug counts once it has had fewer than 2 tail neighbours for 1 time unit
        const r = eng.drugStats(1.5, 2), [lo, hi] = this.range, heating = tset > lo + 0.2 * (hi - lo), L = eng.L; let good = 0, gx = 0, gy = 0, bad = 0, bx = 0, by = 0, left = 0;
        for (let i = 0; i < eng.N; i++) { if (eng.type[i] !== 4) continue; G.pc[i] = r.cnt[i] < 2 ? G.pc[i] + dts * G.rate : 0;
          if (G.pc[i] < 1) { left++; continue; } G.pc[i] = 0; const x = eng.x[i], y = eng.y[i];
          if (inTumour(x)) { eng.type[i] = 3; good++; gx += x; gy += y; } else { eng.type[i] = 6; if (heating) { bad++; bx += x; by += y; } } } // a leak while it is quiet is not the player's fault
        if (good) { G.del += good; gain(G, good, 1, gx / good / L, gy / good / L); }
        if (bad) { G.lost += bad; G.waste = (G.waste || 0) + bad; fxText(G, '−' + bad, bx / bad / L, by / bad / L, 'bad'); SFX.miss(); if (G.waste >= 4) { G.waste = 0; loseLife(G, bx / bad / L, by / bad / L); } } // every 4 doses wasted cost a life
        G.left = left; },
      over(G) { if (G.left === 0) { G.why = T('All doses used.'); return true; } return false; } },
    { id: 'p-line', proto: true, seed: 20261117, title: 'Follow the line', sub: 'Ice · stay inside the moving band', sys: 'ice', ordered: false, range: [0.02, 0.30], rate: 5, D: 1e9, raw: true, noSnap: true,
      lab: 'Score', fmt: (v) => String(Math.round(v)), stars: [400, 1200, 2500], scale: 3000, lvlLab: 'Level', alwaysZone: true, zoneLive: (G) => (G && G.band ? G.band : null),
      how: 'Keep the temperature inside the green band as it moves. Seconds inside score, more with more ice and a longer streak. Outside, the focus bar empties; when it is empty you lose a life.',
      pstart(G) { G.ph = 0; G.focus = 1; G.streak = 0; G.band = this.bandAt(G); },
      bandAt(G) { const w = Math.max(0.03, 0.07 * (1 - 0.1 * (G.lvl - 1))), c = 0.15 + 0.06 * Math.sin(0.18 * G.ph) + 0.035 * Math.sin(0.45 * G.ph + 1.1); /* slow enough to follow with the voice (about 0.7 s lag) */ return [c - w / 2, c + w / 2]; },
      tick(G, s, dts, v) {
        G.ph += dts * (1 + 0.12 * (G.lvl - 1)); G.band = this.bandAt(G); if (G.cnt === undefined) G.cnt = 0;
        const inside = tset >= G.band[0] && tset <= G.band[1]; G.inside = inside;
        if (inside) { G.streak += dts; G.focus = Math.min(1, G.focus + 0.3 * dts); const k = Math.floor(G.streak / 5), mult = 1 + Math.min(3, k);
          G.score += dts * 10 * (1 + 3 * Math.max(0, v)) * mult; G.bestCombo = Math.max(G.bestCombo, mult);
          if (k > (G.kShown || 0)) { G.kShown = k; if (k <= 3) { fxText(G, '×' + mult, 0.5, 0.42, 'good'); SFX.combo(4 * k); } } }
        else { G.streak = 0; G.kShown = 0; if (s > 3) { G.focus -= 0.35 * dts; if (G.focus <= 0) { G.focus = 1; loseLife(G, 0.5, 0.5); } } }
        if (v > (G.iceLvl || 0) + 0.05) { G.iceLvl = v; SFX.crystal(v); } else if (v < (G.iceLvl || 0) - 0.1) G.iceLvl = v; },
      draw(G, c, W, H) { // a thermometer on the right edge of the box: the band, where you are, and the focus left
        const [lo, hi] = this.range, yOf = (Tv) => H * (1 - (Tv - lo) / (hi - lo)), x = W * 0.94, w = W * 0.035;
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x, 0, w, H);
        c.fillStyle = G.inside ? 'rgba(40,160,80,0.85)' : 'rgba(230,150,30,0.85)'; c.fillRect(x, yOf(G.band[1]), w, yOf(G.band[0]) - yOf(G.band[1]));
        c.fillStyle = colors.ink; c.fillRect(x - w * 0.35, yOf(tset) - 1.5 * dpr, w * 1.7, 3 * dpr);
        c.fillStyle = G.focus > 0.35 ? 'rgba(40,160,80,0.9)' : 'rgba(200,50,40,0.9)'; c.fillRect(x - w * 0.8, H * (1 - G.focus), w * 0.3, H * G.focus); } },
    { id: 'p-waves', proto: true, seed: 20261118, title: 'Heat-wave survival', sub: 'Two liquids · separate again after every wave', sys: 'demix', ordered: false, range: [0.02, 1.0], box: '36', rate: 3, D: 1e9, raw: true, noSnap: true,
      lab: 'Score', fmt: (v) => String(Math.round(v)), stars: [1000, 2500, 5000], scale: 6000, lvlLab: 'Wave', alwaysZone: true, zone: [0.27, 0.42], zoneLive: (G) => (G && G.phase !== 'wave' ? [0.27, 0.42] : null),
      how: 'Heat waves keep coming and mix the liquids. After each wave, separate them again before the time runs out: each wave survived scores, in a row they score more. Too slow costs a life.',
      lvlOf: (G) => 1 + G.waveN,
      pstart(G) { G.phase = 'calm'; G.next = 8; G.waveN = 0; G.warned = false; },
      tick(G, s, dts, v) {
        const k = G.waveN, amp = 0.3 * (1 + 0.25 * k), len = Math.min(4, 1.5 + 0.2 * k), gap = Math.max(4, 9 - 0.5 * k), rec = Math.max(2, 6 - 0.35 * k);
        if (G.phase === 'calm') {
          if (!G.warned && s >= G.next - 1.3) { G.warned = true; fxText(G, T('Heat wave coming!'), 0.5, 0.3, 'warn'); }
          if (s >= G.next) { G.phase = 'wave'; G.waveEnd = s + len; G.before = v; G.bump = amp; setT(tset); } }
        else if (G.phase === 'wave') { if (s >= G.waveEnd) { G.phase = 'rec'; G.bump = 0; setT(tset); G.recEnd = s + rec; G.target = Math.min(0.6, 0.38 + 0.025 * k); /* the bar rises with every wave */ fxText(G, T('Separate them again!'), 0.5, 0.3, 'warn'); } }
        else if (v >= G.target) { G.waveN++; G.phase = 'calm'; G.next = s + gap; G.warned = false; gain(G, 1, Math.round(100 * v), 0.5, 0.45); }
        else if (s >= G.recEnd) { G.waveN++; G.phase = 'calm'; G.next = s + gap; G.warned = false; loseLife(G, 0.5, 0.5); }
        G.v = v; G.s = s; },
      draw(G, c, W, H) { if (G.phase !== 'rec') return; // the separation needed, the separation now and the time left
        const left = Math.max(0, G.recEnd - G.s), x = W * 0.2, w = W * 0.6, y = H * 0.06, h = H * 0.03;
        c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(x - 6 * dpr, y - 6 * dpr, w + 12 * dpr, h + 26 * dpr);
        c.fillStyle = 'rgba(120,130,140,0.35)'; c.fillRect(x, y, w, h); c.fillStyle = G.v >= G.target ? 'rgba(40,160,80,0.9)' : 'rgba(230,150,30,0.9)'; c.fillRect(x, y, w * Math.min(1, G.v), h);
        c.fillStyle = colors.ink; c.fillRect(x + w * G.target - 1.5 * dpr, y - 4 * dpr, 3 * dpr, h + 8 * dpr);
        c.font = `600 ${13 * dpr}px ${css('--f-body') || 'sans-serif'}`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(T('Separate: {t} s left', { t: left.toFixed(1) }), x + w / 2, y + h + 4 * dpr); } },
  ];
  const protoOn = () => { try { return localStorage.getItem('mdlab-proto') === '1'; } catch (e) { return false; } };
  function renderProto() {
    const on = protoOn(); $('protoSec').hidden = !on; $('protoToggle').textContent = T(on ? 'Hide prototype games' : 'Show prototype games'); if (!on) return;
    $('ppick').innerHTML = PROTOS.map((g) => { const b = getBest(g);
      return `<button data-proto="${g.id}" aria-pressed="${gameSel === g}"><b>${T(g.title)}</b><small>${T(g.sub)}</small><span class="stars">${b !== null ? starStr(starsFor(g, b)) + ' ' + T('best') + ' ' + g.fmt(b) : ''}</span></button>`; }).join('');
  }
  function selectProto(id) {
    const g = PROTOS.find((p) => p.id === id); if (!g) return;
    if (game) endGame(null); if (coachReady && guide) { guide = null; coachHide(); }
    gameSel = g; gameLevel = 0; renderPick(); renderProto(); if (typeof renderLadder === 'function') renderLadder(); $('greplay').hidden = true;
    $('gsel').hidden = false; $('ggoal').textContent = T(g.how); $('ghint').innerHTML = '';
    gstartKey = 'Start'; $('gstart').textContent = T('Start');
    if (appMode === 'game') prepGame(g);
  }
  $('ppick').addEventListener('click', (e) => { const b = e.target.closest('[data-proto]'); if (b) selectProto(b.dataset.proto); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-game], [data-lad]')) setTimeout(() => { renderProto(); if (gameSel && !gameSel.proto) $('ggoal').textContent = ''; }, 0); });
  $('protoToggle').addEventListener('click', () => { const on = !protoOn(); try { localStorage.setItem('mdlab-proto', on ? '1' : '0'); } catch (e) {} renderProto();
    if (on) { setAppMode('game'); setTimeout(() => $('protoSec').scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); } });
  renderProto();

  // the run: score, lives, combos and a level that rises every 20 seconds
  const hearts = (G) => { const h = '♥'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, 3 - G.lives)); $('gstars').textContent = h; $('gstars').setAttribute('aria-label', T('{n} lives left', { n: G.lives })); };
  function protoStart(G) {
    const g = G.g; Object.assign(G, { rate: g.rate, score: 0, lives: 3, combo: 0, bestCombo: 0, lvl: 1, fx: [], grace: 0, sPrev: 0, why: '' });
    $('gvalLab').textContent = T('Score'); $('gtimeLab').textContent = T(g.lvlLab); $('gstarsLab').textContent = T('Lives'); $('gpeakLab').textContent = T('Best ever');
    const b = getBest(g); $('gpeak').textContent = b !== null ? g.fmt(b) : '–'; $('gtime').textContent = '1'; hearts(G);
    if (g.pstart) g.pstart(G);
  }
  function protoUpdate(G, v) {
    const g = G.g; G.last = eng.time; if (G.cd) return;
    const s = (eng.time - G.t0) / G.rate, dts = Math.max(0, Math.min(0.5, s - G.sPrev)); G.sPrev = s;
    const lvl = g.lvlOf ? g.lvlOf(G) : 1 + Math.floor(s / 20);
    if (lvl !== G.lvl) { G.lvl = lvl; if (g.level) g.level(G, lvl); if (!g.lvlOf) { fxText(G, T('Level {n}: faster!', { n: lvl }), 0.5, 0.3, 'lvl'); SFX.level(); say(T('Level {n}: faster!', { n: lvl })); } }
    g.tick(G, s, dts, v); if (g.zoneLive) zoneMarks(s);
    $('gval').textContent = g.fmt(G.score); $('gtime').textContent = String(G.lvl);
    $('gbar').style.width = (g.lvlOf ? 0 : 100 * ((s % 20) / 20)) + '%';
    $('gnow').style.left = (100 * Math.max(0, Math.min(1, G.score / g.scale))) + '%';
    const st = starsFor(g, G.score); if (st > (G.stShown || 0)) { G.stShown = st; starBurst(st); }
    if (G.lives <= 0 || (g.over && g.over(G))) endGame('done');
  }
  function gain(G, n, base, fx, fy) { // n successes at once: the combo grows with each, every 3 in a row add one to the multiplier (up to ×5)
    G.combo += n; const mult = Math.min(5, 1 + Math.floor(G.combo / 3)), pts = n * base * mult; G.score += pts; G.bestCombo = Math.max(G.bestCombo, mult);
    fxText(G, '+' + Math.round(pts) + (mult > 1 ? ' ×' + mult : ''), fx, fy, 'good'); G.fx.push({ k: 'ring', x: fx, y: fy, t0: performance.now() }); SFX.combo(G.combo);
  }
  function loseLife(G, fx, fy) { // a short grace period, so one mistake costs one life
    if (performance.now() < G.grace) return; G.grace = performance.now() + 1800; G.lives--; G.combo = 0; hearts(G);
    fxText(G, '−♥', fx, fy, 'bad'); SFX.miss(); say(T('{n} lives left', { n: G.lives }));
    const box = cv.parentElement; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    const hs = $('gstars'); hs.classList.remove('bump'); void hs.offsetWidth; hs.classList.add('bump');
  }
  function fxText(G, txt, x, y, kind) { G.fx.push({ k: 'text', txt, x, y, kind, t0: performance.now() }); }
  function protoDraw(G) { // floating points, bursts where drug was delivered, and the game's own marks; all in canvas pixels
    const W = cv.width, H = cv.height, now = performance.now(), red = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (G.g.draw) { ctx.save(); G.g.draw(G, ctx, W, H); ctx.restore(); }
    G.fx = G.fx.filter((f) => now - f.t0 < (f.k === 'ring' ? 700 : 1100));
    for (const f of G.fx) { const u = (now - f.t0) / (f.k === 'ring' ? 700 : 1100); ctx.save(); ctx.globalAlpha = Math.max(0, 1 - u);
      if (f.k === 'ring') { ctx.strokeStyle = 'rgba(255,200,40,1)'; ctx.lineWidth = 4 * dpr * (1 - u) + 1; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, (0.02 + 0.09 * u) * W, 0, 6.2832); ctx.stroke(); }
      else { const col = f.kind === 'bad' ? '#c0392b' : f.kind === 'warn' ? '#b35a00' : f.kind === 'lvl' ? '#0d5f5f' : '#1c7a3a', size = (f.kind === 'lvl' || f.kind === 'warn' ? 26 : 22) * dpr;
        ctx.font = `700 ${size}px ${css('--f-display') || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5 * dpr; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        const yy = Math.min(H - size, Math.max(size, f.y * H - (red ? 0 : u * 0.08 * H))), xx = Math.min(W - 3 * size, Math.max(3 * size, f.x * W)); ctx.strokeText(f.txt, xx, yy); ctx.fillStyle = col; ctx.fillText(f.txt, xx, yy); }
      ctx.restore(); }
  }
  function protoEnd(G) {
    const g = G.g, v = Math.round(G.score), st = starsFor(g, v), b = getBest(g), rec = b === null || v > b; if (rec) setBest(g, v);
    G.bump = 0; setT(tset); $('gagain').hidden = false; $('greplay').hidden = true; renderProto();
    endScreen({ G, g, st, v, rec, best: b, extra: (G.why ? G.why + ' ' : '') + T('Reached level {n}; best multiplier ×{c}.', { n: G.lvl, c: Math.max(1, G.bestCombo) }), tip: '', next: null });
  }
