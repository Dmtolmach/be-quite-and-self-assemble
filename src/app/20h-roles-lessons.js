  // ---------- two audiences: players (children about 10–12) and teachers ----------
  // Player mode: games first, step-by-step unlocking, Daily Molecule, challenges, cards; Explore is a simple sandbox (temperature and
  // amount only) and the technical parts (model parameters, energy scan, readouts, class tools) are hidden.
  // Teacher mode: everything open from the start, the Lessons panel on top, class mode and class battle; no Daily button, streaks or clips.
  // The choice: the two buttons on the welcome card, the switch in the header, or a link with ?teacher (or ?player). Kept as mdlab-role.
  // isTeacher() itself is in 10b-rewards.js, because unlockAll() needs it during start-up.
  function setRole(r, quiet) {
    try { localStorage.setItem('mdlab-role', r); } catch (e) {}
    roleApply(); if (!quiet) say(T(r === 'teacher' ? 'Teacher mode' : 'Player mode'));
  }
  function roleApply(init) { // init: during start-up only the classes, the header button and the lessons (the rest is not ready yet)
    const t = isTeacher(), h = document.documentElement;
    h.classList.toggle('role-teacher', t); h.classList.toggle('role-player', !t);
    const b = $('roleBtn'); b.innerHTML = '<span aria-hidden="true">' + (t ? '👩‍🏫' : '🎮') + '</span><span class="rtxt"> ' + T(t ? 'Teacher' : 'Player') + '</span>'; // phones: the icon only
    b.title = T(t ? 'Teacher mode. Press to switch to player mode.' : 'Player mode. Press to switch to teacher mode.'); b.setAttribute('aria-label', b.title);
    lessonsRender(); if (init) return;
    if (!t && classOn) classExit();
    if (!t && appMode === 'scan') setAppMode('explore');
    applyLocks(); renderPick(); dailyRender(); tWordShow();
  }
  $('roleBtn').addEventListener('click', () => setRole(isTeacher() ? 'player' : 'teacher'));
  $('tTeach').addEventListener('click', () => { markWel(); welcome = false; tourClose(); setRole('teacher'); lessonsOpen(); });
  $('tPlay').addEventListener('click', () => setRole('player', true), true); // runs before the guided first game starts
  (function roleFromLink() { // ?teacher or ?player in the address: a school can bookmark the teacher version
    const q = location.search; if (!/[?&](teacher|player)(=|&|$)/.test(q)) return;
    const t = /[?&]teacher(=|&|$)/.test(q); try { localStorage.setItem('mdlab-role', t ? 'teacher' : 'player'); if (t) localStorage.setItem('mdlab-welcome', '1'); } catch (e) {}
  })();

  // ---- lesson cards (teacher mode): goal, a 10-minute plan, what to point at, questions for the class with short answers ----
  const LESSONS = [
    { id: 'ice', icon: '❄️', title: 'Freezing and slow cooling', explore: 'ice', game: 'ice',
      goal: 'Water freezes when its molecules slow down and lock into place. Cooling slowly gives bigger, clearer crystals.',
      steps: ['Explore → Ice. Make noise: the crystal melts. Be quiet: it freezes again. Blue molecules are ice; a red glow means fast, a blue glow slow.',
        'Class mode → “Grow the biggest ice crystal”. Round 1: everyone goes silent at once. Note the score.',
        'Round 2: start a little noisy, then get quieter slowly. Compare the two scores.'],
      point: 'The glow turns from red to blue first; only then blue honeycomb patches grow.',
      ask: [['Why did going silent at once give less ice?', 'The molecules froze where they were, in a jumble, with no time to find their places.'],
        ['Why is ice from a hotel bar clear and ice from a home freezer cloudy?', 'It is frozen slowly, so the crystals are big and the air can escape.'],
        ['What is different about molecules in warm water?', 'They move faster.']] },
    { id: 'demix', icon: '🫧', title: 'Oil and water', explore: 'demix', game: 'demix',
      goal: 'Some liquids do not mix. Cooling lets them separate, but if it is too cold everything freezes in place.',
      steps: ['Explore → Two liquids. Hot: everything is mixed. Cooler: purple and amber blobs appear and grow.',
        'Make it very cold: the blobs stop growing. Ask why.',
        'Class mode → “Separate oil from water”: try very quiet against medium quiet.'],
      point: 'Small blobs merging into bigger ones; at very cold the picture freezes.',
      ask: [['Why do the blobs get bigger over time?', 'Each liquid prefers its own kind; fewer, bigger blobs have less border.'],
        ['Why does very cold stop the separation?', 'The molecules hardly move, so they cannot reach their own kind.'],
        ['Where do you see liquids that do not mix at home?', 'Salad dressing, oil on soup, mayonnaise (it is held together by egg).']] },
    { id: 'drug', icon: '💊', title: 'Soap and medicine', explore: 'dumbbell', game: 'drug',
      goal: 'Soap molecules have a water-loving head and an oil-loving tail. In water they form balls (micelles) that can carry medicine; warming opens them.',
      steps: ['Explore → Soap molecules. Cold: balls form, tails inside. Hot: they fall apart.',
        'Class mode → “Deliver the drug”: make noise only during the red windows.',
        'Discuss what happened to the drug released at the wrong time.'],
      point: 'Tails hide inside the balls, heads face the water; drug glows yellow when delivered.',
      ask: [['Why do the tails hide inside the balls?', 'They do not like water; inside the ball they only touch other tails.'],
        ['How does soap clean oily hands?', 'The tails grab the oil and the balls carry it away in the water.'],
        ['Why must the noise come at the right moment?', 'Drug released in the wrong place is lost; in medicine it could also do harm.']] },
    { id: 'gel', icon: '🥚', title: 'Boiled egg and jelly', explore: 'crypt', game: 'gel',
      goal: 'Proteins are folded chains. Heat unfolds them, their sticky parts come out and they link into a network: a gel, like egg white turning solid.',
      steps: ['Explore → Proteins. Cold: folded. Warm: they open and clump. Very hot: the clumps fall apart.',
        'Class mode → “Grow the longest gel strand”: heat first, then cool down a little.',
        'If the strand stops growing, heat again and cool: waiting only makes the clumps compact.'],
      point: 'Orange sticky beads coming out of the folds; the red line is the longest strand.',
      ask: [['Why can a boiled egg not become raw again?', 'The unfolded proteins are stuck to each other and cannot fold back.'],
        ['Why does too much heat break the strand?', 'Heat also pulls the sticky links apart.'],
        ['Why does waiting not make the strand longer?', 'The clumps pull together into compact balls, so the long path breaks.']] },
    { id: 'scan', icon: '📈', title: 'What is melting?', explore: 'ice', scan: true,
      goal: 'At the melting point the heat goes into breaking the structure, not into warming it up.',
      steps: ['Explore → Ice → Energy scan → Heating scan. The energy climbs; find the peak in the heat capacity.',
        'Run a cooling scan: freezing happens at a lower temperature than melting.',
        'Open the “Frost needs a start” card from the Ice deck.'],
      point: 'The peak in the heat capacity graph; the gap between heating and cooling.',
      ask: [['Why does a glass of ice water stay at 0 °C while you warm it?', 'The heat is used to melt the ice, not to warm the water.'],
        ['Why does water here freeze colder than it melts?', 'Ice needs a small seed to start growing; until then the water stays liquid.'],
        ['What do the molecules do at the peak?', 'They break their bonds: the crystal turns into liquid.']] },
  ];
  function lessonsRender() {
    const box = $('lessons'); if (!box || !isTeacher()) return;
    const open = [...box.querySelectorAll('details[open]')].map((d) => d.dataset.l);
    box.innerHTML = LESSONS.map((L) => `<details class="lesson" data-l="${L.id}"${open.includes(L.id) ? ' open' : ''}><summary><span aria-hidden="true">${L.icon}</span> ${T(L.title)}</summary>`
      + `<p class="lgoal"><b>${T('Goal:')}</b> ${T(L.goal)}</p><h4>${T('10 minutes')}</h4><ol>${L.steps.map((s) => `<li>${T(s)}</li>`).join('')}</ol>`
      + `<p><b>${T('Point at:')}</b> ${T(L.point)}</p><h4>${T('Ask the class')}</h4><ul class="lask">${L.ask.map(([q, a]) => `<li>${T(q)} <small>${T(a)}</small></li>`).join('')}</ul>`
      + `<div class="btns">${L.game ? `<button class="btn primary" data-lgo="class">${T('Play in class mode')}</button>` : ''}<button class="btn" data-lgo="${L.scan ? 'scan' : 'explore'}">${T(L.scan ? 'Open the energy scan' : 'Open in Explore')}</button></div></details>`).join('');
  }
  $('lessons').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lgo]'); if (!b) return; const L = LESSONS.find((q) => q.id === b.closest('[data-l]').dataset.l); if (!L) return;
    if (b.dataset.lgo === 'class') { setAppMode('game'); selectGame(L.game, true); classEnter(); return; }
    setAppMode('explore'); pickSys(L.explore); if (b.dataset.lgo === 'scan') setAppMode('scan');
    if (typeof sheet === 'function' && phoneUI()) sheet(false);
  });
  function lessonsOpen() { const p = $('lessonPanel'); p.open = true; if (typeof sheet === 'function' && phoneUI()) sheet(true); try { p.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }
  roleApply(true);
  window.__role = () => ({ teacher: isTeacher(), lessons: LESSONS.length }); // for tests
