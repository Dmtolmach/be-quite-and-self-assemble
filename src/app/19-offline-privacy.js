  // ---------- privacy and offline use: what the page does with the microphone, deleting saved data, installing as an app ----------
  const privOpen = () => { $('privModal').hidden = false; $('privClose').focus(); }, privShut = () => { $('privModal').hidden = true; };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-privacy]')) privOpen(); });
  $('privClose').addEventListener('click', privShut);
  $('privModal').addEventListener('click', (e) => { if (e.target === $('privModal')) privShut(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('privModal').hidden) privShut(); });
  // delete everything this page saved in the browser (stars, cards, settings); two clicks, since the page shows no confirm dialogs
  let wipeArm = 0;
  $('wipeData').addEventListener('click', () => { const b = $('wipeData');
    if (!wipeArm) { wipeArm = setTimeout(() => { wipeArm = 0; b.textContent = T('Delete saved data'); }, 4000); b.textContent = T('Click again to delete everything'); return; }
    clearTimeout(wipeArm); wipeArm = 0;
    try { Object.keys(localStorage).filter((k) => k.startsWith('mdlab-')).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    location.reload(); });
  // installing: on a web server (https) the page offers a manifest and an offline cache (sw.js next to it); opened from disk it is already offline
  const oflNote = (txt) => { $('oflNote').hidden = !txt; $('oflNote').textContent = txt || ''; };
  const served = (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window.self;
  if (served) {
    const add = (rel, href) => { const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l); };
    add('manifest', 'manifest.webmanifest'); add('apple-touch-icon', 'apple-touch-icon.png');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  let installEv = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEv = e; $('pwaInstall').hidden = false; });
  $('pwaInstall').addEventListener('click', () => { if (!installEv) return; installEv.prompt(); installEv.userChoice.finally(() => { installEv = null; $('pwaInstall').hidden = true; }); });
  addEventListener('appinstalled', () => { $('pwaInstall').hidden = true; oflNote(T('Installed: it now opens from the home screen or app list, also with no internet.')); });
  if (location.protocol === 'file:' || window.top !== window.self) $('dlPage').hidden = true; // already a file on this computer, or shown inside another site (e.g. the claude.ai viewer), which cannot save files
  $('dlPage').addEventListener('click', async () => {
    try { const r = await fetch(location.href, { cache: 'force-cache' }); const txt = await r.text(); if (!r.ok || !txt.includes('MDEngine')) throw new Error('not the page');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/html' })); a.download = 'amphiphile-assembly-lab.html';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      oflNote(T('Saved as amphiphile-assembly-lab.html: open it from the computer, no internet needed. Copy it to a USB stick for other computers.'));
    } catch (e) { oflNote(T('Your browser can save it: press Ctrl+S (⌘S on a Mac) and keep the file. It opens with no internet.')); } });
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS && served) oflNote(T('On an iPad or iPhone: Share, then Add to Home Screen.'));
