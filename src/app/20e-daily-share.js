  // ---------- Daily Molecule, share card + clip, challenge links ----------
  // Daily Molecule: one game a day (rotating through the four games), the same start for everyone that day (the seed comes from the
  // date), as many tries as you like; the best counts, and days in a row make a streak. Share: a short text with the score and a
  // challenge link, plus an optional clip of the run (the box only, no sound). Challenge link: ?c=… carries the game, the start (seed)
  // and the score to beat, so a friend plays the very same start. No server, no accounts: everything is in the link and this browser.
  // Only `var` and function declarations here: renderPick() in 05-games.js calls dailyRender() during start-up, before this part runs.
  var special = null; // the run being played: { kind: 'daily' | 'challenge', gid, seed, date, day, beat }
  var DAILY_EPOCH = Date.UTC(2026, 10, 23); // Daily Molecule #1
  var PUBLIC_URL = 'https://dmtolmach.github.io/be-quite-and-self-assemble/docs/';
  var GAME_ICON = { ice: '❄️', demix: '🫧', drug: '💊', gel: '🥚' };
  var CLIP = { rec: null, chunks: [], cv: null, cx: null, blob: null, url: null, type: '', last: 0, G: null };
  var shareCur = null; // what the share window is showing

  function rngSeed(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 1) || 1; }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function todayStr() { return ymd(new Date()); }
  function dayBefore(ds) { const [y, m, d] = ds.split('-').map(Number); return ymd(new Date(y, m - 1, d - 1)); }
  function dayNum(ds) { const [y, m, d] = ds.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - DAILY_EPOCH) / 864e5) + 1; }
  function dailyInfo() { const date = todayStr(), day = dayNum(date), k = ((day - 1) % GAMES.length + GAMES.length) % GAMES.length;
    return { kind: 'daily', gid: GAMES[k].id, seed: hashStr('sugs-daily-' + date), date, day }; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dailyRec(date) { const r = lsGet('mdlab-daily'); return r && r.date === date ? r : null; }
  function streakNow() { const s = lsGet('mdlab-streak'), t = todayStr(); return s && (s.last === t || s.last === dayBefore(t)) ? s.n : 0; }
  function specialLabel(sp) { return sp.kind === 'daily' ? '📅 ' + T('Daily Molecule #{n}', { n: sp.day }) : '🏆 ' + T(sp.speed ? 'Speed challenge from a friend 😊' : 'Challenge from a friend 😊'); }

  // the Daily Molecule button above the game list: shown once the first game is finished (or everything is unlocked)
  function dailyRender() {
    const box = $('gdaily'); if (!box) return;
    if (!coachReady || classOn || !DAILY_EPOCH) { box.hidden = true; return; } // DAILY_EPOCH is set when this part runs; renderPick() comes earlier too
    const show = unlockAll() || gamesPlayed() >= 1; box.hidden = !show; if (!show) return;
    const d = dailyInfo(), g = GAMES.find((q) => q.id === d.gid), r = dailyRec(d.date), sk = streakNow(), on = !!(special && special.kind === 'daily');
    box.innerHTML = `<button id="gdailyBtn" aria-pressed="${on}"><span class="dico" aria-hidden="true">📅</span><span class="dtxt"><b>${T('Daily Molecule #{n}', { n: d.day })}</b>`
      + `<small>${GAME_ICON[g.id]} ${T(g.title)}</small><small class="stars">${r ? T("Today's best: {v}", { v: g.fmt(r.best) }) + ' ' + starStr(starsFor(g, r.best)) : T('Same start for everyone today.')}</small></span>`
      + (sk > 1 ? `<span class="dstreak">🔥 ${T('{n} days in a row', { n: sk })}</span>` : '') + '</button>';
  }
  $('gdaily').addEventListener('click', (e) => { if (e.target.closest('#gdailyBtn')) dailyGo(); });
  function specialPick(sp) { selectGame(sp.gid, true); special = sp; renderPick(); specialNote(); }
  function dailyGo() { specialPick(dailyInfo()); }
  function specialNote() {
    if (!special) return; const g = GAMES.find((q) => q.id === special.gid);
    $('ggoal').textContent = special.kind === 'daily' ? '📅 ' + T('Daily Molecule: the same start for everyone today. Play as often as you like; your best counts.')
      : '🏆 ' + (special.speed ? T('Speed challenge: reach the goal faster than {v}. You start from exactly the same molecules as your friend.', { v: special.beat.toFixed(1) + ' s' }) : T('Challenge: beat {v}. You start from exactly the same molecules as your friend.', { v: g.fmt(special.beat) })) + (special.run ? ' ' + T('😊 on the score bar is your friend\'s run.') : '');
  }

  // after a Daily Molecule or challenge run: the line on the end card (and the saved best and streak for the daily)
  function specialEnd(G, v, st) {
    const sp = G.special, g = G.g;
    if (sp.kind === 'daily') {
      const r = dailyRec(sp.date) || { date: sp.date, best: null, tries: 0 }, first = r.tries === 0, rec = r.best === null || v > r.best;
      r.tries++; if (rec) r.best = v; lsSet('mdlab-daily', r);
      if (first) { const s = lsGet('mdlab-streak') || { last: '', n: 0, max: 0 }; if (s.last !== sp.date) { s.n = s.last === dayBefore(sp.date) ? s.n + 1 : 1; s.last = sp.date; s.max = Math.max(s.max || 0, s.n); lsSet('mdlab-streak', s); } }
      const sk = streakNow();
      return { html: '📅 ' + T('Daily Molecule #{n}: today\'s best {v}.', { n: sp.day, v: g.fmt(r.best) }) + (sk > 1 ? ' 🔥 ' + T('{n} days in a row', { n: sk }) + '.' : '') + ' ' + T('Share it so your friends can try the same start.') };
    }
    const fm = sp.speed ? (x) => x === undefined ? '–' : x.toFixed(1) + ' s' : g.fmt, win = sp.speed ? v !== undefined && v < sp.beat : v > sp.beat; if (win) say(T('You beat the challenge!'));
    return { html: '🏆 ' + (win ? T('You beat the challenge: {a} against {b}!', { a: fm(v), b: fm(sp.beat) }) : T('Not yet: {a} against {b}. Try again!', { a: fm(v), b: fm(sp.beat) })) + (win ? ' ' + T('Send it back and see if they can beat you.') : '') };
  }

  // ---- challenge link: ?c=<base64url of {g, s, v, d}> ----
  function b64u(s) { return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return atob(s); }
  function linkBase() { // the page people can open: this one when it is served from a website, otherwise the public copy
    const h = location.hostname; if (/^https?:$/.test(location.protocol) && h && !/(^|\.)claude(usercontent)?\.(ai|com|site)$/.test(h) && h !== 'localhost' && h !== '127.0.0.1') return location.origin + location.pathname;
    return PUBLIC_URL; }
  function chalUrl(o) { return linkBase() + '?c=' + b64u(JSON.stringify(o)); }
  function chalParse(q) {
    try { const m = /[?&]c=([A-Za-z0-9_-]{8,800})/.exec(q); if (!m) return null; const o = JSON.parse(unb64u(m[1])), g = GAMES.find((x) => x.id === o.g);
      if (!g || !Number.isFinite(+o.v) || !Number.isInteger(o.s) || o.s <= 0) return null;
      let run = null; if (typeof o.r === 'string' && o.r.length >= 4 && o.r.length <= 330) { const b = unb64u(o.r), sc = g.scale || 1; run = { r: Array.from(b, (ch, i) => [i, 0, ch.charCodeAt(0) / 255 * sc]) }; } // the friend's score at each second
      const speed = o.m === 's' && !!SPEED[g.id] && +o.v > 0;
      return { kind: 'challenge', gid: g.id, seed: o.s >>> 0, beat: +o.v, day: Number.isInteger(o.d) ? o.d : 0, run, speed };
    } catch (e) { return null; }
  }
  var chalIn = chalParse(location.search);
  if (chalIn) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} setTimeout(chalShow, 600); }
  function chalShow() {
    const sp = chalIn, g = GAMES.find((q) => q.id === sp.gid);
    $('chalText').textContent = (sp.speed ? T('A friend reached the goal of “{g}” in {v} (speed run). Same start, same molecules: can you be faster?', { v: sp.beat.toFixed(1) + ' s', g: T(g.title) }) : T('A friend scored {v} in “{g}”. Same start, same molecules: can you beat it?', { v: g.fmt(sp.beat), g: T(g.title) })) + (sp.run ? ' ' + T('You race your friend\'s run: 😊 on the score bar.') : '');
    $('chalModal').hidden = false; $('chalGo').focus();
  }
  function chalAccept(play) { $('chalModal').hidden = true; if (!chalIn) return; setAppMode('game'); speedMode = !!chalIn.speed; specialPick(chalIn); speedSeg(); if (play) startGame(); else tourOpen(true); }
  $('chalGo').addEventListener('click', () => chalAccept(true));
  $('chalHow').addEventListener('click', () => chalAccept(false));
  $('chalNo').addEventListener('click', () => { $('chalModal').hidden = true; });

  // ---- share window ----
  function shareOpen(o) {
    if (!o || !o.G) return; const g = o.g, G = o.G, sp = G.special;
    const head = sp && sp.kind === 'daily' ? T('Shut Up and Get Structured · Daily #{n}', { n: sp.day }) : T('Shut Up and Get Structured');
    const spd = !!G.speed, url = chalUrl({ g: g.id, s: G.seed >>> 0, v: +(+o.v).toFixed(spd ? 2 : 4), d: sp && sp.kind === 'daily' ? sp.day : 0, m: spd ? 's' : undefined, r: runBytes(G) });
    const text = head + '\n' + (GAME_ICON[g.id] || '') + ' ' + T(g.title) + (spd ? ' · ⏱ ' + T('Speed run') : '') + ': ' + g.fmt(o.v) + ' ' + starStr(o.st) + '\n' + T(spd ? 'Same start for you. Can you be faster?' : 'Same start for you. Can you beat it?');
    shareCur = { text, url, g };
    $('shareText').textContent = text + '\n' + url; $('shareMsg').textContent = ''; qrDraw($('shareQR'), url);
    $('shareNative').hidden = !navigator.share;
    const hasClip = !!CLIP.url; $('shareClipBox').hidden = !hasClip;
    if (hasClip) { const v = $('shareVideo'); if (v.src !== CLIP.url) v.src = CLIP.url; v.play && v.play().catch(() => {});
      const f = clipFile(); $('shareClipNative').hidden = !(f && navigator.canShare && navigator.canShare({ files: [f] })); }
    $('shareModal').hidden = false; ($('shareNative').hidden ? $('shareCopy') : $('shareNative')).focus();
    MONET.hook('share', { game: g.id });
  }
  function runBytes(G) { // this run's score at each second (0..30 s), one byte each as a fraction of the game's scale: the friend sees it as 😊
    const rec = G.rec || [], sc = G.g.scale || 1; if (rec.length < 4) return undefined; let s = '', j = 0;
    const end = Math.min(240, G.speed ? Math.ceil(rec[rec.length - 1].s) : GAME_SEC);
    for (let k = 0; k <= end; k++) { while (j < rec.length - 1 && rec[j + 1].s <= k) j++; s += String.fromCharCode(Math.round(255 * Math.max(0, Math.min(1, (rec[j].v || 0) / sc)))); }
    return b64u(s); }
  // QR code of the challenge link (qrcode-generator, 20g-qrcode.js): drawn on a canvas, dark on white with the standard quiet zone
  function qrDraw(cv0, text) {
    const c = cv0.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv0.width, cv0.height);
    try { const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), s = Math.floor(cv0.width / (n + 8)), o = Math.floor((cv0.width - s * n) / 2);
      c.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(o + k * s, o + r * s, s, s); cv0.dataset.n = n; return true;
    } catch (e) { cv0.dataset.n = 0; return false; } }
  $('shareQRBig').addEventListener('click', () => { if (!shareCur) return; $('qrBigText').textContent = shareCur.text.split('\n').slice(0, 2).join(' · ');
    const cv1 = $('qrBigCv'); qrDraw(cv1, shareCur.url); $('qrBig').hidden = false; $('qrBigClose').focus(); });
  $('qrBigClose').addEventListener('click', () => { $('qrBig').hidden = true; });
  function shareClose() { $('shareModal').hidden = true; const v = $('shareVideo'); if (v.pause) v.pause(); }
  function shareMsg(t) { $('shareMsg').textContent = t; say(t); }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
  }
  $('shareCopy').addEventListener('click', async () => { if (!shareCur) return; shareMsg(T(await copyText(shareCur.text + '\n' + shareCur.url) ? 'Copied. Paste it into a message.' : 'Could not copy: select the text above and copy it.')); });
  $('shareNative').addEventListener('click', async () => { if (!shareCur) return; try { await navigator.share({ title: T('Shut Up and Get Structured'), text: shareCur.text, url: shareCur.url }); } catch (e) {} });
  function clipExt() { return /mp4/.test(CLIP.type) ? 'mp4' : 'webm'; }
  function clipFile() { if (!CLIP.blob || typeof File === 'undefined') return null; try { return new File([CLIP.blob], 'get-structured-' + (shareCur ? shareCur.g.id : 'run') + '.' + clipExt(), { type: CLIP.type.split(';')[0] }); } catch (e) { return null; } }
  $('shareClipNative').addEventListener('click', async () => { const f = clipFile(); if (!f || !shareCur) return; try { await navigator.share({ files: [f], title: T('Shut Up and Get Structured'), text: shareCur.text + '\n' + shareCur.url }); } catch (e) {} });
  $('shareClipSave').addEventListener('click', () => { if (!CLIP.url) return; const a = document.createElement('a'); a.href = CLIP.url; a.download = 'get-structured-' + (shareCur ? shareCur.g.id : 'run') + '.' + clipExt(); document.body.appendChild(a); a.click(); a.remove(); shareMsg(T('Clip saved.') + (clipExt() === 'webm' ? ' ' + T('Some apps need MP4: open the clip in a video app and save it again.') : '')); });
  $('shareClose').addEventListener('click', shareClose);
  $('shareModal').addEventListener('click', (e) => { if (e.target === $('shareModal')) shareClose(); });
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (!$('qrBig').hidden) $('qrBig').hidden = true; else if (!$('shareModal').hidden) shareClose(); else if (!$('chalModal').hidden) $('chalModal').hidden = true; });

  // ---- clip: a vertical video (9:16) of the run, drawn from the box, the temperature bar and the score; no sound ----
  try { const c = localStorage.getItem('mdlab-clip'); if (c !== null) $('gclipOn').checked = c === '1'; } catch (e) {}
  $('gclipOn').addEventListener('change', (e) => { try { localStorage.setItem('mdlab-clip', e.target.checked ? '1' : '0'); } catch (x) {} });
  function clipType() { if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
    for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MediaRecorder.isTypeSupported(t)) return t; return ''; }
  function clipDrop() { if (CLIP.url) { try { URL.revokeObjectURL(CLIP.url); } catch (e) {} } CLIP.url = null; CLIP.blob = null; }
  function clipStart(G) {
    clipStop(false); clipDrop();
    if (!$('gclipOn').checked || !optOpen('clip') || classOn || battle || G.g.proto || G.level || qLevel >= 2) return; // slow devices: no clip, so the game stays smooth
    const type = clipType(); if (!type || !HTMLCanvasElement.prototype.captureStream) return;
    try {
      if (!CLIP.cv) { CLIP.cv = document.createElement('canvas'); CLIP.cv.width = 360; CLIP.cv.height = 640; CLIP.cx = CLIP.cv.getContext('2d'); CLIP.cx.scale(2 / 3, 2 / 3); } // drawn in 540×960 units, recorded at 360×640
      clipDraw(G); const st = CLIP.cv.captureStream(20), r = new MediaRecorder(st, { mimeType: type, videoBitsPerSecond: 350000 }); // about 1.3 MB for a 30 s game, small enough for any messenger
      CLIP.chunks = []; CLIP.type = type; CLIP.G = G; CLIP.last = 0; CLIP.stream = st;
      r.ondataavailable = (e) => { if (e.data && e.data.size) CLIP.chunks.push(e.data); };
      r.start(1000); CLIP.rec = r;
    } catch (e) { CLIP.rec = null; }
  }
  function clipStop(keep) {
    const r = CLIP.rec; if (!r) return; CLIP.rec = null; const st = CLIP.stream;
    r.onstop = () => { if (st) st.getTracks().forEach((t) => t.stop()); if (keep && CLIP.chunks.length) { CLIP.blob = new Blob(CLIP.chunks, { type: CLIP.type.split(';')[0] }); CLIP.url = URL.createObjectURL(CLIP.blob);
      if (!$('shareModal').hidden && shareCur) { $('shareClipBox').hidden = false; $('shareVideo').src = CLIP.url; } } CLIP.chunks = []; };
    try { if (keep) clipDraw(CLIP.G, true); r.state !== 'inactive' ? r.stop() : r.onstop(); } catch (e) {}
  }
  function clipTick(now) { if (!CLIP.rec || !CLIP.G || now - CLIP.last < 50) return; CLIP.last = now; try { clipDraw(CLIP.G); } catch (e) {} }
  function clipDraw(G, last) {
    const c = CLIP.cx, W = 540, g = G.g, cen = W / 2; if (!c) return;
    c.fillStyle = '#0f2a33'; c.fillRect(0, 0, W, 960); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff'; c.font = '700 30px system-ui, sans-serif'; c.fillText(T('Shut Up and Get Structured'), cen, 58);
    c.fillStyle = '#9fd6d6'; c.font = '22px system-ui, sans-serif'; c.fillText((GAME_ICON[g.id] || '') + ' ' + T(g.title), cen, 96, W - 40);
    if (G.special) { c.font = '20px system-ui, sans-serif'; c.fillText(specialLabel(G.special), cen, 124, W - 40); }
    const bx = 20, by = 140, bs = 500; try { c.drawImage(cv, bx, by, bs, bs); } catch (e) {} c.strokeStyle = '#2f6b78'; c.lineWidth = 3; c.strokeRect(bx, by, bs, bs);
    const [lo, hi] = g.range, f = Math.max(0, Math.min(1, (tset - lo) / (hi - lo))), y = 680, gr = c.createLinearGradient(bx, 0, bx + bs, 0);
    gr.addColorStop(0, '#4a9fe0'); gr.addColorStop(0.5, '#e8d9a0'); gr.addColorStop(1, '#e0553e'); c.fillStyle = gr; c.fillRect(bx, y, bs, 22);
    c.fillStyle = '#ffffff'; c.fillRect(bx + f * bs - 4, y - 8, 8, 38);
    c.font = '20px system-ui, sans-serif'; c.textAlign = 'left'; c.fillStyle = '#cfe8ec'; c.fillText('❄️ ' + T('quiet'), bx, y + 52); c.textAlign = 'right'; c.fillText(T('loud') + ' 🔥', bx + bs, y + 52); c.textAlign = 'center';
    if (mode === 'mic') { const m = parseFloat($('micbar').style.width) || 0; c.fillStyle = '#24434c'; c.fillRect(bx + 120, y + 36, bs - 240, 14); c.fillStyle = '#7fd1b9'; c.fillRect(bx + 120, y + 36, (bs - 240) * Math.min(1, m / 100), 14); }
    const v = G.ema === null || G.ema === undefined ? 0 : G.ema, best = Number.isFinite(G.peak) && !G.speed ? G.peak : v, frac = Math.min(1, Math.max(0, (eng.time - G.t0) / g.D));
    c.fillStyle = '#ffffff'; c.font = '700 64px system-ui, sans-serif'; c.fillText(g.fmt(last ? best : Math.max(0, v)), cen, 826);
    c.fillStyle = '#f2c94c'; c.font = '44px system-ui, sans-serif'; c.fillText(G.speed ? (last && G.doneAt !== undefined ? '⏱ ' + G.doneAt.toFixed(1) + ' s' : '⏱') : starStr(starsFor(g, best)), cen, 878);
    c.fillStyle = '#9fd6d6'; c.font = '20px system-ui, sans-serif'; c.fillText(last ? T('Can you beat it?') : T('Shout to melt · hush to freeze') + ' · ' + T('{n} s', { n: G.speed ? (GAME_SEC * (eng.time - G.t0) / g.D).toFixed(1) : Math.ceil(GAME_SEC * (1 - frac)) }), cen, 930, W - 40);
  }
  dailyRender();
  window.__daily = () => ({ info: dailyInfo(), special, rec: lsGet('mdlab-daily'), streak: streakNow(), clip: !!CLIP.url, recording: !!CLIP.rec, chalUrl: (o) => chalUrl(o), parse: (q) => chalParse(q) }); // for tests
