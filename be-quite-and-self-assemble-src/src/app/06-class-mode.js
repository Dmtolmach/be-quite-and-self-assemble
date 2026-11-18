  // ---------- class mode: one big box on the projector, the whole room's noise sets the temperature ----------
  let classOn = false;
  async function classEnter() {
    if (classOn) return; classOn = true; $('guseMic').checked = true;
    if (appMode === 'scan') setAppMode('explore');
    if (appMode === 'explore') { const ok = BARO_SYS.includes(sys) && $('clsSys').querySelector(`option[value="${sys}"]`); if (!ok) pickSys('ice'); }
    clsModeUI();
    $('clsSys').value = sys;
    document.querySelector('.wrap').classList.add('classmode'); $('clsPanel').hidden = false; $('clsNote').textContent = '';
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch (e) {}
    resize(); classUpdate();
    await setMode('mic'); if (!analyser) $('clsNote').textContent = T('No microphone here: allow microphone access in the browser, or use another device.');
  }
  function classExit() {
    if (!classOn) return; classOn = false;
    document.querySelector('.wrap').classList.remove('classmode'); $('clsPanel').hidden = true;
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    setMode('slider'); resize();
  }
  function classUpdate() { if (!classOn || !eng) return;
    if (appMode === 'game') { // the game's own numbers, big
      const g = game ? game.g : gameSel; $('clsLab').innerHTML = g ? T(g.lab) : '–'; $('clsVal').textContent = game ? $('gval').textContent : '–';
      $('clsLab2').textContent = T('Time left'); $('clsT').textContent = game ? $('gtime').textContent : '–'; $('clsStars').textContent = game ? $('gstars').textContent : '';
      const res = battle ? battleTable() : (!game && $('gres').innerHTML) || ''; if ($('clsRes').innerHTML !== res) $('clsRes').innerHTML = res;
      $('clsStart').disabled = !!game || !!battle;
    } else { const r = report(), [lab, val] = r.cells[0];
      $('clsLab').innerHTML = T(lab); $('clsVal').textContent = val; $('clsLab2').textContent = T('Temperature'); $('clsT').textContent = tset.toFixed((SYS[sys].tstep || 0.01) < 0.01 ? 3 : 2); $('clsStars').textContent = ''; }
    $('clsPause').textContent = T(running ? 'Pause' : 'Resume'); }
  // class mode can show Explore or a game; a game can be played by teams in turn (a class battle)
  function clsModeUI() {
    const gm = appMode === 'game'; document.querySelectorAll('[data-clsmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.clsmode === appMode)));
    $('clsGame').hidden = !gm; $('clsSys').hidden = gm; $('clsPause').hidden = gm; $('clsRes').innerHTML = '';
    $('clsGameSel').innerHTML = GAMES.map((g, i) => (typeof isOpen !== 'function' || isOpen(i) ? `<option value="${g.id}">${T(g.title)}</option>` : '')).join('');
    if (gm && gameSel) $('clsGameSel').value = gameSel.id;
    $('clsGoal').textContent = gm ? (gameSel ? T(gameSel.short) : '') : T('Everyone quiet: the box cools and structures grow. Noise heats it and breaks them.');
    resize(); classUpdate();
  }
  document.querySelectorAll('[data-clsmode]').forEach((b) => b.addEventListener('click', async () => {
    if (b.dataset.clsmode === appMode) return; if (battle) battleStop();
    setAppMode(b.dataset.clsmode); if (appMode === 'explore') { const ok = BARO_SYS.includes(sys) && $('clsSys').querySelector(`option[value="${sys}"]`); if (!ok) pickSys('ice'); $('clsSys').value = sys; }
    clsModeUI(); if (mode !== 'mic') await setMode('mic');
  }));
  $('clsGameSel').addEventListener('change', () => { selectGame($('clsGameSel').value); clsModeUI(); });
  $('clsStart').addEventListener('click', () => {
    if (!gameSel || game || battle) return; $('guseMic').checked = true; $('clsRes').innerHTML = '';
    if ($('clsTeams').checked) { $('bTeams').value = $('clsTeamN').value; battleStart(); } else startGame();
    classUpdate();
  });
  function pickSys(id) { const b = document.querySelector(`[data-pick="${id}"]`); if (b) b.click(); }
  $('classBtn').addEventListener('click', classEnter);
  $('clsExit').addEventListener('click', classExit);
  $('clsSys').addEventListener('change', () => { pickSys($('clsSys').value); if (mode !== 'mic') setMode('mic'); resize(); classUpdate(); });
  $('clsCalib').addEventListener('click', () => { $('calib').click(); });
  $('clsSetup').addEventListener('click', () => micWizard());
  $('clsPause').addEventListener('click', () => { $('pause').click(); classUpdate(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && classOn && tourI < 0) classExit(); });
  document.addEventListener('fullscreenchange', () => { if (classOn) resize(); });

