  // ---------- step by step: a new player sees one game; every finished game opens one more thing ----------
  // Order of the rewards; Class mode, Help, the language, the microphone settings and Teacher options are always there. Teacher options → Unlock everything opens all at once.
  const REWARDS = [
    { id: 'demix', name: 'Separate the liquids', where: 'A new game in the list of games.' },
    { id: 'drug', name: 'Deliver the drug', where: 'A new game in the list of games.' },
    { id: 'explore', name: 'Explore mode', where: 'Try every system freely: the Explore tab.' },
    { id: 'gel', name: 'Grow the longest gel strand', where: 'A new game in the list of games.' },
    { id: 'scan', name: 'Energy scan', where: 'Measure where a structure melts: in Explore.' },
    { id: 'stats', name: 'Statistics', where: 'Your games on this device, under the box.' },
  ];
  const unlockAll = () => { try { return localStorage.getItem('mdlab-unlock') === '1'; } catch (e) { return false; } };
  function gamesPlayed() { // finished games in this browser; a returning player (from before this counter) keeps what the statistics show
    try { const v = localStorage.getItem('mdlab-played'); if (v !== null) return +v || 0; } catch (e) {}
    return GAMES.reduce((a, g) => a + getStats(g).n, 0);
  }
  const rewardOpen = (id) => { if (unlockAll()) return true; const k = REWARDS.findIndex((r) => r.id === id); return k < 0 || k < gamesPlayed(); };
  let lastReward = null; // shown on the next end card
  var locksLive = false; // set at the end of start-up; before that, only classes change
  function rewardStep() { // one more finished game; returns the reward it opens, if any
    const n = gamesPlayed(), was = unlockAll(); try { localStorage.setItem('mdlab-played', String(n + 1)); } catch (e) {}
    const r = !was && n < REWARDS.length ? REWARDS[n] : null; lastReward = r;
    if (r) { try { localStorage.setItem('mdlab-fresh', r.id); } catch (e) {} }
    applyLocks(); return r;
  }
  function applyLocks() { // hide what is not open yet
    const w = document.querySelector('.wrap'); if (!w) return;
    for (const id of ['explore', 'scan', 'stats']) w.classList.toggle('lock-' + id, !rewardOpen(id));
    let cards = 0; try { cards = fcOwned().length; } catch (e) {}
    w.classList.toggle('lock-cards', !cards && !rewardOpen('stats'));
    if (locksLive && !rewardOpen('explore') && (appMode === 'explore' || appMode === 'scan')) setAppMode('game');
    if (locksLive && !rewardOpen('scan') && appMode === 'scan') setAppMode('explore');
    let fresh = null; try { fresh = localStorage.getItem('mdlab-fresh'); } catch (e) {}
    document.querySelectorAll('.fresh').forEach((el) => { const id = el.dataset.reward || el.dataset.game; if (id !== fresh) el.classList.remove('fresh'); });
    if (fresh) document.querySelectorAll(`[data-reward="${fresh}"], #gpick [data-game="${fresh}"]`).forEach((el) => el.classList.add('fresh'));
  }
  document.addEventListener('click', (e) => { const el = e.target.closest('.fresh'); if (!el) return; // the new thing has been found: stop pointing at it
    try { localStorage.removeItem('mdlab-fresh'); } catch (er) {} document.querySelectorAll('.fresh').forEach((x) => x.classList.remove('fresh')); });
