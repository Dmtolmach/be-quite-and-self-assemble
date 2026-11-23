  // ---------- Monetization hooks: switched OFF ----------
  // Nothing here shows adverts, sells anything or talks to the network. The game calls MONET.hook() at a few natural moments, and
  // MONET.offer() is the place a future "watch an ad for …" button would ask; with no adapter both do nothing.
  // An adapter (an ad or store SDK wrapper for a web-portal build) is only added by `python3 build.py --monet <file> --out <path>`;
  // the normal build (docs/, the school version) never contains one, and tests/test_offline_privacy.py checks it makes no requests.
  // See "Monetization (off)" in DEVELOPING.md.
  //
  // Hook names and when they fire:
  //   gameStart { game }          a game run starts (after Start / Try again)
  //   gameEnd   { game, stars }   a normal game ends: the natural break for an interstitial in a portal build
  //   share     { game }          the share window opens
  // Never in class mode, class battles, the guided first game or when a teacher has unlocked everything (a classroom signal).
  var MONET = {
    adapter: null, // set by the build-time adapter only
    get enabled() { return !!MONET.adapter; },
    quiet() { return classOn || !!battle || !!guide || (typeof unlockAll === 'function' && unlockAll()); },
    hook(name, info) { const a = MONET.adapter; if (!a || MONET.quiet() || typeof a[name] !== 'function') return; try { a[name](info || {}); } catch (e) {} },
    offer(kind, info) { const a = MONET.adapter; if (!a || MONET.quiet() || typeof a.offer !== 'function') return Promise.resolve(false); // resolves true only if the player chose to watch and finished
      try { return Promise.resolve(a.offer(kind, info || {})).then((r) => !!r, () => false); } catch (e) { return Promise.resolve(false); } },
  };
  /*@MONET@*/
  window.__monet = () => ({ enabled: MONET.enabled }); // for tests
