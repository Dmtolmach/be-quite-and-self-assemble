  // Example monetization adapter: it only writes to the browser console. It loads no SDK and makes no network requests.
  // Copy this file for a real portal build (e.g. a web-game portal's ad SDK) and replace the console lines with the SDK calls.
  // It is pasted inside the app script, so it can use MONET, T(), $() and the rest; it is never part of the school build.
  MONET.adapter = {
    gameStart(info) { console.log('[monet] gameStart', info); },
    gameEnd(info) { console.log('[monet] gameEnd (natural break)', info); },
    share(info) { console.log('[monet] share', info); },
    offer(kind, info) { console.log('[monet] offer', kind, info); return false; }, // return true (or a Promise of true) after a finished rewarded ad
  };
