  // ---------- game: 30 seconds to reach the best possible state ----------
  // Each game runs a fixed amount of simulation time D, paced to take 30 s (longer on a device too slow to keep up), so scores are comparable.
  // Star thresholds come from headless runs over 3 seeds: going silent at once (deep quench) scores below one star in every game;
  // the best scores need slow cooling (ice) or a cool-but-not-frozen temperature (liquids, block chains).
  const GAME_SEC = 30;
  // drug game: free drug (fewer than 2 tail neighbours) is delivered when it is released inside the tumour band, lost outside it
  let drugLast = 0;
  function drugTick() {
    const G = game; if (!G || !eng.nDrug) return drugLast;
    const r = eng.drugStats(1.5, 2), t = eng.time - G.t0, inW = G.win ? G.win.some(([a, b]) => t >= a && t < b) : false;
    // the tumour version counts a drug once it has had fewer than 2 tail neighbours for 1 time unit in a row, so short wobbles of a cold micelle do not count
    const dts = Math.max(0, eng.time - (G.relT === undefined ? eng.time : G.relT)); G.relT = eng.time; if (!G.win && !G.pc) G.pc = new Float32Array(eng.N);
    for (let i = 0; i < eng.N; i++) { if (eng.type[i] !== 4) continue; let go = r.cnt[i] < 2;
      if (!G.win) { G.pc[i] = go ? G.pc[i] + dts : 0; go = G.pc[i] >= 1.0; }
      if (go) { if (G.win ? inW : inTumour(eng.x[i])) { eng.type[i] = 3; G.del++; } else { eng.type[i] = 6; G.lost++; } } }
    drugLast = 100 * G.del / eng.nDrug; return drugLast;
  }
  function inTumour(x) { // delivery counts in the band, from 3 σ before it (the edge of a micelle that is entering) to 4 σ after it (drug the stream has just carried out)
    const hb = eng.p.hotBand; if (!hb) return false; let b = x - hb.x0 + 3; b -= eng.L * Math.floor(b / eng.L); return b < hb.w + 7; }
  function inBand(x, m) { const hb = eng.p.hotBand; if (!hb) return false; let b = x - hb.x0 + (m || 0); b -= eng.L * Math.floor(b / eng.L); return b < hb.w + 2 * (m || 0); }
  function micInBand(ahead) { // a loaded micelle (held drug) inside the tumour band, or within `ahead` upstream of it
    if (!eng.p.hotBand) return false; for (let i = 0; i < eng.N; i++) if (eng.type[i] === 4) { const hb = eng.p.hotBand; let b = eng.x[i] - hb.x0 + (ahead || 0); b -= eng.L * Math.floor(b / eng.L); if (b < hb.w + (ahead || 0)) return true; } return false; }
  function drugWindow() { const G = game; if (!G || !G.win) return null; const t = eng.time - G.t0;
    for (const [a, b] of G.win) { if (t >= a && t < b) return { on: true, left: (b - t) / G.rate }; if (t < a) return { on: false, left: (a - t) / G.rate }; } return { on: false, left: null }; }
  // heat that leaks out of the tumour grows with the square of the noise: medium noise leaves the rest of the body cool, loud noise warms it enough to open micelles there
  function toutOf(G, Tz) { const g = G.g, [lo, hi] = g.range, c = G.spill || g.spill || 0, f = Math.max(0, (Tz - lo) / (hi - lo)); return lo + c * (hi - lo) * f * f; }
  const DRUG_X0 = 0.6 * 48 / Math.sqrt(0.6); // left edge of the tumour band in the drug game's box (48 beads across at density 0.6)
  const GAMES = [
    { id: 'ice', title: 'Grow the biggest ice crystal', sub: 'Ice · slow cooling wins', sys: 'ice', ordered: false, range: [0.02, 0.30], D: 150,
      lab: 'Ice', fmt: (v) => pct(v), stars: [0.35, 0.47, 0.56],
      // the green path: start warm and cool slowly (annealing), then stay quiet for the last seconds; test runs that followed it reached 2-3 stars
      path: (s) => { const c = 0.17 - 0.12 * Math.min(1, s / 25); return [s >= 24 ? 0.02 : c - 0.025, c + 0.025]; },
      words: [0.07, 0.16, 0.21], rise: 0.01,
      dz: { hot: 'You were warmer than the green path for {p}% of the game, so the ice melted or could not grow. Cool down step by step.',
        coldEarly: 'You went quiet right away: the water froze into a jumble before crystals could grow.',
        cold: 'You were colder than the green path for {p}% of the game: cooling that fast freezes a jumble. Cool more slowly.',
        top: 'You cooled slowly along the green path for {p}% of the game. Excellent!',
        inGood: 'You followed the green path for {p}% of the game. Nice! If the ice stops growing, try a short burst of noise and cool again.',
        inBad: 'You followed the green path for only {p}% of the game. Start warm, then cool down slowly with it.' },
      short: "Turn as much of the water into ice as you can within 30 seconds.", goal: 'Turn as much water into ice as you can. Quiet cools the box, noise warms it. Your score is the most ice you reach. The water starts liquid; when it cools, its molecules can lock into a neat honeycomb pattern: ice.', facts: ["Almost every snowflake has six arms. The six-fold shape comes from the honeycomb arrangement of water molecules in ice.", "Ice is lighter than liquid water, so it floats. That is why lakes freeze from the top down and fish survive the winter below.", "Very pure water can stay liquid well below 0 °C. Cloud droplets can stay liquid down to about −40 °C before they freeze."],
      hint: 'Start warm, then cool down slowly along the green path and stay quiet at the end. If the ice stops growing, a short burst of noise melts the badly packed bits; then cool again.',
      lesson: { good: 'Cooling slowly gave the molecules time to find their places in the honeycomb, so the crystals grew large. This is annealing: how glassmakers and metal workers make strong, clear materials.',
        bad: 'Cooled too fast, the molecules lock in wherever they happen to be; kept at one temperature, the crystals grow too slowly or melt again. Start warm, cool step by step, and if growth stalls, heat briefly and cool again.' } },
    { id: 'demix', title: 'Separate the liquids', sub: 'Two liquids · not too cold', sys: 'demix', ordered: false, range: [0.02, 1.0], D: 90, box: '36',
      lab: 'Separation', fmt: (v) => v.toFixed(2), stars: [0.40, 0.55, 0.75],
      zone: [0.27, 0.42], words: [0.27, 0.42, 0.65], rise: 0.01, // separates fastest around 0.3-0.36; colder the molecules hardly move, warmer they mix
      cz: { hot: 'Too warm: the liquids mix again. Get quieter!', cold: 'Too cold: the molecules are stuck in place. A little noise!',
        good: 'Good: the blobs are growing. Keep it like this.', flat: 'In the green zone. Hold it there.' },
      dz: { hot: 'You were too warm for {p}% of the game, so the liquids kept mixing.', cold: 'You were too cold for {p}% of the game, so the molecules could not move to their own kind.' },
      short: "Separate the two mixed liquids as much as you can within 30 seconds.", goal: 'Separate the two liquids as much as you can. Your score is the best separation: 0 is fully mixed, 1 is fully separated. Each kind of molecule prefers its own kind, like oil and water.', facts: ["Mayonnaise is oil and water that stay mixed: molecules from egg yolk coat the oil droplets and stop them from joining up.", "Inside living cells, some proteins separate from the surrounding liquid into droplets, like oil in water. These droplets work as tiny rooms without walls.", "Shaking an oil-and-vinegar dressing mixes it only for a while: the droplets slowly merge and the two liquids separate again."],
      hint: 'Total silence freezes the molecules before they can sort themselves: no star. Find a level that is cold enough to separate but warm enough to move.',
      lesson: { good: 'Cool enough that the molecules prefer their own kind, warm enough that they can still move: the blobs grow quickly. Too cold, and everything freezes in place.',
        bad: 'Very cold molecules hardly move, so they stay stuck next to the wrong neighbours. Try a little noise to keep them moving.' } },
    { id: 'drug', title: 'Deliver the drug', sub: 'Soap molecules · hit the target windows', sys: 'dumbbell', ordered: true, range: [0.4, 2.5], D: 60, box: '48', conc: 34,
      prm: { nDrug: 90, drugPerMic: 3, extraTails: 3, preSteps: 1000, epsDB: 2.5, epsBB: 2.5, epsAS: 0, sigA: 1.0 }, raw: true, noSnap: true, side: 'Lost',
      lab: 'Delivered', fmt: (v) => v.toFixed(0) + '%', stars: [30, 45, 70], scale: 100, hotT: 1.35,
      setup: (G) => { const w = []; let a = 6 + 4 * Math.random(); const W = 8 / 2.25; /* windows ≈ 1.8 s of play each */ while (a + W <= 58) { w.push([a, a + W]); a += W + 5 + 4 * Math.random(); } G.win = w; G.del = 0; G.lost = 0; },
      value: () => drugTick(),
      // challenges use a tumour zone instead: blood flow (flowU) carries three micelles through a heated band; some heat (spill) leaks outside
      tumour: { sub: 'Soap molecules · heat the tumour', range: [0.4, 5.0], prm: { nDrug: 15, drugPerMic: 5, extraTails: 3, preSteps: 1000, epsDB: 2.5, epsBB: 2.5, epsAS: 0, sigA: 1.0, drugXs: [2, 18, 34].map((d) => DRUG_X0 - d) },
        stars: [35, 50, 65], hotT: 2.5, flowU: 0.8, bandW: 10, spill: 0.39, /* three micelles arrive one by one; medium noise opens them in the zone only, loud noise (or noise all the time at higher levels) leaks enough heat to open them outside too. safeT follows the level's spill */ setup: (G) => { G.win = null; G.del = 0; G.lost = 0; },
        short: "Make noise when a micelle is in the red tumour zone.", goal: 'Blood flow carries micelles full of drug (stars) through the red tumour zone. Noise heats the tumour and opens the micelles there. Drug released in the tumour is delivered and turns yellow; drug released anywhere else is lost and turns grey. Some heat leaks outside the tumour, so long noise wastes drug.',
        hint: 'Micelles need a few seconds of heat to open, so start the noise as a micelle enters the red zone and stop when it leaves. A steady medium noise often works better than shouting all the time.', lesson: { good: 'You heated the tumour while the carriers passed through it, so they opened where the drug was needed. Temperature-sensitive carriers are designed to do just this at a warmed tumour.', bad: 'Heat leaks into healthy tissue, and carriers there open too. Heat when a micelle is in the tumour and keep quiet in between.' } },
      short: "Heat only in the red windows to deliver the drug (stars).", goal: 'Deliver as much drug (stars) as you can at the right moment. Heat only during the red target windows. Drug released at any other time is lost and turns grey; delivered drug turns yellow. The micelles carry the drug in their oily cores, and heat breaks them open.', facts: ["The first nanoparticle cancer medicine, Doxil, was approved in 1995. It carries the drug inside tiny bubbles made of lipids, the molecules of cell membranes.", "Heat-triggered carriers are being tested in medicine: some release their drug when a tumour is warmed just above body temperature, to about 40–42 °C.", "Soap works like these micelles: grease hides in the oily cores of soap micelles and is rinsed away with the water."],
      hint: 'The micelles need a moment to open, so start the noise just before a window and stop just before it ends. Stay quiet between windows so the micelles hold on to the rest.',
      lesson: { good: 'Short, well-timed bursts of heat opened the micelles exactly when the drug was needed, and the cold kept it locked inside the rest of the time. Temperature-sensitive carriers are designed to do just this at a warmed tumour.',
        bad: 'Heat frees the drug a little after it starts and keeps freeing it for a moment after it stops, so late or long bursts waste it. Watch the windows on the time bar and start a little early.' } },
    { id: 'gel', title: 'Grow the longest gel strand', sub: '35 proteins', sys: 'crypt', ordered: true, range: [0.6, 7.0], D: 90, box: '48', conc: 35, epsXX: 5,
      lab: 'Gel path', fmt: (v) => v.toFixed(0) + ' σ', stars: [50, 75, 130], scale: 200, openT: 2.2, tooHot: 4.5, openSec: 4, rise: 3, words: [1.4, 2.2, 4.5], value: () => { gelShow = eng.gelPath(1.5, 2); return gelShow.len; },
      short: "Link the proteins into the longest gel strand you can within 30 seconds.", goal: 'Link the proteins into the longest gel strand you can. Your score is the longest path through the gel, from protein to protein (red line); the box is 62 σ wide. The proteins start folded, with their sticky beads hidden inside. Two proteins are linked when they share at least two sticky contacts.', facts: ["Boiling an egg turns the clear egg white solid: heat unfolds its proteins, and they stick together into a gel.", "Gelatin jelly melts at about 30–35 °C, a little below body temperature. That is why it melts in your mouth.", "Tofu is a protein gel: soy milk is heated, then salts such as magnesium chloride make the soy proteins clump together."],
      hint: 'Folded proteins cannot link, and boiling breaks the links. Heat to open the folds, then cool well down so the links hold and the network grows.',
      lesson: { good: 'Heating opened the folds and exposed the sticky beads, cooling let the links hold, and the clumps joined into a long network. This is how heated egg white or gelatin-like protein solutions set into a gel.',
        bad: 'A gel needs both steps: heat to expose the sticky beads, then cooler conditions so the links last long enough for clumps to join. Try heating for a third of the time, then going quieter.' } },
  ];
  function gameCfg(base) { const g = base || gameSel; if (!g || !gameLevel || !g.tumour) return g; return g._zv || (g._zv = Object.assign({}, g, g.tumour)); }
  let game = null, gameSel = null, gameRange = null, gameCarry = 0;
  const curRange = () => gameRange || SYS[sys].trange || [0.3, 2.5];
  const bestKey = (g) => 'mdlab-best2-' + g.id;
  const getBest = (g) => { try { const v = localStorage.getItem(bestKey(g)); return v ? +v : null; } catch (e) { return null; } };
  const setBest = (g, v) => { try { localStorage.setItem(bestKey(g), String(v)); } catch (e) {} };
  // per-game statistics, kept in this browser: number of games, sum of scores, best score
  const statKey = (g) => 'mdlab-stats-' + g.id;
  const getStats = (g) => { try { const s = JSON.parse(localStorage.getItem(statKey(g)) || 'null'); if (s && s.n > 0) return s; } catch (e) {}
    const b = getBest(g); return b !== null ? { n: 0, sum: 0, max: b } : { n: 0, sum: 0, max: null }; };
  const addStat = (g, v) => { const s = getStats(g); s.n++; s.sum += v; s.max = s.max === null ? v : Math.max(s.max, v); try { localStorage.setItem(statKey(g), JSON.stringify(s)); } catch (e) {} return s; };
  function renderStats() {
    $('gstatsBody').innerHTML = GAMES.map((g) => { const s = getStats(g);
      return `<tr><td>${T(g.title)}</td><td>${s.n}</td><td>${s.n ? g.fmt(s.sum / s.n) : '–'}</td><td>${s.max !== null ? g.fmt(s.max) + ' ' + starStr(starsFor(g, s.max)) : '–'}</td></tr>`; }).join('');
  }
  $('gstatsReset').addEventListener('click', () => { for (const g of GAMES) { try { localStorage.removeItem(statKey(g)); localStorage.removeItem(bestKey(g)); } catch (e) {} } renderStats(); renderPick(); });
  const starsFor = (g, v) => g.stars.filter((s) => v >= s).length;
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function renderPick() {
    if ($('gstatsBody')) renderStats();
    $('gpick').innerHTML = GAMES.map((g, i) => { const b = getBest(g);
      if (coachReady && !isOpen(i)) return `<button data-game="${g.id}" class="locked" aria-disabled="true"><b>🔒 ${T(g.title)}</b><small>${T('Get a star in “{g}” to open this game.', { g: T(GAMES[i - 1].title) })}</small><span class="stars"></span></button>`;
      return `<button data-game="${g.id}" aria-pressed="${gameSel === g}"><b>${T(g.title)}</b><small>${T(g.sub)}</small><span class="stars">${b !== null ? starStr(starsFor(g, b)) + ' ' + T('best') + ' ' + g.fmt(b) : ''}</span></button>`; }).join('');
  }
  function selectGame(id) {
    const gi = GAMES.findIndex((g) => g.id === id); if (gi < 0 || (coachReady && !isOpen(gi))) return;
    if (game) endGame(null);
    if (coachReady && guide) { guide = null; coachHide(); }
    if (battle && !battle.keep) { battle = null; if (coachReady) coachHide(); }
    gameSel = GAMES[gi]; gameLevel = 0; renderPick(); if (coachReady) $('greplay').hidden = true;
    $('gsel').hidden = false; $('ggoal').textContent = '';
    $('ghint').innerHTML = '';
    gstartKey = 'Start'; $('gstart').textContent = T('Start');
    if (appMode === 'game') prepGame(gameSel);
  }
  function prepGame(g) { // the game's system, cold and ready: shown as soon as a game is picked, rebuilt fresh on Start
    if (scan) stopScan(false);
    gameRange = g.range;
    sys = g.sys; applySysUI();
    $('size').value = g.box || (SYS[sys].box ? String(SYS[sys].box) : $('size').value);
    if (g.conc) { const c = gameLevel && ladTwist(g, gameLevel).conc || g.conc; $('conc').value = c; $('concO').textContent = c; }
    if (g.epsXX) { $('epsXX').value = g.epsXX; $('epsXXO').textContent = g.epsXX.toFixed(1); } // games use stickier beads than the lesson default
    $('initState').value = g.ordered ? 'ordered' : 'disordered';
    for (const id of ['tslider', 'tsliderM']) { const el = $(id); el.min = g.range[0]; el.max = g.range[1]; }
    setT(g.range[0]); build({ game: true }); // every game starts at its coldest setting
    if (coachReady) zoneMarks();
    if (g.flowU) eng.p.hotBand = { x0: DRUG_X0, w: g.bandW, Tout: g.range[0] }; // the tumour is shown before the start
    running = true; $('pause').textContent = T('Pause');
  }
  function startGame() {
    const g = gameCfg(); if (!g) return;
    if (guide) { guide = null; coachHide(); }
    if (needGuide(g) && !battle && !gameLevel && !classOn) { guideStart(g); return; }
    prepGame(g); coachHide(); $('greplay').hidden = true; gendClose(); postGame = null;
    game = { g, t0: eng.time, last: eng.time, ema: null, rate: g.D / GAME_SEC, peak: -Infinity, peakSec: 0, snap: null, rec: [], level: gameLevel, bump: 0, guided: afterGuide }; afterGuide = false;
    if (battle) game.battle = battle.k;
    if (g.setup) g.setup(game);
    if (gameLevel) { const tw = ladTwist(g, gameLevel); Object.assign(game, { af: tw.af || 0, flowK: tw.flowK || 1, bandK: tw.bandK || 1, spill: tw.spill || 0 });
      if (tw.waveAmp) { game.waves = []; let a = 2.5 + 1.5 * Math.random(); while (a < 28) { game.waves.push([a, a + tw.waveLen, tw.waveAmp]); a += tw.waveLen + tw.waveGap * (0.7 + 0.6 * Math.random()); } } }
    const gb = document.querySelector('.gbar'); gb.querySelectorAll('.win').forEach((x) => x.remove());
    for (const [w0, w1] of game.win || []) { const d = document.createElement('div'); d.className = 'win'; d.style.left = (100 * w0 / g.D) + '%'; d.style.width = (100 * (w1 - w0) / g.D) + '%'; gb.appendChild(d); }
    $('gpeakLab').textContent = T(g.side || 'Best this run');
    $('gpeak').textContent = '–'; $('gbest').style.display = 'none';
    gameCarry = 0; running = true; $('pause').textContent = T('Pause');
    $('gvalLab').textContent = T(g.lab); $('gval').textContent = '–'; $('gstars').textContent = starStr(0); $('gtime').textContent = GAME_SEC;
    const band = $('gband'); band.querySelectorAll('.tick').forEach((x) => x.remove());
    g.stars.forEach((s, k) => { const d = document.createElement('div'); d.className = 'tick'; d.style.left = (100 * s / (g.scale || 1)) + '%'; d.textContent = '★'.repeat(k + 1); band.appendChild(d); });
    $('gnow').style.left = '0%'; $('gbar').style.width = '0%'; $('gres').textContent = '';
    $('hudTitle').textContent = T(g.title) + (game.level ? ' · ' + T('Challenge {k}', { k: game.level }) : '') ; $('hudGoal').textContent = ''; $('hudTip').textContent = ''; /* no goal text or tips above the box */
    $('ghud').hidden = false; document.querySelector('.wrap').classList.add('ingame'); $('gquit').textContent = T('Give up'); $('gagain').hidden = true;
    $('gstart').disabled = true; resize();
    countdown(game); if (typeof sheet === 'function') sheet(false);
    if ($('guseMic').checked) setMode('mic').then(() => { if (!analyser && game) { setMode('slider'); $('gres').textContent = T('No microphone here: use the temperature slider.'); } });
    else setMode('slider');
    const hud = $('ghud'); if (hud.scrollIntoView) hud.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  let cdTimer = null, gstartKey = 'Start'; // label of the Start button, kept so a language switch can redraw it
  function gfxShow() { const o = $('gfx'); o.style.left = cv.offsetLeft + 'px'; o.style.top = cv.offsetTop + 'px'; o.style.width = cv.offsetWidth + 'px'; o.style.height = cv.offsetHeight + 'px'; o.hidden = false; return o; }
  function countdown(G) { // 3, 2, 1, Go! over the box; the clock and the molecules wait until it ends
    clearTimeout(cdTimer); running = false; G.cd = true; let k = 3; const o = gfxShow();
    const tick = () => { if (game !== G) { o.hidden = true; o.innerHTML = ''; return; }
      if (k > 0) { o.innerHTML = `<span class="cd">${k}</span>`; k--; cdTimer = setTimeout(tick, 800); return; }
      o.innerHTML = `<span class="cd go">${T('Go!')}</span>`; G.cd = false; G.t0 = G.last = eng.time; running = true;
      if (G.g.flowU) { const lo = G.g.range[0]; eng.p.flowU = G.g.flowU * (G.flowK || 1); eng.p.hotBand = { x0: DRUG_X0, w: G.g.bandW * (G.bandK || 1), Tout: toutOf(G, tset) }; } $('pause').textContent = T('Pause');
      cdTimer = setTimeout(() => { if (o.querySelector('.go')) { o.hidden = true; o.innerHTML = ''; } }, 800); };
    tick();
  }
  function starBurst(st) { // a new star level reached during a run
    say(T(st === 1 ? 'First star!' : st === 2 ? 'Second star!' : 'Three stars!'));
    const o = gfxShow(); clearTimeout(cdTimer);
    let h = `<span class="sp">${'★'.repeat(st)}</span><span class="sptxt">${T(st === 1 ? 'First star!' : st === 2 ? 'Second star!' : 'Three stars!')}</span>`; SFX.star(st);
    const bx = document.querySelector('.ghud'); if (bx) { bx.classList.remove('flash'); void bx.offsetWidth; bx.classList.add('flash'); }
    for (let i = 0; i < 6 + 6 * st; i++) h += `<span class="bit" style="--a:${i * 36 + 8 * Math.random()}deg;--d:${32 + 8 * Math.random()}%">★</span>`;
    o.innerHTML = h; const gs = $('gstars'); gs.classList.remove('bump'); void gs.offsetWidth; gs.classList.add('bump');
    cdTimer = setTimeout(() => { o.hidden = true; o.innerHTML = ''; }, 1700);
  }
  function gameSteps(dtSec) { // steps this frame so that D time units take 30 s; limited by what the device can do
    const want = game.rate * dtSec / eng.p.dt + gameCarry, cap = msPerStep ? Math.max(1, Math.floor((BUDGET_MS > BUDGET0 ? 1.3 : 2) * BUDGET_MS / msPerStep)) : 30;
    const n = Math.max(0, Math.min(cap, Math.floor(want))); gameCarry = Math.min(want - n, 5); return n;
  }
  function takeSnap() { // full state, so the best moment can be shown and the run continued from it
    const s = { x: eng.x.slice(0, eng.N), y: eng.y.slice(0, eng.N), vx: eng.vx.slice(0, eng.N), vy: eng.vy.slice(0, eng.N), T: tset, time: eng.time };
    if (eng.th) { s.th = eng.th.slice(0, eng.N); s.om = eng.om.slice(0, eng.N); }
    return s;
  }
  function restoreSnap(s) {
    eng.x.set(s.x); eng.y.set(s.y); eng.vx.set(s.vx); eng.vy.set(s.vy); if (s.th) { eng.th.set(s.th); eng.om.set(s.om); }
    eng.computeForces(); setT(s.T);
  }
  function endGame(result) {
    const G = game; game = null; clearTimeout(cdTimer); $('gfx').hidden = true; $('gfx').innerHTML = ''; coachHide();
    if (eng && eng.p.flowU) { eng.p.flowU = 0; } // the stream stops with the game; the tumour band stays visible for the replay
    $('gstart').disabled = false; gstartKey = 'Play again'; $('gstart').textContent = T(gstartKey); $('gquit').textContent = T('Close');
    if (!G || !result) { closeHud(); return; }
    if (G.battle !== undefined && battle) { battleEnd(G); return; }
    if (G.level) { ladderEnd(G); return; }
    const g = G.g, v = G.peak, st = starsFor(g, v), b = getBest(g), rec = b === null || v > b, gi = GAMES.indexOf(g), wasOpen = gi + 1 < GAMES.length && isOpen(gi + 1); if (rec) setBest(g, v);
    const opened = gi + 1 < GAMES.length && !wasOpen && isOpen(gi + 1), dg = tipsOn() ? diagnose(G, st) : '';
    const card = st === 3 ? fcGive(FC_ALL.filter((c) => c.deck.game === g.id)) : null; // three stars: a new fact card, until the deck is complete
    if (card) setTimeout(() => fcOpen(card, true), 2200); // after the stars of the end card
    const S = addStat(g, v);
    $('hudGoal').textContent = $('hudTip').textContent = ''; $('gagain').hidden = false;
    if (G.snap) { restoreSnap(G.snap); running = false; $('pause').textContent = T('Resume'); const r = report(); showReport(r);
      if (g.value) g.value(); const rv = G.peak; $('gval').textContent = g.fmt(rv); $('gval').className = ''; $('gnow').style.left = (100 * Math.max(0, Math.min(1, rv / (g.scale || 1)))) + '%'; }
    $('gres').innerHTML = `<span class="big">${starStr(st)}</span> <b>${T('Score {s}', { s: g.fmt(v) })}</b> ${rec ? T('(new best ever!)') : T('(best ever {b})', { b: g.fmt(Math.max(b, v)) })}. ` + (dg ? dg + ' ' : '') +
      (opened ? '<b>' + T('New game unlocked: {g}!', { g: T(GAMES[gi + 1].title) }) + '</b> ' : '') +
      (st <= 1 && tipsOn() ? '<b>' + T('Tip:') + '</b> ' + T(g.hint) + ' ' : '') + (st === 3 ? T('Top score!') + ' ' + (card ? '<b>' + T('New card: {c}!', { c: T(card.t) }) + '</b> ' : T('You have all the cards of this game.') + ' ') : '') + T('Your average so far: {a} (games played: {n}).', { n: S.n, a: g.fmt(S.sum / S.n) });
    renderPick(); drawReplay(G);
    const nx = gi + 1 < GAMES.length && isOpen(gi + 1) ? GAMES[gi + 1] : null;
    endScreen({ G, g, st, v, rec, best: b, card, extra: opened ? T('New game unlocked: {g}!', { g: T(GAMES[gi + 1].title) }) : '', tip: dg,
      next: nx ? { label: T('Next: {g}', { g: T(nx.title) }), go: () => { selectGame(nx.id); startGame(); } } : null });
  }
  // the end of a game: a card over the box (the box behind it shows the best moment) with the stars filling in one by one, the score, and what to do next
  let gendTimers = [], postGame = null; // postGame: the game whose best moment the box is showing, so its preview film waits
  const gendOpen = () => !$('gend').hidden;
  function endScreen(o) {
    postGame = o.g.id; if (classOn || battle) return; const el = $('gend'), { G, g, st, v } = o;
    say(T('Game over: {n} of 3 stars, score {v}.', { n: st, v: g.fmt(v) }));
    $('gres').innerHTML = `<span class="gst">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span> <b>${g.fmt(v)}</b>${o.rec ? ' · ' + T('New personal best!') : ''}${G.level ? ' · ' + (st ? T('Cleared!') : T('Not cleared')) : ''}`; // one short line over the graph; the details are on the end card gendTimers.forEach(clearTimeout); gendTimers = [];
    el.style.left = cv.offsetLeft + 'px'; el.style.top = cv.offsetTop + 'px'; el.style.width = cv.offsetWidth + 'px'; el.style.height = cv.offsetHeight + 'px';
    const head = T(g.title) + (G.level ? ' · ' + T('Challenge {k}', { k: G.level }) : '');
    const msg = st === 3 ? T('Brilliant!') : st === 2 ? T('Great run!') : st === 1 ? T('Good start!') : T('So close: try again!');
    el.innerHTML = `<div class="gendcard"><button class="gendx" aria-label="${T('Close')}">✕</button><p class="gendh">${head}</p>
      <div class="gendstars">${[0, 1, 2].map((k) => `<span class="gs" data-k="${k}">★</span>`).join('')}</div>
      <p class="gendmsg">${msg}</p><p class="gendscore"><b data-v>${g.fmt(0)}</b>${o.rec ? `<span class="pb">${T('New personal best!')}</span>` : o.best !== null && o.best !== undefined ? `<small>${T('best ever {b}', { b: g.fmt(Math.max(o.best, v)) })}</small>` : ''}</p>
      <p class="gendnote">${T('Behind this card: your best moment, at {s} s.', { s: Math.round(G.peakSec || 0) })}${o.extra ? ' <b>' + o.extra + '</b>' : ''}</p>
      ${o.tip ? `<p class="gendtip">${o.tip}</p>` : ''}
      <div class="gendbtns"><button class="btn primary" data-act="again">${T('Try again')}</button>${o.next ? `<button class="btn" data-act="next">${o.next.label} ▸</button>` : ''}<button class="btn ghost" data-act="look">${T('Look at the box')}</button></div></div>`;
    el.hidden = false; el._next = o.next; syncBoxStart();
    const cd = el.querySelector('.gendcard'); if (cd.scrollIntoView) setTimeout(() => cd.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 60);
    const red = matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = 450, bv = el.querySelector('[data-v]'), dur = red ? 0 : 900, ts = performance.now();
    const count = () => { const u = dur ? Math.min(1, (performance.now() - ts) / dur) : 1; bv.textContent = g.fmt(v * (1 - Math.pow(1 - u, 3))); if (u < 1 && !el.hidden) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    for (let k = 0; k < st; k++) gendTimers.push(setTimeout(() => { const s1 = el.querySelector(`.gs[data-k="${k}"]`); if (s1) s1.classList.add('on'); SFX.slot(k); }, t0 + (red ? 150 : 420) * k));
    gendTimers.push(setTimeout(() => { if (!st) SFX.none(); else if (o.rec) SFX.best(); }, t0 + 420 * st + 150));
  }
  function gendClose() { $('gend').hidden = true; gendTimers.forEach(clearTimeout); syncBoxStart(); }
  $('gend').addEventListener('click', (e) => { const b = e.target.closest('[data-act], .gendx'); if (!b) return; const act = b.dataset.act, nx = $('gend')._next; gendClose();
    if (act === 'again') startGame(); else if (act === 'next' && nx) nx.go(); });
  function gameUpdate(v) {
    const G = game, g = G.g, now = eng.time, dt = now - G.last; G.last = now;
    G.ema = G.ema === null || g.raw ? v : G.ema + (1 - Math.exp(-dt / 2.0)) * (v - G.ema); // smooth over about 2 time units (raw: cumulative scores)
    const frac = Math.min(1, (now - G.t0) / g.D);
    if (G.ema > G.peak) { G.peak = G.ema; G.peakSec = GAME_SEC * frac; if (!g.noSnap) G.snap = takeSnap(); if (!g.side) $('gpeak').textContent = g.fmt(G.peak);
      $('gbest').style.display = 'block'; $('gbest').style.left = (100 * Math.max(0, Math.min(1, G.peak / (g.scale || 1)))) + '%'; }
    if (g.side) $('gpeak').textContent = g.fmt(eng.nDrug ? 100 * (G.lost || 0) / eng.nDrug : 0);
    const st = starsFor(g, G.peak); if (st > (G.stShown || 0)) { G.stShown = st; if (frac < 1) starBurst(st); }
    if (frac < 1 && !G.cd) gameSounds(G, g);
    $('gval').textContent = g.fmt(G.ema); $('gstars').textContent = starStr(st);
    $('gtime').textContent = T('{n} s', { n: Math.ceil(GAME_SEC * (1 - frac)) });
    $('gnow').style.left = (100 * Math.max(0, Math.min(1, G.ema / (g.scale || 1)))) + '%';
    $('gbar').style.width = (100 * frac) + '%';
    const sNow = GAME_SEC * frac; // the run, kept for the replay and the diagnosis after the game
    if (!G.rec.length || sNow - G.rec[G.rec.length - 1].s >= 0.25) G.rec.push({ s: sNow, T: tset, v: G.ema, d: G.del || 0, l: G.lost || 0, z: g.flowU ? micInBand(0) : false });
    if (frac < 1) { coachTick(G, sNow); if (g.path || g.zoneLive) zoneMarks(sNow); if (G.level) twistTick(G, sNow); }
    if (frac >= 1) endGame('done');
  }
  function gameSounds(G, g) { // each goal has its own sound
    const top = g.stars[2] || g.scale || 1, now = performance.now();
    if (g.id === 'ice' || g.id === 'gel') { const step = (g.id === 'ice' ? 0.04 : 0.07) * top; if (G.sLvl === undefined) G.sLvl = Math.max(0, G.ema);
      if (G.ema > G.sLvl + step) { G.sLvl = G.ema; g.id === 'ice' ? SFX.crystal(G.ema / (g.scale || 1)) : SFX.grow(G.ema / top); } else if (G.ema < G.sLvl - 2 * step) G.sLvl = G.ema; }
    if (g.id === 'demix' && now - (G.sAt || 0) > 2200) { G.sAt = now; SFX.harmony(Math.max(0, G.ema) / top); }
    if (g.id === 'drug') { const d = G.del || 0, l = G.lost || 0; if (d > (G.sDel || 0)) SFX.release(d - (G.sDel || 0)); else if (l > (G.sLost || 0)) SFX.miss(); G.sDel = d; G.sLost = l; }
  }
  $('sndM').addEventListener('click', () => { SFX.set(!SFX.on); sndUI(); });
  function sndUI() { const b = $('sndM'); b.textContent = SFX.on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(SFX.on)); b.title = T(SFX.on ? 'Sound effects on' : 'Sound effects off'); }
  sndUI();
  $('gpick').addEventListener('click', (e) => { const b = e.target.closest('[data-game]'); if (b) selectGame(b.dataset.game); });
  $('gstart').addEventListener('click', startGame); $('gagain').addEventListener('click', startGame);
  $('gstartBox').addEventListener('click', startGame);
  function syncBoxStart() { // a Start button on the box whenever a game is picked but not running, so it is always next to the molecules
    if (coachReady) placeCoach(); const b = $('gstartBox'), show = appMode === 'game' && !!gameSel && !game && !(coachReady && guide) && !battle && !classOn && tourI < 0 && $('gend').hidden;
    if (b.hidden !== !show) b.hidden = !show;
    if (!show) return;
    const t = $('gstart').textContent; if (b.textContent !== t) b.textContent = t;
    b.style.left = (cv.offsetLeft + cv.offsetWidth / 2) + 'px'; b.style.top = (cv.offsetTop + cv.offsetHeight * (gameSel && $('gres').textContent ? 0.88 : 0.5)) + 'px'; }
  // resuming after a game keeps the best structure as the starting point
  renderPick();

  function closeHud() { gendClose(); postGame = null; $('ghud').hidden = true; if (coachReady) { coachHide(); $('greplay').hidden = true; } document.querySelector('.wrap').classList.remove('ingame'); resize(); }
  $('gquit').addEventListener('click', () => { if (battle && coachReady) battleStop(); const was = !!game; endGame(null); if (was) { gameRange = null; applySysUI(); setT(tset); } closeHud(); });
  renderPick();

