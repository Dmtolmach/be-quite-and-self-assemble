  // ---------- challenges: once all six cards of a game are collected, five harder levels; a star opens the next; no tips ----------
  const LADDER = 5, AF_LEVELS = [8, 16, 24, 32, 40]; // antifreeze per ice challenge: following the green path gives about 53, 45, 44, 40 and 36% ice (one star at 35%)
  const ladAll = () => { try { return localStorage.getItem('mdlab-ladall') === '1'; } catch (e) { return false; } };
  const deckDone = (g) => { if (ladAll()) return true; const own = fcOwned(); return FC_ALL.filter((c) => c.deck.game === g.id).every((c) => own.includes(c.id)); };
  const ladGet = (g) => { try { return JSON.parse(localStorage.getItem('mdlab-ladder-' + g.id) || '{}') || {}; } catch (e) { return {}; } }; // level -> best stars
  const ladSet = (g, k, st) => { const o = ladGet(g); o[k] = Math.max(o[k] || 0, st); try { localStorage.setItem('mdlab-ladder-' + g.id, JSON.stringify(o)); } catch (e) {} };
  const ladOpen = (g, k) => ladAll() || k === 1 || (ladGet(g)[k - 1] || 0) >= 1;
  const ladLabel = () => { $('ladUnlock').textContent = T(ladAll() ? 'Lock the challenges again' : 'Unlock all challenges'); };
  $('ladUnlock').addEventListener('click', () => { try { localStorage.setItem('mdlab-ladall', ladAll() ? '0' : '1'); } catch (e) {} ladLabel(); renderLadder(); });
  function ladTwist(g, k) { // what makes level k harder
    if (g.id === 'ice') return { af: AF_LEVELS[k - 1], txt: ['Antifreeze particles appear one by one during the run: {n} by the end.', { n: AF_LEVELS[k - 1] }] };
    if (g.id === 'demix') return { waveAmp: 0.12 * (k + 1), waveGap: 7.5 - 0.9 * k, waveLen: 1.5 + 0.4 * k, txt: ['Heat waves hit the box: level {k} of 5, stronger and more often each level. Get quieter when one comes.', { k }] };
    if (g.id === 'drug') return { bandK: 1 - 0.06 * (k - 1), flowK: 1 + 0.07 * (k - 1), spill: 0.39 + 0.04 * (k - 1), txt: [k === 1 ? 'New rules: blood flow carries the micelles through a red tumour zone. Heat while a micelle is in the zone.' : 'The tumour is narrower, the blood flows faster and more heat leaks out.', {}] };
    return { conc: 35 - 2 * k, txt: ['Fewer proteins: {n}.', { n: 35 - 2 * k }] };
  }
  function twistTick(G, s) {
    if (G.af) { const want = Math.round(G.af * Math.min(1, s / 25)), ty = eng.type; let have = 0; for (let i = 0; i < eng.N; i++) if (ty[i] === 3) have++;
      for (let guard = 0; have < want && guard < 50 * eng.N; guard++) { const j = Math.floor(Math.random() * eng.N); if (ty[j] === 7) { ty[j] = 3; have++; } } }
    if (G.waves) { const w = G.waves.find(([a, b]) => s >= a && s < b), bump = w ? w[2] : 0, soon = !w && G.waves.some(([a]) => a > s && a - s < 1.3);
      if (soon && !G.warned) { G.warned = true; coachSay('Heat wave coming!', 'warn'); } // announced a moment before the heat arrives
      if (bump !== G.bump) { G.bump = bump; eng.p.T = tset + bump; if (bump) coachSay('Heat wave!', 'bad'); else { coachHide(); G.warned = false; } } }
  }
  function renderLadder() {
    const games = GAMES.filter((g) => deckDone(g));
    $('ladder').innerHTML = games.length ? `<h3>${T('Challenges')}</h3>` + games.map((g) => { const o = ladGet(g);
      return `<div class="ladrow"><span>${T(g.title)}</span><div class="ladbtns">` + Array.from({ length: LADDER }, (_, i) => { const k = i + 1, open = ladOpen(g, k), st = o[k] || 0;
        return `<button data-lad="${g.id}:${k}" ${open ? '' : 'disabled'} aria-pressed="${gameSel === g && gameLevel === k}" title="${T('Challenge {k}', { k })}">${open ? k : '🔒'}<small>${st ? '★'.repeat(st) : ''}</small></button>`; }).join('') + '</div></div>'; }).join('')
      : '';
  }
  function selectLevel(id, k) {
    const g = GAMES.find((x) => x.id === id); if (!g || !ladOpen(g, k)) return;
    selectGame(id); gameLevel = k; const tw = ladTwist(g, k);
    $('ggoal').innerHTML = `<b>${T('Challenge {k}', { k })}.</b> ${T(tw.txt[0], tw.txt[1])} ${T('No tips in challenges.')}`;
    gstartKey = 'Start'; $('gstart').textContent = T('Start'); prepGame(gameCfg(g)); renderLadder();
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-lad]'); if (!b || b.disabled) return; const [id, k] = b.dataset.lad.split(':'); selectLevel(id, +k);
    if (b.closest('#gres')) startGame(); else if (typeof sheet === 'function' && phoneUI()) sheet(false); });
  function ladderEnd(G) {
    const g = G.g, st = starsFor(g, G.peak), k = G.level, was = ladGet(g)[k] || 0; ladSet(g, k, st);
    $('hudGoal').textContent = $('hudTip').textContent = ''; $('gagain').hidden = false;
    if (G.snap) { restoreSnap(G.snap); running = false; $('pause').textContent = T('Resume'); showReport(report()); }
    const cleared = st >= 1, next = cleared && k < LADDER;
    $('gres').innerHTML = `<span class="big">${starStr(st)}</span> <b>${T('Challenge {k}', { k })}: ${T('Score {s}', { s: g.fmt(G.peak) })}</b>. ` +
      (cleared ? (k < LADDER ? T('Cleared! Challenge {n} is open.', { n: k + 1 }) : T('All five challenges cleared!')) : T('Not cleared: you need at least one star.')) +
      (st > was && was ? ' ' + T('New best for this challenge.') : '') + (next ? ` <button class="btn primary" data-lad="${g.id}:${k + 1}">${T('Next challenge')}</button>` : '');
    renderLadder(); drawReplay(G);
    endScreen({ G, g, st, v: G.peak, rec: st > was && !!was, best: null, extra: cleared ? (k < LADDER ? T('Cleared! Challenge {n} is open.', { n: k + 1 }) : T('All five challenges cleared!')) : T('Not cleared: you need at least one star.'), tip: '',
      next: next ? { label: T('Challenge {k}', { k: k + 1 }), go: () => { selectLevel(g.id, k + 1); startGame(); } } : null });
  }
  renderLadder(); ladLabel();

