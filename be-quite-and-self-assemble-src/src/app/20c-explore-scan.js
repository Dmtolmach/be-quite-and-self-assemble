  // ---------- the energy scan is an option inside Explore; on phones it closes the sheet and shows the scan graphs ----------
  document.querySelectorAll('.subseg [data-appmode]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.appmode !== 'scan' || !phoneUI()) return;
    sheet(false); requestAnimationFrame(() => { const t = $('thermoPanel'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }));
  applyLocks(); locksLive = true; // start-up itself opens the games
