  // ---------- keyboard play, screen-reader announcements and projector options ----------
  let sayT = 0;
  function say(txt) { const el = $('srLive'); if (!el || !txt) return; el.textContent = ''; clearTimeout(sayT); sayT = setTimeout(() => { el.textContent = txt; }, 60); } // polite: read after what the reader is saying
  var kbHeat = false, kbGlide = false, kbLast = 0, kbUsed = 0; // var: tWordShow (another part) may call kbSay before this part has run
  function kbSay(txt) { if (performance.now() - kbUsed < 1500 || kbGlide) say(txt); } // temperature words are spoken only while the keyboard drives the temperature
  // Space held = making noise (the temperature climbs to the top of the range); let go = silence (it falls back); the arrows step the slider.
  const typing = (el) => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(el.type)));
  const kbFree = () => mode === 'slider' && tourI < 0 && $('fcModal').hidden && $('privModal').hidden && $('gend').hidden && !$('tsliderM').disabled && !(coachReady && guide);
  const kbT = (v) => { const s = $('tsliderM'), lo = +s.min, hi = +s.max; v = Math.max(lo, Math.min(hi, v)); if (scan) stopScan(false); setT(v); };
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || !kbFree()) return;
    const playing = !!(coachReady && game), onBtn = e.target.closest && e.target.closest('button, a, summary, input');
    if (e.code === 'Space') { if (onBtn && !playing) return; e.preventDefault(); if (!kbHeat) { kbHeat = true; kbGlide = true; kbLast = performance.now(); document.querySelector('.mbar').classList.add('kbheat'); } return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { if (e.target.type === 'range') return; // the slider moves itself
      if (!playing && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return; // outside a game up/down keep scrolling the page
      e.preventDefault(); kbUsed = performance.now(); const s = $('tsliderM'), d = (+s.max - +s.min) / 20 * (e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1); kbGlide = false; kbT(tset + d); }
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space' && kbHeat) { kbHeat = false; kbLast = performance.now(); document.querySelector('.mbar').classList.remove('kbheat'); } });
  addEventListener('blur', () => { kbHeat = false; });
  (function kbLoop(now) { // the same response as the microphone: up in about 0.3 s, down in about 0.6 s
    if (kbGlide && kbFree()) { const s = $('tsliderM'), lo = +s.min, hi = +s.max, dt = Math.min(0.5, (now - kbLast) / 1000); kbLast = now; /* slow computers draw few frames: follow real time */
      const target = kbHeat ? lo + 0.95 * (hi - lo) : lo + 0.05 * (hi - lo), k = 1 - Math.exp(-dt / (kbHeat ? 0.3 : 0.6)), v = tset + k * (target - tset);
      if (Math.abs(v - tset) > 1e-4) kbT(v); if (!kbHeat && Math.abs(target - v) < 0.002 * (hi - lo)) kbGlide = false; }
    else kbLast = now;
    requestAnimationFrame(kbLoop); })(performance.now());
  // projector options, kept in this browser
  const dispSet = () => { const big = $('optBig').checked, hi = $('optHi').checked; document.documentElement.classList.toggle('bigtext', big); document.documentElement.classList.toggle('hicon', hi);
    try { localStorage.setItem('mdlab-display', JSON.stringify({ big, hi })); } catch (e) {} requestAnimationFrame(() => { if (typeof fitSim === 'function') fitSim(); }); };
  try { const d = JSON.parse(localStorage.getItem('mdlab-display') || '{}'); $('optBig').checked = !!d.big; $('optHi').checked = !!d.hi; } catch (e) {}
  $('optBig').addEventListener('change', dispSet); $('optHi').addEventListener('change', dispSet); dispSet();
