  // ---------- app modes: explore / game / energy scan ----------
  let appMode = 'explore';
  function setAppMode(m) {
    const fromGame = appMode === 'game' && m !== 'game'; if (m === 'game') follow = null;
    document.querySelector('.wrap').classList.toggle('gamemode', m === 'game');
    if (m !== 'game') { if (game) endGame(null); else if (!$('ghud').hidden) closeHud(); if (coachReady && guide) { guide = null; coachHide(); } if (battle) { battle = null; if (coachReady) coachHide(); } }
    if (m !== 'game' && gameRange) { gameRange = null; applySysUI(); setT(tset); }
    if (m !== 'scan' && scan) stopScan(false);
    appMode = m;
    if (eng && m === 'explore' && !eng.p.baro && baroOn()) { eng.p.baro = true; eng.p.P0 = null; }
    document.querySelectorAll('[data-appmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.appmode === m)));
    document.querySelectorAll('[data-mbmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mbmode === m)));
    placeGraphs();
    if ($('sheetTitle')) $('sheetTitle').textContent = T(m === 'game' ? 'Game' : m === 'scan' ? 'Energy scan' : 'Explore');
    document.querySelectorAll('[data-mode]').forEach((el) => el.classList.toggle('offmode', !el.dataset.mode.split(' ').includes(m)));
    const w = document.querySelector('.wrap'); w.classList.toggle('inscan', m === 'scan');
    if (m === 'game') { if (!gameSel) selectGame(GAMES[0].id); else prepGame(gameSel); }
    if (fromGame) { // games change the start state, box and settings: leave them with the system's normal ordered start, at its coldest setting
      $('initState').value = 'ordered'; $('epsXX').value = $('epsXX').defaultValue; $('epsXXO').textContent = (+$('epsXX').value).toFixed(1);
      applySysUI(); $('size').value = SYS[sys].box ? String(SYS[sys].box) : userBox;
      if (mode !== 'mic') setT(startT()); build();
    }
    resize(); if (m === 'scan') drawThermo();
    if (coachReady) { tWordShow(); zoneMarks(); }
    try { localStorage.setItem('mdlab-mode', m); } catch (e) {}
  }
  document.querySelectorAll('[data-appmode]').forEach((b) => b.addEventListener('click', () => setAppMode(b.dataset.appmode)));


