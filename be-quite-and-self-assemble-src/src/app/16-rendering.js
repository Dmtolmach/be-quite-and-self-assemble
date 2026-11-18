  // ---- rendering ----
  const cv = $('sim'), ctx = cv.getContext('2d');
  let dpr = 1, W = 0;
  // ---- adaptive drawing quality: watch frame time and drawing time, step down when the device cannot keep up ----
  // 0 full · 1 canvas at 1x pixel density · 2 also no water arms, readouts less often · 3 also every 2nd frame drawn, solvent hidden (not in Ice / Binary liquid)
  let qLevel = 0, qAuto = isPhone, qDraw = null, qFrame = null, qSim = 0, qT = 0, loopN = 0, simMsFrame = 0;
  const ANEVERY = [6, 9, 15, 20];
  function setQuality(q) { q = Math.max(0, Math.min(3, q)); if (q === qLevel) return; const pix = (q >= 1) !== (qLevel >= 1); qLevel = q; if (pix) resize(); qDraw = qFrame = null; qT = performance.now(); }
  function qualityTick(now, dMs, fMs) {
    if (fMs > 200 || document.visibilityState !== 'visible') { qT = now; return; } // tab was hidden or the page was busy elsewhere
    qDraw = qDraw === null ? dMs : 0.92 * qDraw + 0.08 * dMs; qFrame = qFrame === null ? fMs : 0.92 * qFrame + 0.08 * fMs; qSim = 0.92 * qSim + 0.08 * simMsFrame;
    if (!qAuto || qLevel >= 3 || !running) { if (!running) qT = now; return; }
    if (now - qT < 2500) return; // let it settle after a change
    // the browser paints the canvas after our code returns, so painting shows up as frame time outside the simulation, not in qDraw
    if ((qFrame > (qLevel >= 3 ? 40 : 24) && qFrame - qSim > 0.35 * qFrame) || qDraw > 7) { setQuality(qLevel + 1); $('quality').value = 'auto'; } // a slow simulation alone is not helped by simpler drawing
    else qT = now - 1500; // re-check about once a second
  }
  if (!isPhone) $('quality').value = '0';
  $('quality').addEventListener('change', (e) => { const v = e.target.value; qAuto = v === 'auto'; setQuality(qAuto ? 0 : +v); });
  // on a computer the whole box and the temperature bar must fit on the screen: the box gets smaller when the window is short
  function fitSim() {
    if (phoneUI() || classOn) { if (cv.style.maxWidth) { cv.style.maxWidth = ''; resize(); } return; }
    const box = cv.closest('.cellbox'), mb = document.querySelector('.mbar'), hud = $('ghud'); if (!box || !mb) return;
    const top = box.getBoundingClientRect().top + scrollY, running = !!(coachReady && game);
    const hudH = hud.hidden ? 0 : running ? hud.offsetHeight + 10 : Math.min(hud.offsetHeight + 10, 120); // after a game the result graph may push the box down
    const z = parseFloat(getComputedStyle(document.body).zoom) || 1; // 'Larger text' scales the page: work in unscaled pixels
    const avail = Math.max(260, Math.floor((innerHeight - (running ? 14 : top)) / z - hudH - mb.offsetHeight - 24 - 10 - 6)); // a running game scrolls the box to the top of the screen
    const want = avail + 'px'; if (cv.style.maxWidth !== want) { cv.style.maxWidth = want; resize(); }
  }
  addEventListener('resize', () => fitSim());
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => fitSim()); ['ghud'].forEach((id) => $(id) && ro.observe($(id))); document.querySelector('header') && ro.observe(document.querySelector('header')); }
  function resize() { dpr = Math.min(qLevel >= 1 ? 1 : 2, window.devicePixelRatio || 1); W = cv.clientWidth; cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); sizePlots(); }
  window.addEventListener('resize', () => { resize(); if (coachReady) { const rp = $('greplay'); if (!rp.hidden && rp._run) drawReplay(rp._run); } });
  const CPAL = ['#e0704a', '#3a9bd6', '#9b6bd1', '#d4a72c', '#4cae6b', '#d65a9a', '#2fb5b0', '#8f8f3a'];
  const TYPECOL = { 0: 'head', 1: 'tail', 3: 'poly', 5: 'tail', 6: 'head' };

  function disks(col, r, test, from, to) {
    ctx.fillStyle = col; ctx.beginPath();
    const x = eng.x, y = eng.y, s = cv.width / eng.L;
    for (let i = from; i < to; i++) { if (!test(i)) continue; const X = x[i] * s, Y = y[i] * s; ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, 6.2832); }
    ctx.fill();
  }
  // ---- smooth motion: the picture follows the molecules with a short lag (about 0.07 s), so the many MD steps of one frame do not look like jumps ----
  // drawing only: the simulation, the analysis and the scores use the true positions
  let smX = null, smY = null, smL = 0, smE = null, smT = 0;
  const SM_TAU = 0.07;
  function smoothReset() { smX = null; }
  function smoothPos() { // updates the drawn positions; false when the true ones should be drawn
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - smT) / 1000)); smT = now;
    if (!$('smooth').checked || eng2 || eng.walls || demoDrawing) { smX = null; return false; }
    const N = eng.N, L = eng.L, x = eng.x, y = eng.y;
    if (!smX || smE !== eng || smX.length !== N) { smX = Float64Array.from(x); smY = Float64Array.from(y); smL = L; smE = eng; return true; }
    if (L !== smL) { const k = L / smL; for (let i = 0; i < N; i++) { smX[i] *= k; smY[i] *= k; } smL = L; } // barostat: the box grew or shrank
    const a = 1 - Math.exp(-dt / SM_TAU);
    for (let i = 0; i < N; i++) { let dx = x[i] - smX[i], dy = y[i] - smY[i]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
      if (dx * dx + dy * dy > 4) { smX[i] = x[i]; smY[i] = y[i]; continue; } // a rebuild or a jump back to the best moment: no gliding
      let nx = smX[i] + a * dx, ny = smY[i] + a * dy; if (nx < 0) nx += L; else if (nx >= L) nx -= L; if (ny < 0) ny += L; else if (ny >= L) ny -= L; smX[i] = nx; smY[i] = ny; }
    return true;
  }
  function draw() {
    const rx = eng.x, ry = eng.y, E = eng;
    if (smoothPos()) { eng.x = smX; eng.y = smY; }
    try { drawNow(); } finally { E.x = rx; E.y = ry; }
  }
  function drawNow() {
    if (eng2 && sys === 'plates') { drawSplit(); return; }
    ctx.save();
    if (eng.walls) { ctx.translate(0, cv.height); ctx.scale(1, -1); } // brush: substrate at the bottom
    if (!eng.walls && eng.L0 && (eng.p.baro || eng.L !== eng.L0)) { // barostat: fixed magnification, box centre fixed, periodic copies fill the view so the box edge never shows
      const k = eng.L / eng.L0, Wc = cv.width, Hc = cv.height, reps = k < 0.999 ? [-1, 0, 1] : [0];
      ctx.fillStyle = heatBg(); ctx.fillRect(0, 0, Wc, Hc);
      ctx.translate(Wc / 2, Hc / 2); ctx.scale(k, k); ctx.translate(-Wc / 2, -Hc / 2);
      noBg = true; for (const oy of reps) for (const ox of reps) { ctx.save(); ctx.translate(ox * Wc, oy * Hc); drawScene(); ctx.restore(); } noBg = false;
    } else drawScene();
    if (sys === 'dumbbell' && eng.nDrug) drawDrug();
    if (!demoDrawing && sys === 'crypt' && gelShow && gelShow.path.length > 1 && appMode === 'game' && ((game && game.g.id === 'gel') || (!game && gameSel && gameSel.id === 'gel'))) drawGel(gelShow);
    if (follow && !demoDrawing) drawFollow(false);
    if (!demoDrawing && coachReady && game && game.g.proto) protoDraw(game);
    if (!demoDrawing && appMode === 'game') fxDraw();
    ctx.restore();
  }
