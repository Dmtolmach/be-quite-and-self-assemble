  // ---------- help: quick tour of the main controls, opened with the ? button ----------
  const TOUR = [
    { t: 'How this works', d: 'Every dot is a molecule. Cold molecules stick together and build structures; heat shakes them apart. Turn on the microphone and melt this ice with your voice, or drag the slider.', demo: true },
    { sel: () => phoneUI() ? '.mbnav' : '.modeseg', t: 'Modes', d: 'Game: reach a goal in 30 seconds. Explore: try any system freely. Energy scan: measure where a structure melts.' },
    { sel: '#sim', t: 'Simulation box', d: 'The molecules move here in real time.' },
    { sel: '.mbar', t: 'Temperature', d: 'Drag the slider to cool or heat the box. Press Mic to use room noise instead: quiet cools the box, sound heats it.' },
    { sel: () => phoneUI() ? '#mbOpt' : appMode === 'game' ? '#gamePanel' : '#sysPanel', t: () => phoneUI() ? 'Options' : appMode === 'game' ? 'Games' : 'Systems',
      d: () => phoneUI() ? 'Tap Options to pick a game or a system and to change the settings. Then press Start on the box.' : appMode === 'game' ? 'Pick a game, read the goal and press Start. Reach the marked levels to earn up to three stars.' : 'Pick a system. Each card says what happens to it on cooling or heating.' },
    { sel: '#classBtn', t: 'Class mode', d: 'For the projector: one big box, and the whole room controls the temperature with its noise. Everyone quiet: structures grow. Noise: they break.' },
    { sel: '#lang', t: 'Language', d: 'Switch the language here.' },
  ];
  let tourI = -1, tourRaf = 0, tourT0 = 0, demoCtl = 'auto', demoT = 0, demoPrev = 0, demoLast = 0; // auto: plays by itself until the viewer uses the microphone or the slider
  const tv = (v) => typeof v === 'function' ? v() : v;
  function tourPlace() {
    if (tourI < 0) return; const st = TOUR[tourI], spot = $('tSpot'), card = $('tCard'), vw = innerWidth, vh = innerHeight;
    const el = st.sel ? document.querySelector(tv(st.sel)) : null, cw = card.offsetWidth, ch = card.offsetHeight;
    if (!el) { spot.className = 'spot none'; spot.removeAttribute('style'); card.style.left = Math.max(16, (vw - cw) / 2) + 'px'; card.style.top = Math.max(16, (vh - ch) / 2) + 'px'; return; }
    const r = el.getBoundingClientRect(), pad = 6; spot.className = 'spot';
    Object.assign(spot.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + 2 * pad) + 'px', height: (r.height + 2 * pad) + 'px' });
    let top = r.bottom + 14; if (top + ch > vh - 12) top = r.top - ch - 14; if (top < 12) top = Math.max(12, vh - ch - 12);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), vw - cw - 16);
    card.style.top = top + 'px'; card.style.left = left + 'px';
  }
  let welcome = false; // first visit: the story on the first card, then one big Play button
  function tourShow(i) {
    tourI = i; const st = TOUR[i], n = TOUR.length; welcome = i === 0; // the first card of help is the welcome card
    $('tCard').classList.toggle('welcome', welcome); $('tWel').hidden = !welcome; $('tLang').value = $('lang').value;
    $('tTitle').textContent = welcome ? T('Shut Up and Get Structured') : T(tv(st.t)); $('tText').textContent = welcome ? T('Your voice is the thermostat. Quiet cools the molecules and they build structures; noise heats them and breaks everything apart. Ready to try?') : T(tv(st.d)); $('tCount').textContent = T('{i} of {n}', { i: i + 1, n });
    $('tBack').disabled = i === 0; $('tNext').textContent = T(i === n - 1 ? 'Done' : 'Next');
    $('tDemo').hidden = !st.demo; cancelAnimationFrame(tourRaf); if (st.demo) { tourT0 = demoLast = performance.now(); tourRaf = requestAnimationFrame(iceDemo); }
    const el = st.sel ? document.querySelector(tv(st.sel)) : null;
    if (el && el.scrollIntoView) { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'auto' }); }
    requestAnimationFrame(tourPlace);
  }
  function tourOpen(wel) { welcome = wel === true; demoCtl = 'auto'; $('tdMic').setAttribute('aria-pressed', 'false'); $('tour').hidden = false; tourShow(0); (welcome ? $('tPlay') : $('tNext')).focus(); }
  function tourClose() { markTour(); if (welcome || $('tCard').classList.contains('welcome')) markWel(); $('tour').hidden = true; tourI = -1; cancelAnimationFrame(tourRaf); $('helpBtn').focus(); }
  $('helpBtn').addEventListener('click', () => tourOpen(false));
  $('tLang').addEventListener('change', (e) => { $('lang').value = e.target.value; setLang(e.target.value); }); // the welcome card has its own language switch
  $('tPlay').addEventListener('click', () => { markWel(); welcome = false; tourClose(); setAppMode('game'); selectGame('ice'); startGame(); }); // the guided first game (with the microphone set-up)
  $('tTour').addEventListener('click', () => { markWel(); tourShow(1); $('tNext').focus(); });
  $('tFree').addEventListener('click', () => { markWel(); welcome = false; tourClose(); });
  $('tdT').addEventListener('input', () => { demoCtl = 'slider'; $('tdMic').setAttribute('aria-pressed', 'false'); });
  $('tdMic').addEventListener('click', async () => { if (demoCtl === 'mic') { demoCtl = 'slider'; $('tdMic').setAttribute('aria-pressed', 'false'); return; }
    await setMode('mic'); if (analyser) { demoCtl = 'mic'; $('tdMic').setAttribute('aria-pressed', 'true'); } });
  let seenTour = false; try { seenTour = localStorage.getItem('mdlab-tour') === '1'; } catch (e) {}
  let seenWel = false; try { seenWel = localStorage.getItem('mdlab-welcome') === '1'; } catch (e) {}
  if (!seenWel) setTimeout(() => { if (tourI < 0) tourOpen(true); }, 700); // first visit (also for browsers that saw the old tour): the story, then Play
  const markWel = () => { try { localStorage.setItem('mdlab-welcome', '1'); } catch (e) {} };
  const markTour = () => { try { localStorage.setItem('mdlab-tour', '1'); } catch (e) {} };
  $('tClose').addEventListener('click', tourClose);
  $('tBack').addEventListener('click', () => { if (tourI > 0) tourShow(tourI - 1); });
  $('tNext').addEventListener('click', () => { if (tourI < TOUR.length - 1) tourShow(tourI + 1); else tourClose(); });
  $('tour').addEventListener('click', (e) => { if (e.target === $('tour')) tourClose(); });
  document.addEventListener('keydown', (e) => { if (tourI < 0) return;
    if (e.key === 'Escape') tourClose(); else if (e.key === 'ArrowRight') $('tNext').click(); else if (e.key === 'ArrowLeft') $('tBack').click(); });
  addEventListener('resize', tourPlace); addEventListener('scroll', tourPlace, { passive: true });
  // ice demo: a honeycomb of water molecules; the bonds (lines) break and the molecules wander off as T rises, then it refreezes
  const ICE = (() => { const pts = [], a = 1.15, W = 18, H = 10.1; // honeycomb: a triangular lattice with every third site left empty
    for (let j = -2; j < 12; j++) for (let i = -8; i < 20; i++) { if (((i - j) % 3 + 3) % 3 === 0) continue;
      const x = 0.9 + (i + 0.5 * j) * a, y = 0.8 + j * a * Math.sqrt(3) / 2; if (x < 0.6 || x > W - 2.2 || y < 0.6 || y > H - 0.6) continue;
      pts.push({ x0: x, y0: y, dx: 0, dy: 0, vx: 0, vy: 0, s: Math.random() * 6.28 }); }
    const nb = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x0 - pts[j].x0, pts[i].y0 - pts[j].y0) < 1.05 * a) nb.push([i, j]);
    const cx = W / 2 - 0.8, cy = H / 2; let c0 = 0; pts.forEach((p, i) => { if (Math.hypot(p.x0 - cx, p.y0 - cy) < Math.hypot(pts[c0].x0 - cx, pts[c0].y0 - cy)) c0 = i; });
    const dmax = Math.max(...pts.map((p) => Math.hypot(p.x0 - pts[c0].x0, p.y0 - pts[c0].y0)));
    pts.forEach((p) => { p.r = Math.hypot(p.x0 - pts[c0].x0, p.y0 - pts[c0].y0) / dmax; p.arms = []; }); // r: order in which the crystal grows out from the first molecule
    const nb0 = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x0 - pts[j].x0, pts[i].y0 - pts[j].y0) < 1.05 * a) nb0.push([i, j]);
    for (const [i, j] of nb0) { pts[i].arms.push(Math.atan2(pts[j].y0 - pts[i].y0, pts[j].x0 - pts[i].x0)); pts[j].arms.push(Math.atan2(pts[i].y0 - pts[j].y0, pts[i].x0 - pts[j].x0)); }
    for (const p of pts) { const a0 = p.arms.length ? p.arms[0] : 0; p.arms = [a0, a0 + 2.0944, a0 - 2.0944]; if (p.arms.length) { /* three arms 120° apart, along the bonds of the honeycomb */ } }
    return { pts, nb: nb0, W, H, a, c0 }; })();
  let screamImg = null; // the logo (a shouting face) drawn into the intro when the noise comes
  function screamLogo() { if (screamImg) return screamImg; const el = document.querySelector('.brand .logo'); if (!el) return null; const cs = getComputedStyle(document.documentElement);
    let src = el.outerHTML.replace(/<path[^>]*?(\/>|><\/path>)/g, '').replace(/<rect[^>]*?(\/>|><\/rect>)/g, '') // the logo hushes with a finger; here it shouts: squeezed eyes, wide open mouth
      .replace('</g>', '<path d="M18.4 18.6 l3.2 1.7 l-3.2 1.7 M29.6 18.6 l-3.2 1.7 l3.2 1.7" fill="none" stroke-width="1.4"/><ellipse cx="24" cy="28.2" rx="3.6" ry="4.3" fill="#4a3000"/><ellipse cx="24" cy="30.2" rx="2.1" ry="1.5" fill="#d9534f" stroke="none"/></g>');
    src = src.replace(/var\((--[\w-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || '#888').replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    screamImg = new Image(); screamImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); return screamImg; }
  function iceDemo(now) {
    // auto: the story of the app in 15 s: one molecule (0-2.5 s), the crystal grows around it (2.5-6), the shouting face melts it (7-10.5), quiet lets it refreeze (10.5-15)
    const c = $('tCanvas'), g = c.getContext('2d'), ts = ((now - tourT0) / 1000) % 15, t = ts, red = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const story = demoCtl === 'auto', ez = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
    const grow = story ? (red ? (ts < 2.5 ? 0 : 1) : ez((ts - 2.5) / 3.2)) : 1, zoom = story ? 1 + 3 * (1 - (red ? grow : ez((ts - 2.2) / 2.6))) : 1;
    const dts = Math.min(0.1, (now - demoLast) / 1000); demoLast = now;
    // auto: cold 0-2 s, heat 2-5 s, hot 5-6 s, cool 6-9 s, cold 9-10 s; microphone: loudness heats quickly and the ice refreezes slowly; slider: as set
    let T01;
    if (demoCtl === 'mic') { const d = levelDb(), span = Math.max(0.5, +$('micrange').value), x = d === null ? 0 : Math.max(0, Math.min(1, (d - quietDb) / span));
      demoT += (1 - Math.exp(-dts / (x > demoT ? 0.3 : 1.6))) * (x - demoT); T01 = demoT; $('tdT').value = T01.toFixed(2); }
    else if (demoCtl === 'slider') { T01 = +$('tdT').value; demoT = T01; }
    else { T01 = ts < 7 ? 0 : ts < 8.2 ? (ts - 7) / 1.2 : ts < 10.5 ? 1 : ts < 13.5 ? 1 - (ts - 10.5) / 3 : 0; if (red) T01 = ts < 9 ? 0 : ts < 12 ? 1 : 0; $('tdT').value = T01.toFixed(2); }
    const rising = T01 > demoPrev + 1e-4, falling = T01 < demoPrev - 1e-4; demoPrev = T01;
    const melt = Math.max(0, Math.min(1, (T01 - 0.35) / 0.4)), W = c.width, H = c.height, sc = W / ICE.W;
    for (const p of ICE.pts) { if (melt > 0) { p.vx += (Math.random() - 0.5) * 0.06 * melt; p.vy += (Math.random() - 0.5) * 0.06 * melt; p.vx *= 0.93; p.vy *= 0.93; p.dx += p.vx; p.dy += p.vy; }
      else { p.dx *= 0.9; p.dy *= 0.9; p.vx = p.vy = 0; }
      if (story && ts < 7) { p.dx = p.dy = p.vx = p.vy = 0; } // the crystal is being built: everyone in place
      if (T01 < 0.5 && (story ? ts > 10.5 : !rising)) { p.dx *= 0.965; p.dy *= 0.965; } // cooling: back into the honeycomb
      const x = p.x0 + p.dx, y = p.y0 + p.dy; if (x < 0.4 || x > ICE.W - 2.0) p.vx *= -1; if (y < 0.4 || y > ICE.H - 0.4) p.vy *= -1;
      p.dx = Math.max(0.4 - p.x0, Math.min(ICE.W - 2.0 - p.x0, p.dx)); p.dy = Math.max(0.4 - p.y0, Math.min(ICE.H - 0.4 - p.y0, p.dy)); }
    g.clearRect(0, 0, W, H); const jit = 0.05 + 0.12 * T01, ph = now / 160, p0 = ICE.pts[ICE.c0], zs = sc * zoom;
    const P = ICE.pts.map((p) => [p0.x0 * sc + (p.x0 + p.dx + jit * Math.sin(ph + p.s) - p0.x0) * zs, p0.y0 * sc + (p.y0 + p.dy + jit * Math.cos(1.3 * ph + p.s) - p0.y0) * zs]);
    const alpha = ICE.pts.map((p, i) => (i === ICE.c0 ? 1 : Math.max(0, Math.min(1, (grow * 1.15 - p.r) / 0.12))));
    g.lineCap = 'round';
    for (const [i, j] of ICE.nb) { const a2 = Math.min(alpha[i], alpha[j]); if (a2 <= 0) continue; const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) / zs;
      if (d < 1.25 * ICE.a) { g.globalAlpha = 0.6 * a2; g.strokeStyle = colors.cold; g.lineWidth = 3 * Math.sqrt(zoom); g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); g.stroke(); } }
    ICE.pts.forEach((p, i) => { if (alpha[i] <= 0) return; const [x, y] = P[i], spin = T01 * 3 * Math.sin(ph * 0.3 + p.s); g.globalAlpha = alpha[i];
      g.strokeStyle = colors.bond || colors.ink; g.lineWidth = Math.max(1.5, 0.09 * zs); g.beginPath(); // a water molecule: a bead with three arms that can hold on to neighbours
      for (const a3 of p.arms) { g.moveTo(x, y); g.lineTo(x + Math.cos(a3 + spin) * 0.45 * zs, y + Math.sin(a3 + spin) * 0.45 * zs); } g.stroke();
      g.fillStyle = colors.head; g.beginPath(); g.arc(x, y, 0.3 * zs, 0, 6.2832); g.fill(); });
    g.globalAlpha = 1;
    // the shouting face and its sound waves while the noise melts the crystal
    const sA = story ? Math.max(0, Math.min(1, (ts - 6.6) / 0.4, (10.8 - ts) / 0.5)) : demoCtl === 'mic' ? Math.min(1, T01 * 1.6) : 0, im = sA > 0 ? screamLogo() : null;
    if (im && im.complete && im.naturalWidth) { const R = H * 0.66 * (1 + 0.06 * Math.sin(now / 70)), lx = W * 0.22, ly = H * 0.5;
      g.save(); g.globalAlpha = sA * 0.93; g.fillStyle = isDark() ? 'rgba(20,24,30,.75)' : 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(lx, ly, R * 0.62, 0, 6.2832); g.fill();
      g.drawImage(im, lx - R / 2, ly - R / 2, R, R); g.strokeStyle = colors.hot; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const u = ((now / 600) + k / 3) % 1; g.globalAlpha = sA * (1 - u); g.lineWidth = 5 - 2 * u;
        g.beginPath(); g.arc(lx, ly, R * (0.55 + 0.9 * u), -0.6, 0.6); g.stroke(); }
      g.restore(); }
    // thermometer on the right
    const bx = W - 26, by = 18, bh = H - 36; g.fillStyle = colors.line; g.fillRect(bx, by, 10, bh);
    g.fillStyle = T01 > 0.5 ? colors.hot : colors.cold; g.fillRect(bx, by + bh * (1 - (0.12 + 0.88 * T01)), 10, bh * (0.12 + 0.88 * T01));
    const heatCap = story ? ts >= 6.8 && ts < 10.5 : rising && T01 > 0.05, coolCap = story ? ts >= 10.5 && ts < 14 : falling && T01 > 0.05;
    $('tDemoCap').textContent = T(story && ts < 2.5 ? 'A water molecule: a bead with three arms that hold on to neighbours' : story && ts < 6.8 ? 'Cold and quiet: the molecules lock into a honeycomb crystal, ice'
      : heatCap ? 'Noise heats the box: the honeycomb breaks and the ice melts' : coolCap ? 'Quiet again: the molecules lock into a honeycomb again' : T01 > 0.5 ? 'Hot: liquid water' : 'Cold: ice');
    if (tourI >= 0 && TOUR[tourI].demo) tourRaf = requestAnimationFrame(iceDemo);
  }

