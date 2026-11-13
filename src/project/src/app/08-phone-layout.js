  // ---------- phones: the options live in a bottom sheet, the mode switch in a bar at the bottom ----------
  const phoneUI = () => matchMedia('(max-width: 700px)').matches;
  function sheet(open) { const w = document.querySelector('.wrap'); if (open && !phoneUI()) return;
    w.classList.toggle('sheet-open', !!open); $('sheetBack').hidden = !open; $('mbOpt').setAttribute('aria-expanded', String(!!open));
    $('sheetTitle').textContent = T(appMode === 'game' ? 'Game' : appMode === 'scan' ? 'Energy scan' : 'Explore');
    if (open) $('rack').scrollTop = 0; }
  document.querySelectorAll('[data-mbmode]').forEach((b) => b.addEventListener('click', () => { const m = b.dataset.mbmode; if (m !== appMode) setAppMode(m);
    if (m === 'scan') { sheet(false); requestAnimationFrame(() => { const t = $('thermoPanel'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); return; } // scan: straight to its buttons and graphs
    sheet(true); }));
  function toSettings() { // Explore: show this system's own settings (Composition and interactions)
    const r = $('rack'), c = [$('compPanel'), $('modelPanel')].find((el) => el && el.offsetParent !== null); if (!c) return; // systems without own settings (Ice): the model and box settings
    const y = c.getBoundingClientRect().top - r.getBoundingClientRect().top + r.scrollTop - r.querySelector('.sheethead').offsetHeight - 8;
    r.scrollTop = Math.max(0, y); }
  $('mbOpt').addEventListener('click', () => {
    const isOpen = document.querySelector('.wrap').classList.contains('sheet-open');
    if (appMode === 'explore') { if (!isOpen) sheet(true); [0, 60, 320].forEach((t) => setTimeout(toSettings, t)); return; } // again after the slide-in, which some phones need
    sheet(!isOpen); });
  $('sheetClose').addEventListener('click', () => sheet(false)); $('sheetBack').addEventListener('click', () => sheet(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.wrap').classList.contains('sheet-open')) sheet(false); });
  matchMedia('(max-width: 700px)').addEventListener('change', (e) => { if (!e.matches) sheet(false); });
  // picking a game or a system closes the sheet so the box is in view; Start on the box begins the game
  $('gpick').addEventListener('click', (e) => { if (e.target.closest('[data-game]') && phoneUI()) setTimeout(() => sheet(false), 120); });
  document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { if (phoneUI()) setTimeout(() => sheet(false), 120); }));

