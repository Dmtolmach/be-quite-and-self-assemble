# Monetization adapters (off)

The school version of the app has **no monetization**: `python3 build.py` writes `docs/` without any adapter, and `MONET.hook()` / `MONET.offer()` in `src/app/20f-monetization.js` do nothing.

This folder is the place for a **separate** build for web-game portals, if one is ever wanted:

```
python3 build.py --monet src/monet/example-adapter.js --out build-portal/index.html
```

`--monet` refuses to write into `docs/`. The adapter sets `MONET.adapter = { gameStart, gameEnd, share, offer }`; each is optional. Hooks never fire in class mode, class battles, the guided first game, or when a teacher has unlocked everything.

`example-adapter.js` only logs to the console. A real adapter would load a portal SDK, which makes network requests, so such a build no longer matches the privacy note in the app: change that text in the portal build too.
