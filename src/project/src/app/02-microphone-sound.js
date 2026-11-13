  // ---- microphone ----
  let audio = null, analyser = null, buf = null, quietDb = -60, micT = 0.5;
  async function startMic() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomedia');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const src = audio.createMediaStreamSource(stream);
      analyser = audio.createAnalyser(); analyser.fftSize = 2048; src.connect(analyser);
      buf = new Float32Array(analyser.fftSize);
      $('micnote').className = 'note'; $('micnote').textContent = T('Listening. Quiet room keeps the system cold; talk, clap or play music to heat it.');
      setTimeout(calibrate, 600);
      return true;
    } catch (e) {
      $('micnote').className = 'note err';
      $('micnote').textContent = T('The microphone is blocked in this view. Download the HTML file from the chat and open it in Chrome, Edge or Firefox, then allow microphone access.');
      return false;
    }
  }
  // ---------- sound effects: synthesised, short, soft. While one plays (and 150 ms after) the microphone reading is held, so the game never hears itself ----------
  const SFX = (() => {
    let ac = null, out = null, on = true; try { on = localStorage.getItem('mdlab-sound') !== '0'; } catch (e) {}
    const api = { busyUntil: 0, get on() { return on; } };
    function ctx() { if (!on) return null; try { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.55;
        const comp = ac.createDynamicsCompressor(); out.connect(comp); comp.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); } catch (e) { return null; } return ac; }
    // one note: frequency f (Hz), start in s from now, length, wave, volume, optional glide to f2
    function note(f, at, dur, o = {}) { const a = ctx(); if (!a) return; const t0 = a.currentTime + at, os = a.createOscillator(), gn = a.createGain();
      os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t0); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      const v = o.vol || 0.16; gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(v, t0 + (o.att || 0.006)); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      os.connect(gn); gn.connect(out); os.start(t0); os.stop(t0 + dur + 0.02);
      api.busyUntil = Math.max(api.busyUntil, performance.now() + 1000 * (at + dur) + 150); }
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12), PENTA = [0, 2, 4, 7, 9];
    let lastAt = 0; const gap = (ms) => { const n = performance.now(); if (n - lastAt < ms) return false; lastAt = n; return true; };
    api.set = (v) => { on = v; try { localStorage.setItem('mdlab-sound', v ? '1' : '0'); } catch (e) {} if (on) ctx(); };
    // ice: a glassy tink, higher as more of the box freezes
    api.crystal = (x) => { if (!gap(220)) return; const k = Math.floor(Math.max(0, Math.min(0.999, x)) * 10), m = 79 + 12 * Math.floor(k / 5) + PENTA[k % 5];
      note(hz(m), 0, 0.32, { type: 'sine', vol: 0.12 }); note(hz(m + 19), 0, 0.18, { type: 'sine', vol: 0.04 }); };
    // two liquids: a chord every couple of seconds, from a clash (mixed) to a bright major chord (separated)
    api.harmony = (q) => { const r = 60, ch = q < 0.3 ? [0, 1, 6] : q < 0.6 ? [0, 5, 7] : q < 1 ? [0, 4, 7] : [0, 4, 7, 12, 16];
      const type = q < 0.3 ? 'sawtooth' : q < 0.6 ? 'triangle' : 'sine', vol = q < 0.3 ? 0.035 : 0.07;
      ch.forEach((d, i) => note(hz(r + d), 0.03 * i * (q >= 1 ? 1 : 0), 0.42, { type, vol })); };
    // drug: released in the right place, a rising two-note bloop; lost, a low falling buzz
    api.release = (n) => { if (!gap(140)) return; note(hz(72), 0, 0.12, { vol: 0.14 }); note(hz(79), 0.09, 0.2, { vol: 0.14 }); if (n > 2) note(hz(84), 0.18, 0.2, { vol: 0.1 }); };
    api.miss = () => { if (!gap(140)) return; note(170, 0, 0.28, { type: 'square', vol: 0.05, to: 90 }); };
    // gel: a marimba-like step up the scale each time the path grows
    api.grow = (x) => { if (!gap(200)) return; const k = Math.floor(Math.max(0, Math.min(1.4, x)) * 10), m = 60 + 12 * Math.floor(k / 5) + PENTA[k % 5];
      note(hz(m), 0, 0.22, { type: 'triangle', vol: 0.16 }); note(hz(m + 12), 0, 0.1, { type: 'sine', vol: 0.05 }); };
    // a star: a quick arpeggio, longer for more stars
    api.star = (k) => { [72, 76, 79, 84].slice(0, k + 1).forEach((m, i) => note(hz(m), 0.08 * i, 0.3, { type: 'triangle', vol: 0.13 })); note(hz(96), 0.08 * (k + 1), 0.4, { vol: 0.06 }); };
    api.slot = (k) => { note(hz([76, 79, 84][k] || 84), 0, 0.35, { type: 'triangle', vol: 0.14 }); note(hz(([76, 79, 84][k] || 84) + 12), 0.02, 0.25, { vol: 0.05 }); };
    api.none = () => { note(hz(64), 0, 0.25, { type: 'triangle', vol: 0.1 }); note(hz(60), 0.2, 0.4, { type: 'triangle', vol: 0.1 }); };
    api.best = () => { [79, 84, 88, 91].forEach((m, i) => note(hz(m), 0.07 * i, 0.25, { vol: 0.09 })); };
    return api;
  })();
  window.__sfx = SFX; // for tests
  let lastDb = null;
  function levelDb() {
    if (!analyser) return null;
    if (performance.now() < SFX.busyUntil && lastDb !== null) return lastDb; // our own sound is playing: keep the last reading
    analyser.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return (lastDb = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9));
  }
  function calibrate() { const samples = []; let k = 0;
    const id = setInterval(() => { const d = levelDb(); if (d !== null) samples.push(d); if (++k >= 15) { clearInterval(id); if (samples.length) { samples.sort((a, b) => a - b); quietDb = samples[Math.floor(samples.length / 2)] + 3; } } }, 40); }
  $('calib').addEventListener('click', calibrate);
  // microphone set-up: 3 s of quiet sets the quiet level, 3 s of the loudest noise players will use sets the range
  let micWiz = false;
  async function micWizard(done) {
    if (micWiz) return; micWiz = true;
    if (!analyser) await setMode('mic');
    if (!analyser) { micWiz = false; if (done) done(false); return; }
    const phase = (key, cls) => new Promise((res) => { const got = [], t0 = performance.now();
      const id = setInterval(() => { const d = levelDb(); if (d !== null) got.push(d); const left = Math.max(0, 3 - (performance.now() - t0) / 1000);
        coachSay(key, cls, { s: Math.ceil(left) }); if (left <= 0) { clearInterval(id); res(got.sort((a, b) => a - b)); } }, 60); });
    const q = await phase('Microphone set-up: everyone quiet for {s} s…', 'guide');
    if (q.length) quietDb = q[Math.floor(q.length / 2)] + 3;
    await new Promise((r) => setTimeout(r, 300));
    const l = await phase('Now the loudest noise you will use: shout, clap or sing! {s} s…', 'bad');
    const top = l.length ? l[Math.floor(l.length * 0.9)] : quietDb + 30, span = Math.round(Math.max(6, Math.min(50, top - quietDb - 2)));
    $('micrange').value = span; $('micrangeO').textContent = sensWord(span);
    coachSay('Microphone ready: quiet is cold, your loudest is hot.', 'good'); micWiz = false;
    setTimeout(() => { if (!guide && !battle) coachHide(); if (done) done(true); }, 1600);
  }
  $('micSetup').addEventListener('click', () => micWizard());
  function sensWord(v) { return T(v <= 14 ? 'Very sensitive' : v <= 24 ? 'Sensitive' : v <= 34 ? 'Normal' : v <= 42 ? 'Less sensitive' : 'Least sensitive'); } // dB above the quiet room for the hottest setting, in words
  $('micrange').addEventListener('input', (e) => { $('micrangeO').textContent = sensWord(+e.target.value); });
  async function setMode(m) {
    mode = m;
    $('modeSlider').setAttribute('aria-pressed', m === 'slider'); $('modeMic').setAttribute('aria-pressed', m === 'mic');
 $('tslider').disabled = $('tsliderM').disabled = m === 'mic';
    $('micM').setAttribute('aria-pressed', m === 'mic'); $('mmeter').hidden = m !== 'mic';
    if (m === 'mic') { micT = tset; if (!analyser) await startMic(); else if (audio.state === 'suspended') audio.resume(); }
  }
  $('modeSlider').addEventListener('click', () => setMode('slider'));
  $('modeMic').addEventListener('click', () => setMode('mic'));
  function micUpdate(dtSec) {
    const d = levelDb(); if (d === null) return;
    const span = Math.max(0.5, +$('micrange').value), x = Math.max(0, Math.min(1, (d - quietDb) / span));
    $('micbar').style.width = $('micbarM').style.width = $('micbarC').style.width = (x * 100).toFixed(0) + '%';
    const [lo, hi] = curRange(), target = lo + (0.05 + 0.9 * x) * (hi - lo);
    const tauUp = 0.3, tauDown = 0.6;   // follows the room quickly both ways, so players keep control (cooling used to lag 2.5 s)
    const a = 1 - Math.exp(-dtSec / (target > micT ? tauUp : tauDown));
    micT += a * (target - micT); setT(micT);
    if ($('pitchP').checked && appMode === 'explore' && eng && eng.p.baro) pitchUpdate(dtSec); else if (!$('mpitch').hidden) pitchBar();
  }
  // voice pitch by autocorrelation of the microphone signal (80-1000 Hz); a clear pitch sets the barostat's target pressure
  let pitchHz = null, pitchP = null, pitchFrame = 0;
  let pitchSys = null;
  function pitchUpdate(dtSec) {
    if (pitchSys !== sys) { pitchSys = sys; pitchP = null; } // a new system starts from its own pressure range
    if (++pitchFrame % 3) return;
    const sr = audio.sampleRate, n = 1024, b = buf, lo = Math.floor(sr / 1000), hi = Math.min(n - 1, Math.ceil(sr / 80));
    let e0 = 0; for (let i = 0; i < n; i++) e0 += b[i] * b[i]; if (e0 < 1e-4 * n * 0.01) { pitchHz = null; pitchNoteShow(); return; }
    if (!pitchUpdate.r || pitchUpdate.r.length < hi + 2) pitchUpdate.r = new Float32Array(hi + 2);
    const R = pitchUpdate.r; let mx = 0;
    for (let lag = lo; lag <= hi; lag++) { let c = 0, e1 = 0; for (let i = 0; i < n - lag; i++) { c += b[i] * b[i + lag]; e1 += b[i + lag] * b[i + lag]; }
      R[lag] = c / Math.sqrt(e0 * e1 + 1e-12); if (R[lag] > mx && lag > lo + 1) mx = R[lag]; }
    let bl = 0; for (let lag = lo + 1; lag < hi; lag++) if (R[lag] >= 0.9 * mx && R[lag] >= R[lag - 1] && R[lag] >= R[lag + 1]) { bl = lag; break; } // first peak near the top: avoids octave errors
    if (mx < 0.6 || !bl) { pitchHz = null; pitchNoteShow(); return; }
    pitchHz = sr / bl; const x = Math.max(0, Math.min(1, Math.log(pitchHz / pitchLo) / Math.log(pitchHi / pitchLo))), target = pTop() * x; pitchX = x;
    pitchP = pitchP === null ? target : pitchP + (1 - Math.exp(-3 * dtSec * 3)) * (target - pitchP);
    eng.p.P0 = pitchP; if (typeof p0Range === 'function') { $('p0').value = pitchP; $('p0O').textContent = pitchP.toFixed(3); }
    pitchNoteShow();
  }
  // pitch range: the lowest note gives pressure 0, the highest the top pressure; chosen from notes or sung, kept in this browser
  const NOTE_N = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const midiOf = (f) => Math.round(12 * Math.log2(f / 440) + 69), hzOf = (m) => 440 * Math.pow(2, (m - 69) / 12), noteName = (m) => NOTE_N[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  let pitchLo = 110, pitchHi = 698, pitchX = 0; // A2 and F5
  try { const pr = JSON.parse(localStorage.getItem('mdlab-pitch') || 'null'); if (pr && pr.lo > 60 && pr.hi > pr.lo * 1.1) { pitchLo = pr.lo; pitchHi = pr.hi; } } catch (e) {}
  function pitchTuneUI() {
    const opts = []; for (let m = 40; m <= 83; m++) opts.push(`<option value="${m}">${noteName(m)} · ${Math.round(hzOf(m))} Hz</option>`); // E2 … B5: what the pitch finder can hear
    for (const id of ['pLo', 'pHi']) if (!$(id).options.length) $(id).innerHTML = opts.join('');
    $('pLo').value = String(Math.max(40, Math.min(83, midiOf(pitchLo)))); $('pHi').value = String(Math.max(40, Math.min(83, midiOf(pitchHi))));
    $('pbLo').textContent = noteName(midiOf(pitchLo)); $('pbHi').textContent = noteName(midiOf(pitchHi));
  }
  function pitchSet(lo, hi) { if (hi < lo * 1.12) { if (lo !== pitchLo) hi = lo * 1.12; else lo = hi / 1.12; } pitchLo = lo; pitchHi = hi;
    try { localStorage.setItem('mdlab-pitch', JSON.stringify({ lo, hi })); } catch (e) {} pitchTuneUI(); }
  $('pLo').addEventListener('change', () => pitchSet(hzOf(+$('pLo').value), pitchHi));
  $('pHi').addEventListener('change', () => pitchSet(pitchLo, hzOf(+$('pHi').value)));
  const singBtn = (id, isLo) => $(id).addEventListener('click', () => { const b = $(id); // listens for 1.5 s and takes the median pitch heard
    if (!$('pitchP').checked || !analyser) { b.textContent = T('Turn on pitch first'); setTimeout(() => (b.textContent = T('Sing it')), 1600); return; }
    const got = [], t0 = performance.now(); b.disabled = true; b.textContent = T('Listening…');
    const tick = () => { if (pitchHz) got.push(pitchHz); if (performance.now() - t0 < 1500) return requestAnimationFrame(tick);
      b.disabled = false; b.textContent = T('Sing it'); if (got.length < 5) { b.textContent = T('No note heard'); setTimeout(() => (b.textContent = T('Sing it')), 1600); return; }
      got.sort((a, c) => a - c); const f = hzOf(midiOf(got[got.length >> 1])); isLo ? pitchSet(f, pitchHi) : pitchSet(pitchLo, f); };
    requestAnimationFrame(tick); });
  singBtn('pLoSing', true); singBtn('pHiSing', false); pitchTuneUI();
  const pTop = () => (sys === 'ice' ? 0.35 : 2.0); // top pressure of the highest note: water ice is soft to squeeze, the bead systems need more
  function pitchBar() { // the bar under the box: note, frequency, where it sits between the lowest and highest note, and the pressure
    const on = $('pitchP').checked && appMode === 'explore' && !!eng && !!eng.p.baro; $('mpitch').hidden = !on; $('pitchTune').hidden = !$('pitchP').checked; if (!on) return;
    $('pbNote').textContent = pitchHz ? noteName(midiOf(pitchHz)) : '–'; $('pbHz').textContent = pitchHz ? Math.round(pitchHz) + ' Hz' : T('sing a note');
    const x = pitchP === null ? 0 : Math.max(0, Math.min(1, pitchP / pTop())); $('pbFill').style.width = (100 * x).toFixed(1) + '%';
    $('pbNow').style.left = `calc(${(100 * (pitchHz ? pitchX : x)).toFixed(1)}% - 1.5px)`; $('pbNow').style.opacity = pitchHz ? 1 : 0.3; $('pbP').textContent = (pitchP || 0).toFixed(2);
  }
  function pitchNoteShow() { pitchBar(); const el = $('pitchNote'); if (!$('pitchP').checked) return;
    el.textContent = pitchHz ? T('Pitch {f} Hz → pressure {p}', { f: Math.round(pitchHz), p: (pitchP || 0).toFixed(2) }) : T('Sing or hum a steady note to set the pressure (high note = high pressure).'); }

