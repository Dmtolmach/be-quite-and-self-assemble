  // ---------- step by step: a new player sees one game; every finished game opens one more thing ----------
  // Order of the rewards; Class mode, Help, the language, the microphone settings and Teacher options are always there. Teacher options → Unlock everything opens all at once.
  const SYS_NEW = 'A new system to explore.';
  const REWARDS = [
    { id: 'demix', name: 'Separate the liquids', where: 'A new game in the list of games.' },
    { id: 'drug', name: 'Deliver the drug', where: 'A new game in the list of games.' },
    { id: 'explore', name: 'Explore mode', where: 'Try ice freely in the Explore tab; more systems open as you play.' },
    { id: 'sys-demix', name: 'Two liquids', where: SYS_NEW },
    { id: 'gel', name: 'Grow the longest gel strand', where: 'A new game in the list of games.' },
    { id: 'sys-dumbbell', name: 'Soap molecules', where: SYS_NEW },
    { id: 'scan', name: 'Energy scan', where: 'Measure where a structure melts: in Explore.' },
    { id: 'sys-crypt', name: 'Proteins', where: SYS_NEW },
    { id: 'sys-polymer', name: 'Plastic', where: SYS_NEW },
    { id: 'stats', name: 'Statistics', where: 'Your games on this device, under the box.' },
    { id: 'sys-lcst', name: 'Polymer chains', where: SYS_NEW },
    { id: 'sys-mbpoly', name: 'Oily particles', where: SYS_NEW },
  ]; // Explore starts with Ice; each of its other systems opens one at a time
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
    document.querySelectorAll('#sysPanel [data-pick]').forEach((b) => b.classList.toggle('lockedsys', !rewardOpen('sys-' + b.dataset.pick)));
    if (locksLive && (appMode === 'explore' || appMode === 'scan') && !rewardOpen('sys-' + sys)) { const b = document.querySelector('[data-pick="ice"]'); if (b) b.click(); } // a game left a system that Explore has not opened yet
    let fresh = null; try { fresh = localStorage.getItem('mdlab-fresh'); } catch (e) {}
    document.querySelectorAll('.fresh').forEach((el) => { const id = el.dataset.reward || el.dataset.game || (el.dataset.pick ? 'sys-' + el.dataset.pick : ''); if (id !== fresh) el.classList.remove('fresh'); });
    if (fresh) document.querySelectorAll(`[data-reward="${fresh}"], #gpick [data-game="${fresh}"], #sysPanel [data-pick="${fresh.replace('sys-', '')}"]`).forEach((el) => el.classList.add('fresh'));
  }
  document.addEventListener('click', (e) => { const el = e.target.closest('.fresh'); if (!el) return; // the new thing has been found: stop pointing at it
    try { localStorage.removeItem('mdlab-fresh'); } catch (er) {} document.querySelectorAll('.fresh').forEach((x) => x.classList.remove('fresh')); });
