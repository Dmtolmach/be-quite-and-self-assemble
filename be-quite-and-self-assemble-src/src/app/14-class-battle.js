  // ---------- class battle: teams take turns on the same game from the same start; highest score wins ----------
  function battleShow(msg, cls, go, stop) { coachSay(msg, cls); const b = $('coachBtn'), k = $('coachSkip'); b.hidden = false; b.textContent = go; k.hidden = false; k.textContent = stop; }
  function battleTable() {
    const b = battle, best = Math.max(...b.scores.map((x) => x.v));
    return '<table class="btable"><tbody>' + b.scores.map((x, i) => `<tr class="${b.done && x.v === best ? 'win' : ''}"><td>${b.done && x.v === best ? '🏆 ' : ''}${T('Team {n}', { n: i + 1 })}</td><td>${b.g.fmt(x.v)}</td><td>${starStr(x.st)}</td></tr>`).join('') +
      Array.from({ length: b.n - b.scores.length }, (_, i) => `<tr class="todo"><td>${T('Team {n}', { n: b.scores.length + i + 1 })}</td><td>–</td><td></td></tr>`).join('') + '</tbody></table>';
  }
  function battleStart() {
    if (!gameSel) return; if (game) endGame(null);
    gameLevel = 0; battle = { n: +$('bTeams').value, g: gameSel, seed: 1 + ((Math.random() * 1e9) | 0), scores: [], k: 0, done: false };
    if (typeof sheet === 'function') sheet(false); $('greplay').hidden = true; $('gres').innerHTML = ''; $('ghud').hidden = true;
    battleShow(T('Class battle: {n} teams. Team 1, get ready!', { n: battle.n }), 'guide', T('Start'), T('End battle')); syncBoxStart();
  }
  function battleGo() {
    if (battle.done) { const n = battle.n; battle = null; $('bTeams').value = n; battleStart(); return; }
    coachHide(); battle.keep = true; startGame(); battle.keep = false;
  }
  function battleEnd(G) {
    const g = G.g, st = starsFor(g, G.peak); battle.scores.push({ v: G.peak, st }); battle.k++;
    $('hudGoal').textContent = $('hudTip').textContent = ''; $('gagain').hidden = true;
    if (G.snap) { restoreSnap(G.snap); running = false; $('pause').textContent = T('Resume'); showReport(report()); }
    if (battle.k >= battle.n) { battle.done = true; const best = Math.max(...battle.scores.map((x) => x.v)), w = battle.scores.map((x, i) => (x.v === best ? i + 1 : 0)).filter(Boolean);
      $('gres').innerHTML = battleTable();
      battleShow(w.length > 1 ? T('A draw between {t}!', { t: w.map((n) => T('Team {n}', { n })).join(', ') }) : T('Team {n} wins!', { n: w[0] }), 'good', T('New battle'), T('Close')); }
    else { $('gres').innerHTML = battleTable(); battleShow(T('Team {n}, get ready!', { n: battle.k + 1 }), 'guide', T('Start'), T('End battle')); }
    drawReplay(G);
  }
  function battleStop() { battle = null; coachHide(); syncBoxStart(); }
  $('bStart').addEventListener('click', battleStart);

