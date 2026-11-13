  // ---------- help for first-time players: temperature in words, the good zone, a live coach line, a replay with a diagnosis, a guided first game, unlocking ----------
  const T_WORDS = ['cold', 'cool', 'warm', 'hot'], T_SIGNS = ['❄️❄️', '❄️', '☀️', '🔥'];
  const tWord = (g, Tv) => { const [lo, hi] = g.range, w = g.words || [0.25, 0.5, 0.75].map((q) => lo + q * (hi - lo)); return w.filter((b) => Tv >= b).length; };
  const zoneOf = (g, s) => (g.path ? g.path(s) : g.zone);
  const gameNow = () => (appMode === 'game' && gameRange ? (game ? game.g : gameCfg()) : null);
  function tWordShow() { // during games the box shows cold / cool / warm / hot instead of a number
    const g = gameNow(), b = $('tsetM');
    // symbols instead of words, so the bar keeps its width in every language; the word stays as the tooltip and for screen readers
    if (g) { const k = tWord(g, tset); b.textContent = T_SIGNS[k]; b.title = T(T_WORDS[k]); b.setAttribute('aria-label', T(T_WORDS[k])); b.className = 'tw tw' + k; }
    else if (b.className) { b.className = ''; b.removeAttribute('title'); b.removeAttribute('aria-label'); }
  }
  function zoneMarks(sNow) { // the green band on the noise bar and on the slider: temperatures that build the structure (for ice it moves down during the game)
    const g = gameNow(), hide = !tipsOn() || (game ? game.level : gameLevel); // the green band is a tip: not in challenges or with tips off
    const z = !g || hide ? null : g.zoneLive ? g.zoneLive(game) : (g.zone || g.path) ? zoneOf(g, sNow || 0) : null, nz = $('nzone'), sz = $('szone');
    nz.classList.toggle('on', !!z); sz.classList.toggle('on', !!z); if (!z) return;
    const [lo, hi] = g.range, f = (Tv) => (Tv - lo) / (hi - lo), xn = (Tv) => Math.max(0, Math.min(1, (f(Tv) - 0.05) / 0.9));
    nz.style.left = 100 * xn(z[0]) + '%'; nz.style.width = 100 * (xn(z[1]) - xn(z[0])) + '%';
    const a = f(z[0]), b = f(z[1]); // the slider thumb (about 22 px) travels a little less than the full width
    sz.style.left = `calc(${100 * a}% + ${(11 - 22 * a).toFixed(1)}px)`; sz.style.width = `calc(${100 * (b - a)}% - ${(22 * (b - a)).toFixed(1)}px)`;
  }
  // coach line on the box
  function placeCoach() { const o = $('coach'); if (o.hidden) return;
    const l = (cv.offsetLeft + cv.offsetWidth / 2) + 'px', t = (cv.offsetTop + cv.offsetHeight - o.offsetHeight - 10) + 'px'; /* at the bottom of the box, next to the slider it talks about */ if (o.style.left !== l) o.style.left = l; if (o.style.top !== t) o.style.top = t; }
  let coachMsg = null; // [key, params, class], kept so a language switch can redraw it
  function coachSay(key, cls, params) { coachMsg = [key, params, cls]; const o = $('coach'); $('coachTxt').textContent = T(key, params); o.className = 'coach ' + (cls || ''); o.hidden = false; placeCoach(); }
  function coachHide() { coachMsg = null; $('coach').hidden = true; $('coachBtn').hidden = $('coachSkip').hidden = true; }
  const tipsOn = () => $('gtips').checked;
  $('gtips').addEventListener('change', () => zoneMarks());
  try { if (localStorage.getItem('mdlab-tips') === '0') $('gtips').checked = false; } catch (e) {}
  $('gtips').addEventListener('change', () => { try { localStorage.setItem('mdlab-tips', tipsOn() ? '1' : '0'); } catch (e) {} if (!tipsOn() && !guide) coachHide(); });
  function coachTick(G, s) {
    const g = G.g; if (!g.coach || !tipsOn() || G.level || !G.guided) return; // in-game coach lines only in the guided first game
    const r = G.rec, back = r.find((q) => q.s >= s - 2) || r[0], tr = back ? G.ema - back.v : 0;
    const [key, cls] = g.coach(G, s, tset, tr);
    if (key !== G.cKey) { G.cKey = key; G.cCls = cls; G.cSince = s; }
    // a new line only after it has held for a moment, and not more often than every 1.5 s, so it does not flicker
    if (G.cKey !== G.cShown && (G.cShown === undefined || (s - G.cSince >= 0.6 && s - G.cAt >= 1.5))) { G.cShown = G.cKey; G.cAt = s; coachSay(G.cKey, G.cCls); }
  }
  function zoneCoach(G, s, Tv, tr) { // ice and demixing: a band of good temperatures
    const g = G.g, [a, b] = g.zone, c = g.cz;
    if (Tv > b) return [c.hot, 'bad'];
    if (Tv < a) return s < (g.earlyS || 0) && c.coldEarly ? [c.coldEarly, 'warn'] : [c.cold, c.coldCls || 'warn'];
    return tr > g.rise ? [c.good, 'good'] : [c.flat, ''];
  }
  function iceCoach(G, s, Tv, tr) { // follow the green path down; a short burst of heat when growth stalls
    const g = G.g, [a, b] = g.path(s), r = G.rec, b4 = r.find((q) => q.s >= s - 4) || r[0], stalled = s > 7 && s < 23 && G.ema > 0.05 && G.ema > 0.85 * G.peak && b4 && Math.abs(G.ema - b4.v) < 0.005; // flat near the best so far (not regrowing after a melt)
    if (stalled) G.kickUntil = s + 3.5; // a short burst of heat right after a stall is the advice, not a mistake
    if (Tv > b && s < (G.kickUntil || 0)) return ['Good: the heat melts the defects. Now cool again.', 'good'];
    if (Tv > b + 0.03) return ['Too warm: the ice melts. Get quieter, slowly.', 'bad'];
    if (Tv > b) return ['A bit warmer than the green path: cool down a little.', ''];
    if (Tv < a) return s < 4 ? ['Start warm: make some noise, then cool down slowly.', 'warn'] : ['Cooling too fast: the ice will be a jumble. A little noise!', 'warn'];
    if (s >= 24) return ['Now stay quiet: the ice you grew is setting.', 'good'];
    if (stalled) return ['Growth has stalled. A short burst of noise can melt the defects, then cool again.', 'warn'];
    return tr > g.rise ? ['Good: slow cooling, the ice is growing.', 'good'] : ['On track: keep cooling slowly along the green path.', ''];
  }
  const safeTOf = (G, g) => (g.flowU ? g.range[0] + (g.range[1] - g.range[0]) * Math.sqrt(0.9 / (((G && G.spill) || g.spill) * (g.range[1] - g.range[0]))) : 0); // above this the leaked heat outside the tumour passes ≈1.3 and opens micelles there
  function drugCoach(G, s, Tv) {
    if (G.win) return drugWinCoach(G, s, Tv);
    const r = G.rec, p = r.find((q) => q.s >= s - 1) || r[0] || { d: 0, l: 0 }, g = G.g, inZ = micInBand(2);
    if (inZ) return (G.del || 0) > p.d ? ['Yes! The drug is being delivered.', 'good']
      : safeTOf(G, g) && Tv > safeTOf(G, g) + 0.2 ? ['Too loud: the heat leaks out and opens micelles outside the tumour.', 'bad']
      : Tv > g.hotT ? ['Keep the noise up: the micelle is opening.', ''] : ['A micelle is in the tumour: make noise now!', 'bad'];
    if (Tv > g.hotT) return ['No micelle in the tumour: quiet! The heat leaks drug elsewhere.', 'bad'];
    if ((G.lost || 0) > p.l) return ['Drug is escaping outside the tumour! Keep quiet.', 'bad'];
    if (micInBand(6)) return ['Get ready: a micelle is about to enter the tumour.', 'warn'];
    return ['Good: quiet keeps the drug inside.', 'good'];
  }
  function drugWinCoach(G, s, Tv) {
    const w = drugWindow(), r = G.rec, p = r.find((q) => q.s >= s - 1) || r[0] || { d: 0, l: 0 }, g = G.g;
    if (w && w.on) return (G.del || 0) > p.d ? ['Yes! The drug is being delivered.', 'good']
      : Tv > g.hotT ? ['Keep the noise up: the micelles are opening.', ''] : ['Red window: make noise now!', 'bad'];
    if (Tv > g.hotT) return ['Not now! Heat outside the red windows wastes the drug.', 'bad'];
    if ((G.lost || 0) > p.l) return ['Drug is escaping! Be quiet until the next red window.', 'bad'];
    if (w && w.left !== null && w.left < 1.5) return ['Get ready: a red window starts in a moment.', 'warn'];
    return ['Good: quiet keeps the drug inside.', 'good'];
  }
  function gelCoach(G, s, Tv, tr) {
    const g = G.g, hotSec = G.rec.filter((q) => q.T > g.openT).length * 0.25;
    if (hotSec < g.openSec) return Tv < g.openT ? ['The proteins are folded. Make noise to open them!', 'warn'] : ['Good: the proteins are opening up. Stay loud a little longer.', 'good'];
    if (Tv > g.tooHot) return ['Too hot: the links break. Quieter!', 'bad'];
    if (tr > g.rise) return ['Good! The gel strand is growing.', 'good'];
    if (Tv > g.openT) return ['Now get quieter so the links hold.', ''];
    return ['Hold it cool: let the clumps join up.', ''];
  }
  const quietBand = (g) => [g.range[0], g.range[0] + 0.3 * (g.hotT - g.range[0])];
  for (const g of GAMES) if (g.id === 'drug') g.zoneLive = (G) => { // loud band while the drug should be released, quiet band otherwise
    const gg = G ? G.g : gameCfg(g), hotNow = G && (G.win ? (() => { const w = drugWindow(); return w && (w.on || (w.left !== null && w.left < 1)); })() : micInBand(2));
    return hotNow ? [gg.hotT, safeTOf(G, gg) || gg.range[1]] : quietBand(gg); };
  else if (g.id === 'gel') g.zoneLive = (G) => { const hotSec = G ? G.rec.filter((q) => q.T > g.openT).length * 0.25 : 0;
    return hotSec < g.openSec ? [g.openT, g.tooHot] : [g.range[0], g.openT]; };
  for (const g of GAMES) g.coach = g.id === 'drug' ? drugCoach : g.id === 'gel' ? gelCoach : g.id === 'ice' ? iceCoach : zoneCoach;
  // one sentence about this player's run
  function diagnose(G, st) {
    const g = G.g, r = G.rec || [], n = r.length; if (n < 8) return '';
    const pc = (f) => Math.round(100 * r.filter(f).length / n);
    if (g.id === 'drug' && G.win) {
      const W = G.win || []; let hit = 0;
      for (const [a, b] of W) { const q = r.filter((x) => x.s >= a / G.rate && x.s < b / G.rate); if (q.length && q.filter((x) => x.T > g.hotT).length >= 0.4 * q.length) hit++; }
      const lost = Math.round(100 * (G.lost || 0) / (eng.nDrug || 1));
      if ((G.lost || 0) > (G.del || 0) && lost >= 10) return T('Most of the drug escaped between the windows ({l}% lost). Stay quiet when there is no red window.', { l: lost });
      if (hit < W.length / 2) return T('You heated in {h} of {n} red windows. Make noise as soon as a window starts.', { h: hit, n: W.length });
      return T(st === 3 ? 'Great timing: you heated in {h} of {n} windows and lost only {l}% of the drug.' : 'You heated in {h} of {n} windows and lost {l}% of the drug. Start the noise a little before each window.', { h: hit, n: W.length, l: lost });
    }
    if (g.id === 'drug') {
      const zin = r.filter((x) => x.z), zout = r.filter((x) => !x.z), hotIn = zin.length ? Math.round(100 * zin.filter((x) => x.T > g.hotT).length / zin.length) : 0,
        hotOut = zout.length ? Math.round(100 * zout.filter((x) => x.T > g.hotT).length / zout.length) : 0, lost = Math.round(100 * (G.lost || 0) / (eng.nDrug || 1));
      if ((G.lost || 0) > (G.del || 0) && lost >= 10) return T('Most of the drug escaped outside the tumour ({l}% lost). You were loud for {o}% of the time when no micelle was in it.', { l: lost, o: hotOut });
      if (hotIn < 50) return T('You heated only {h}% of the time a micelle was in the tumour. Make noise as soon as one enters the red zone.', { h: hotIn });
      return T(st === 3 ? 'Great aim: you heated {h}% of the time a micelle was in the tumour and lost only {l}% of the drug.' : 'You heated {h}% of the time a micelle was in the tumour and lost {l}% of the drug. Keep quieter between micelles.', { h: hotIn, l: lost });
    }
    if (g.id === 'gel') {
      const hot = pc((x) => x.T > g.openT), maxT = Math.max(...r.map((x) => x.T)), late = r.filter((x) => x.s > 20), lateHot = late.length && late.filter((x) => x.T > g.openT).length > 0.6 * late.length;
      if (maxT < g.openT) return T('You never got warm enough to open the proteins, so they could not link.');
      if (st >= 2) return T('Heat first, then cool: that is the recipe, and you used it.');
      if (hot > 60 || lateHot) return T('You were warm for {p}% of the game. Links keep breaking while it is warm: cool down sooner.', { p: hot });
      return T('You were warm for {p}% of the game. Try heating for about a third of the game, then go quiet.', { p: hot });
    }
    const zA = (x) => zoneOf(g, x.s)[0], zB = (x) => zoneOf(g, x.s)[1], hot = pc((x) => x.T > zB(x)), cold = pc((x) => x.T < zA(x)), inz = 100 - hot - cold;
    const early = r.filter((x) => x.s < 8), earlyCold = early.length > 0 && early.filter((x) => x.T < zA(x)).length > 0.7 * early.length;
    const after = r.filter((x) => x.s > G.peakSec), lostIt = G.peakSec < 25 && after.length > 4 && G.peak - r[n - 1].v > 0.08 * g.stars[2] && after.filter((x) => x.T > zB(x)).length > 0.3 * after.length;
    if (st === 3) return T(g.dz.top || 'You kept the box in the green zone for {p}% of the game. Excellent!', { p: inz });
    if (g.dz.coldEarly && earlyCold) return T(g.dz.coldEarly);
    if (hot >= (g.path ? 40 : 50)) return T(g.dz.hot, { p: hot });
    if (lostIt) return T('Your best was at {s} s. After that it got too warm and you lost some of it.', { s: Math.round(G.peakSec) });
    if (hot >= 25 && hot >= cold) return T(g.dz.hot, { p: hot });
    if (cold >= 35) return T(g.dz.cold, { p: cold });
    return T(inz >= 50 ? g.dz.inGood || 'You were in the green zone for {p}% of the game. Nice! Now try to stay there a little longer.' : g.dz.inBad || 'You were in the green zone for only {p}% of the game. Try to keep the temperature in the green band.', { p: inz });
  }
  // after the game: the player's temperature over the 30 s, the good zone shaded, and the score
  function drawReplay(G) {
    const c = $('greplay'), r = G && G.rec, g = G && G.g; if (!r || r.length < 4) { c.hidden = true; return; }
    c.hidden = false; c._run = G;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight; if (!W || !H) return;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    const col = (k) => css('--' + k), fs = W < 420 ? 10.5 : 11.5;
    const padL = 4, padR = 42, padT = 20, padB = 15, pw = W - padL - padR, ph = H - padT - padB;
    const X = (s) => padL + pw * s / GAME_SEC, [lo, hi] = g.range, YT = (Tv) => padT + ph * (1 - (Tv - lo) / (hi - lo));
    const nD = g.id === 'drug' && eng && eng.nDrug ? eng.nDrug : 0; if (nD) r.forEach((q) => { q.lp = 100 * (q.l || 0) / nD; }); // drug games: lost drug as a second line
    const top = Math.max(g.stars[2] * 1.12, G.peak * 1.05, nD ? Math.max(...r.map((q) => q.lp)) * 1.05 : 0) || 1, YV = (v) => padT + ph * (1 - Math.max(0, Math.min(top, v)) / top);
    x.fillStyle = col('cell'); x.fillRect(padL, padT, pw, ph);
    if (g.zone || g.path) { x.fillStyle = col('good') + '33'; x.beginPath(); const ss = []; for (let q = 0; q <= 60; q++) ss.push(GAME_SEC * q / 60);
      ss.forEach((sv, i) => (i ? x.lineTo : x.moveTo).call(x, X(sv), YT(Math.min(hi, zoneOf(g, sv)[1]))));
      for (let i = ss.length - 1; i >= 0; i--) x.lineTo(X(ss[i]), YT(Math.max(lo, zoneOf(g, ss[i])[0]))); x.closePath(); x.fill(); }
    for (const [a, b] of G.win || []) { x.fillStyle = col('hot') + '33'; x.fillRect(X(a / G.rate), padT, X(b / G.rate) - X(a / G.rate), ph); }
    if (g.flowU) { x.fillStyle = col('hot') + '33'; for (let i = 0; i < r.length; i++) if (r[i].z) { const s0 = r[i].s, s1 = i + 1 < r.length ? r[i + 1].s : GAME_SEC; x.fillRect(X(s0), padT, X(s1) - X(s0) + 0.5, ph); } }
    x.font = `${fs}px ${css('--f-body')}`; x.textBaseline = 'middle';
    g.stars.forEach((sv, k) => { const y = YV(sv); x.strokeStyle = col('cryst') + 'aa'; x.lineWidth = 1; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(padL, y); x.lineTo(padL + pw, y); x.stroke();
      x.setLineDash([]); x.fillStyle = col('cryst'); x.textAlign = 'left'; x.fillText('★'.repeat(k + 1), padL + pw + 2, y); });
    const line = (key, Y, color, w, dash) => { x.strokeStyle = color; x.lineWidth = w; x.lineJoin = 'round'; x.setLineDash(dash || []); x.beginPath(); r.forEach((q, i) => (i ? x.lineTo : x.moveTo).call(x, X(q.s), Y(q[key]))); x.stroke(); x.setLineDash([]); }; // dashes as well as colours, for colour-blind players
    line('T', YT, col('hot'), 2, [7, 4]); if (nD) line('lp', YV, col('muted'), 2, [2, 4]); line('v', YV, col('accent'), 3);
    x.fillStyle = col('accent'); x.beginPath(); x.arc(X(G.peakSec), YV(G.peak), 4, 0, 7); x.fill();
    x.fillStyle = col('muted'); x.textAlign = 'center'; for (const s of [0, 10, 20, 30]) x.fillText(s === 30 ? T('{n} s', { n: 30 }) : String(s), s === 30 ? padL + pw - 10 : Math.max(padL + 4, X(s)), H - padB / 2 + 1);
    // legend along the top
    let lx = padL; const item = (color, label, box, dash) => { x.fillStyle = color; if (box) x.fillRect(lx, 5, 12, 10); else if (dash) { x.strokeStyle = color; x.lineWidth = 2.5; x.setLineDash(dash); x.beginPath(); x.moveTo(lx, 10.5); x.lineTo(lx + 16, 10.5); x.stroke(); x.setLineDash([]); } else x.fillRect(lx, 9, 14, 3); lx += 20; x.fillStyle = col('ink'); x.textAlign = 'left'; x.fillText(label, lx, 10); lx += x.measureText(label).width + 12; };
    item(col('hot'), T('your temperature'), false, [5, 3]); item(col('accent'), T('score')); if (nD) item(col('muted'), T('lost drug'), false, [2, 3]);
    if (g.zone || g.path) item(col('good') + '66', T(g.path ? 'green path' : 'green zone'), true); else if (G.win) item(col('hot') + '55', T('red windows'), true); else if (g.flowU) item(col('hot') + '55', T('micelle in the tumour'), true);
  }
  // games open one after another: a star in a game opens the next; teachers can open all
  const unlockAll = () => { try { return localStorage.getItem('mdlab-unlock') === '1'; } catch (e) { return false; } };
  function isOpen(i) { if (i <= 0 || unlockAll()) return true; const p = GAMES[i - 1], b = getBest(p); return b !== null && starsFor(p, b) >= 1; }
  function unlockLabel() { $('gunlock').textContent = T(unlockAll() ? 'Lock the games again' : 'Unlock all games'); }
  $('gunlock').addEventListener('click', () => { try { localStorage.setItem('mdlab-unlock', unlockAll() ? '0' : '1'); } catch (e) {} unlockLabel(); renderPick(); });
  unlockLabel();
  // guided first game: melt the ice with noise, freeze it with quiet, then play
  let guide = null;
  const guidedDone = () => { try { return localStorage.getItem('mdlab-guided') === '1'; } catch (e) { return true; } };
  const needGuide = (g) => g.id === 'ice' && !guidedDone() && getStats(g).n === 0;
  const GUIDE = [
    { mic: 'Make noise! Clap, sing or shout: noise heats the ice and it melts.', sl: 'Drag the temperature slider to the right: the ice heats up and melts.' },
    { mic: 'Now be quiet. The water cools and freezes into ice again (blue).', sl: 'Now drag the slider to the left. The water cools and freezes into ice again (blue).' },
    { mic: 'That is it: quiet makes ice, noise melts it. Ice frozen slowly grows the biggest crystals. Now grow as much ice as you can!', sl: 'That is it: cold makes ice, heat melts it. Ice frozen slowly grows the biggest crystals. Now grow as much ice as you can!' },
  ];
  function guideShow() {
    if (!guide) return; const k = guide.k, txt = GUIDE[k][guide.mic ? 'mic' : 'sl'];
    coachSay(txt, 'guide'); const b = $('coachBtn'); b.hidden = k < 2; b.textContent = T('Play'); $('coachSkip').hidden = k >= 2; $('coachSkip').textContent = T('Skip');
  }
  let afterGuide = false; // the game right after the guided lesson still has the coach line
  function guideStart(g) {
    prepGame(g); $('initState').value = 'ordered'; build({ game: true }); // the lesson starts from a crystal, so the first thing seen is melting
    running = true; $('pause').textContent = T('Pause'); syncBoxStart();
    guide = { k: 0, t: performance.now(), mic: false, lo: 1 };
    if (typeof sheet === 'function') sheet(false);
    guideShow();
    if ($('guseMic').checked) setMode('mic').then(() => { if (!guide) return; guide.mic = !!analyser; if (!analyser) { setMode('slider'); guideShow(); return; }
      guide.wiz = true; micWizard(() => { if (!guide) return; guide.wiz = false; guide.t = performance.now(); guideShow(); }); });
    else setMode('slider');
  }
  function guideTick(v) {
    if (guide.wiz) return;
    const G = guide, el = (performance.now() - G.t) / 1000;
    if (G.k === 0 && v < 0.3 && el > 1.5) { G.k = 1; G.t = performance.now(); G.lo = v; guideShow(); }
    else if (G.k === 1) { G.lo = Math.min(G.lo, v); if ((v > G.lo + 0.12 && el > 2) || (el > 12 && v > G.lo + 0.04)) { G.k = 2; guideShow(); } }
  }
  function guideEnd(play) {
    if (!guide) return; guide = null; coachHide(); try { localStorage.setItem('mdlab-guided', '1'); } catch (e) {}
    if (play) { afterGuide = true; startGame(); }
  }
  $('coachBtn').addEventListener('click', () => { if (guide) guideEnd(true); else if (battle) battleGo(); });
  $('coachSkip').addEventListener('click', () => { if (guide) guideEnd(true); else if (battle) battleStop(); });
  coachReady = true; tWordShow(); zoneMarks(); renderPick();

