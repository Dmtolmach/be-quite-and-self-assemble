  // ---------- speed run: reach a structure as fast as you can, with the numbers hidden, so the eyes stay on the molecules ----------
  // Opens for a game once it has 3 stars (or with Teacher options → Unlock everything). The run ends when the smoothed score has stayed at the
  // target for SPEED_HOLD s; the time is when it first got there. Targets and star times from tools/calibration/speedcal.js (good play: ice ~10–15 s,
  // liquids ~24–30 s, gel ~17–20 s; silence alone never gets there in ice and liquids, and in gel only slowly).
  const SPEED_HOLD = 1.5, SPEED_BAR = 120; // no time limit; the time bar (with the drug's red windows) spans the first 2 minutes
  // Targets as set by the author. With fixed strategies (speedcal.js, up to 400 s): ice 0.75 in 104–217 s; liquids peak ~0.80 and gel ~186 σ,
  // so 0.95 and 200 σ need better play than any fixed strategy tried; their star times are guesses until real players set records. A run ends only at the goal, with Give up, or (drug) when too much drug is lost.
  const SPEED = {
    ice: { target: 0.75, t: [Infinity, 200, 120], goal: 'Freeze the water into ice: it turns blue. As fast as you can!' },
    demix: { target: 0.95, t: [Infinity, 500, 300], goal: 'Separate the two liquids into big regions of their own colour. As fast as you can!' },
    drug: { target: 80, t: [Infinity, 40, 25], goal: 'Release the drug only in the red windows. As fast as you can!' },
    gel: { target: 200, t: [Infinity, 240, 120], goal: 'Link the proteins into one long gel strand (the red line). As fast as you can!' },
  };
  let speedMode = false;
  function speedOpen(g) { if (!g || !SPEED[g.id]) return false; if (unlockAll()) return true; const b = getBest(g); return b !== null && starsFor(g, b) === 3; }
  function speedBest(g) { try { const x = localStorage.getItem('mdlab-speed-' + g.id); return x === null ? null : +x; } catch (e) { return null; } }
  function speedSeg() { // Classic | ⏱ Speed run, under the games, for a game that has it
    const el = $('gspeed'), g = gameSel, on = speedOpen(g); el.hidden = !on; if (!on) return;
    const b = speedBest(g);
    el.innerHTML = `<button data-speed="0" aria-pressed="${!speedMode}">${T('Classic: 30 s')}</button><button data-speed="1" data-reward="speed" aria-pressed="${speedMode}">⏱ ${T('Speed run')}${b !== null ? ` <small>${T('fastest {t}', { t: b.toFixed(1) + ' s' })}</small>` : ''}</button>`;
  }
  $('gspeed').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (!b || game) return; speedMode = b.dataset.speed === '1'; speedSeg(); if (typeof applyLocks === 'function') applyLocks(); });
  function speedUpdate(G, v) {
    const g = G.g, sp = G.speed, now = eng.time, dt = now - G.last; G.last = now;
    G.ema = G.ema === null || g.raw ? v : G.ema + (1 - Math.exp(-dt / 2.0)) * (v - G.ema);
    const s = GAME_SEC * (now - G.t0) / g.D;
    if (!G.cd) gameSounds(G, g);
    $('gtime').textContent = T('{n} s', { n: s.toFixed(1) }); $('gval').textContent = g.fmt(Math.max(0, G.ema));
    $('gnow').style.left = (100 * Math.max(0, Math.min(1, G.ema / (g.scale || 1)))) + '%'; $('gbar').style.width = (100 * Math.min(1, s / SPEED_BAR)) + '%';
    if (!G.rec.length || s - G.rec[G.rec.length - 1].s >= 0.25) G.rec.push({ s, T: tset, v: G.ema, d: 0, l: 0, z: false });
    if (G.ema >= sp.target) { if (G.since === undefined) { G.since = s; G.snap = takeSnap(); }
      if (s - G.since >= SPEED_HOLD) { G.doneAt = G.since; G.peakSec = G.since; endGame('done'); return; } }
    else G.since = undefined;
    if (g.id === 'drug' && eng.nDrug && G.lost > (1 - sp.target / 100) * eng.nDrug) { G.failLost = true; endGame('done'); } // the goal can no longer be reached
  }
  function speedEnd(G) {
    const g = G.g, sp = G.speed, t = G.doneAt, st = t === undefined ? 0 : t <= sp.t[2] ? 3 : t <= sp.t[1] ? 2 : 1, b = speedBest(g), rec = t !== undefined && (b === null || t < b);
    if (rec) { try { localStorage.setItem('mdlab-speed-' + g.id, t.toFixed(2)); } catch (e) {} }
    $('hudGoal').textContent = ''; $('gagain').hidden = false; $('greplay').hidden = true;
    if (G.snap) { restoreSnap(G.snap); running = false; $('pause').textContent = T('Resume'); showReport(report()); }
    $('gres').textContent = ''; $('gtime').textContent = t === undefined ? '–' : T('{n} s', { n: t.toFixed(1) }); // the clock shows the result, not the end of the 1.5 s check
    const card = st === 3 ? fcGive(FC_ALL.filter((c) => c.deck.speed === g.id)) : null; // three stars: a card from this game's speed-run deck
    renderPick();
    const gs = Object.assign({}, g, { fmt: (x) => x.toFixed(1) + ' s' });
    endScreen({ G, g: gs, st, v: t === undefined ? 0 : t, rec, best: null, noPic: true, speedRun: true, tip: '', card,
      extra: t === undefined ? T('Too much drug was released outside the red windows: {n} can no longer be reached.', { n: g.fmt(sp.target) }) : b !== null && !rec ? T('Your fastest: {t}', { t: b.toFixed(1) + ' s' }) : T('Stars: under {a} s ★★★, under {b} s ★★.', { a: sp.t[2], b: sp.t[1] }) });
  }
  function speedHud(G) { // the score now, the goal, the clock and your fastest time: all written out
    const g = G.g, sp = G.speed, b = speedBest(g);
    $('gvalLab').textContent = T(g.lab) + ' ' + T('now'); $('gval').textContent = g.fmt(0);
    $('gpeakLab').textContent = T('Goal'); $('gpeak').textContent = g.fmt(sp.target);
    $('gtimeLab').textContent = T('Time'); $('gtime').textContent = T('{n} s', { n: '0.0' });
    $('gstarsLab').textContent = T('Fastest'); $('gstars').textContent = b === null ? '–' : T('{n} s', { n: b.toFixed(1) }); $('gstars').className = '';
    const band = $('gband'); band.querySelectorAll('.tick').forEach((x) => x.remove());
    const d = document.createElement('div'); d.className = 'tick goal'; d.style.left = (100 * sp.target / (g.scale || 1)) + '%'; d.textContent = '🏁 ' + g.fmt(sp.target); band.appendChild(d);
  }
