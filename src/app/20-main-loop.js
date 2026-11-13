  // ---- main loop ----
  let last = performance.now(), stepCount = 0, perfT = last, sps = 0, tkinAvg = null;
  // ---------- hidden debug line: add ?debug=1 to the address (or #debug) ----------
  const dbgOn = /[?&]debug(=1)?\b/.test(location.search) || location.hash === '#debug';
  if (dbgOn) document.documentElement.classList.add('debug'); // also shows test tools such as the ice wall
  let dbg = dbgOn ? { t: performance.now(), frames: 0, frameSum: 0, frameMax: 0, sim: 0, draw: 0, ana: 0, steps: 0 } : null;
  if (dbgOn) { const d = document.createElement('div'); d.id = 'dbgLine'; d.className = 'dbgline'; $('sim').insertAdjacentElement('afterend', d); }
  function debugTick(now, frameMs) {
    dbg.frames++; dbg.frameSum += frameMs; if (frameMs < 1000) dbg.frameMax = Math.max(dbg.frameMax, frameMs);
    const span = now - dbg.t; if (span < 1000) return;
    const f = dbg.frames || 1, per = (v) => (v / f).toFixed(1), sps = dbg.steps * 1000 / span, need = game ? game.rate / eng.p.dt : null;
    const busy = (dbg.sim + dbg.draw + dbg.ana) / f, other = Math.max(0, dbg.frameSum / f - busy);
    $('dbgLine').textContent = `${(1000 * f / span).toFixed(0)} fps (worst ${dbg.frameMax.toFixed(0)} ms) · per frame: sim ${per(dbg.sim)} ms, draw ${per(dbg.draw)} ms, readouts ${per(dbg.ana)} ms, idle/browser ${other.toFixed(1)} ms`
      + ` · ${sps.toFixed(0)} steps/s = ${(sps * eng.p.dt).toFixed(2)} τ/s` + (need ? ` (game needs ${need.toFixed(0)})` : '')
      + ` · ${dbg.steps ? (1000 * dbg.sim / dbg.steps).toFixed(0) : '–'} µs/step · N ${eng.N} · quality ${qLevel} · canvas ${cv.width}×${cv.height} @${dpr}x · ${navigator.hardwareConcurrency || '?'} cores`;
    dbg = { t: now, frames: 0, frameSum: 0, frameMax: 0, sim: 0, draw: 0, ana: 0, steps: 0 };
  }
  function loop(now) {
    const frameMs = now - last, dtSec = Math.min(0.1, frameMs / 1000); last = now;
    if (scan && running) scanStep();
    else if (mode === 'mic') micUpdate(dtSec);
    if (fcReady) cardTick(dtSec);
    if (running) {
      const prev = coachReady && previewOn(), n = game ? gameSteps(dtSec) : prev ? 1 : +$('spf').value, t0 = performance.now();
      for (let k = 0; k < n; k++) eng.step();
      simMsFrame = performance.now() - t0;
      if (dbg) { dbg.sim += performance.now() - t0; dbg.steps += n; }
      if (eng2) { eng2.p.T = eng.p.T; eng2.p.mbEps = eng.p.mbEps; for (let k = 0; k < n; k++) eng2.step(); }
      if (game) { if (n) { const m = (performance.now() - t0) / n; msPerStep = msPerStep === null ? m : 0.9 * msPerStep + 0.1 * m; BUDGET_MS = msPerStep > 1.5 ? 25 : BUDGET0; } } else autoSpeed(n, performance.now() - t0);
      if (scan) scanSample();
      stepCount += n;
      const tk = eng.tempKin();
      tkinAvg = tkinAvg === null ? tk : 0.9 * tkinAvg + 0.1 * tk;
      if (frame % ANEVERY[qLevel] === 0) {
        const a0 = dbg ? performance.now() : 0;
        const rep = report(); showReport(rep); if (game) gameUpdate(game.g.value ? game.g.value() : rep.v); else if (guide) guideTick(rep.v); if (classOn) classUpdate();
        push(hist.tset, tset); push(hist.tkin, tkinAvg); push(hist.frac, rep.v);
        $('tkin').textContent = $('tkinM').textContent = tkinAvg.toFixed(2);
        $('rU').textContent = (eng.U / eng.N).toFixed(3);
        $('rTime').textContent = eng.time.toFixed(0) + ' τ';
        if (eng.p.baro) { if (eng.p.P0 !== baroShown) { baroShown = eng.p.P0; if (baroShown !== null) p0Range(baroShown); }
          baroNote(); $('boxinfo').textContent = `L = ${eng.L.toFixed(1)}σ · ${eng.N} ` + T('beads'); }
        const [tlo, thi] = SYS[sys].trange || [0.3, 2.5], tt = [1, 2, 3, 4].map((q) => +(q * thi / 4).toFixed(2));
        plot(pT, [{ data: hist.tset, color: colors.muted, w: 1.5, dash: true }, { data: hist.tkin, color: colors.hot, w: 1.8, dot: true }], 0, thi * 1.04, tt);
        plot(pF, [{ data: hist.frac, color: colors.accent, w: 2, dot: true }], 0, plotMax, [0, plotMax / 2, plotMax]);
        if (scan && frame % 18 === 0) drawThermo();
        if (dbg) dbg.ana += performance.now() - a0;
      }
      frame++;
    }
    if (now - perfT > 1000) { sps = stepCount * 1000 / (now - perfT); stepCount = 0; perfT = now; $('perf').textContent = `${Math.round(sps)} ${T('steps/s')} · ${(sps * eng.p.dt).toFixed(1)} τ/s` + (qLevel ? ' · ' + T('lighter drawing ({q})', { q: qLevel }) : ''); }
    followTick();
    if (coachReady) demoTick(isPhone ? 5 : 7); const dfr = coachReady ? demoFrame() : null;
    if (!dfr && filmCtl) { filmCtl = false; $('tsliderM').value = tset; $('micbarM').style.width = '0%'; tWordShow(); }
    if (qLevel < 3 || (loopN & 1) === 0) { const d0 = performance.now(); if (dfr) drawDemo(dfr); else draw(); const dm = performance.now() - d0; qualityTick(now, dm, frameMs); if (dbg) dbg.draw += dm; } loopN++;
    if (dbg) debugTick(now, frameMs);
    syncBoxStart();
    requestAnimationFrame(loop);
  }

  if (isPhone) { $('size').value = '36'; userBox = '36'; }
  applySysUI();
  function refreshTexts() { // text the script owns, redrawn in the current language
    const S = SYS[sys];
    $('legendItems').innerHTML = S.legend.map(([c, tx]) => `<span><i class="dot" style="background:var(--${c})"></i>${T(tx)}</span>`).join('');
    if (!S.count || sys !== 'mbpoly') $('concLab').textContent = T(S.concLab); else $('concLab').textContent = T(eng && eng.Lc > 1 ? 'Number of chains' : S.concLab);
    $('plotFlab').innerHTML = T(sys === 'mbpoly' && eng && eng.Lc > 1 ? 'Chain self-contact fraction (P–P share of chain contacts)' : S.plotLab); $('byClusterLab').textContent = T(S.hl || '');
    const dg = (S.tstep || 0.01) < 0.01 ? 3 : 2; $('quench').textContent = T('Cool to {t}', { t: S.cold.toFixed(dg - 1) }); $('melt').textContent = T('Heat to {t}', { t: S.hot.toFixed(dg - 1) });
    $('pause').textContent = T(running ? 'Pause' : 'Resume');
    labCache.length = 0; if (eng) { showReport(report()); concNote(); $('boxinfo').textContent = `L = ${eng.L.toFixed(1)}σ · ${eng.N} ` + T('beads'); }
    renderPick();
    if (gameSel && !game && !gameLevel) { $('ggoal').textContent = ''; $('ghint').innerHTML = ''; }
    $('gstart').textContent = T(gstartKey); $('gstartBox').textContent = T(gstartKey);
    if (game) { const g = game.g; $('gvalLab').textContent = T(g.lab); $('hudTitle').textContent = T(g.title) + (game.level ? ' · ' + T('Challenge {k}', { k: game.level }) : '') ; $('hudGoal').textContent = ''; $('hudTip').textContent = ''; /* no goal text or tips above the box */ $('gquit').textContent = T('Give up'); }
    else { $('gquit').textContent = T($('ghud').hidden ? 'Give up' : 'Close'); }
    drawThermo();
  }
  function setLang(l) {
    LANG = I18N[l] || l === 'en' ? l : 'en'; $('lang').value = LANG;
    applyStatic(); refreshTexts(); document.title = T('Shut Up and Get Structured'); barLabels();
    if (typeof tourI !== 'undefined' && tourI >= 0) tourShow(tourI); // an open help tour follows the language
    if (classOn && typeof clsModeUI === 'function') clsModeUI();
    if (fcReady) { renderAlbum(); renderLadder(); ladLabel(); $('fcBack').innerHTML = fcBackArt; if (fcShown) { $('fcFront').innerHTML = fcFace(fcShown[0]); $('fcClose').textContent = T(fcShown[1] ? 'Add to my cards' : 'Close'); } }
    if (coachReady) { tWordShow(); unlockLabel(); renderPick(); if (guide) guideShow(); else if (coachMsg) coachSay(coachMsg[0], coachMsg[2], coachMsg[1]); const rp = $('greplay'); if (!rp.hidden && rp._run) drawReplay(rp._run); }
  }
  // short labels for the phone's bottom bar: a quarter of a narrow screen fits about 10 letters
  const BAR = { en: { game: 'Game', explore: 'Explore', scan: 'Energy scan', opt: 'Options' },
    fi: { game: 'Peli', explore: 'Tutki', scan: 'Skannaus', opt: 'Asetukset' },
    sv: { game: 'Spel', explore: 'Utforska', scan: 'Skanning', opt: 'Alternativ' },
    ru: { game: 'Игра', explore: 'Изучение', scan: 'Скан', opt: 'Настройки' } };
  function barLabels() { const t = BAR[LANG] || BAR.en; document.querySelectorAll('[data-bar]').forEach((el) => { el.textContent = t[el.dataset.bar]; }); }
  $('lang').addEventListener('change', (e) => setLang(e.target.value));
  window.__eng = () => eng; window.__game = () => game; // for tests
  window.__i18nData = () => { const out = [];
    for (const S of Object.values(SYS)) { for (const k of ['concLab', 'plotLab', 'hl']) if (S[k]) out.push(S[k]); for (const [, tx] of S.legend || []) out.push(tx); }
    for (const g of GAMES) out.push(g.title, g.sub, g.goal, g.hint, g.lab, g.lesson.good, g.lesson.bad);
    for (const s of Object.keys(SYS)) { sys = s; try { build(); report().cells.forEach(([l, v]) => { out.push(l); if (typeof v === 'string') out.push(v); }); } catch (e) {} }
    return out; };
  setT(startT()); build(); resize(); fitSim(); drawThermo();
  setLang('en'); // every visit starts in English; the menu in the corner switches language
  setAppMode('game'); /* every visit opens on the games */ requestAnimationFrame((t) => { last = t; perfT = t; loop(t); });
})();
