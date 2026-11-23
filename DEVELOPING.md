# Developing Shut Up and Get Structured

The app is delivered as **one self-contained HTML file** (`docs/amphiphile-assembly-lab.html`): that is what teachers download, what GitHub serves and what the claude.ai artifact shows. To make it easier to work on, the source is split into parts under `src/`, and `build.py` joins them back into that one file.

```
python3 build.py            # src/ -> docs/ (the page, plus what GitHub Pages needs to install it as an app)
python3 run_tests.py        # build + every check (about 4 min)
python3 run_tests.py --quick  # build, syntax, physics, startup (about 30 s)
```

Requirements: Python 3, Node.js, Playwright for Python (`pip install playwright`) and, once, `npm install` in `tests/` (axe-core for the accessibility check). The tests use a system Chrome when there is one, otherwise run `playwright install chromium` once.

## Where things are

| File | What is in it |
|---|---|
| `src/head.html` | `<head>`: title, meta tags, fonts |
| `src/styles.css` | All CSS: colour tokens (light and dark), layout, phone layout (`max-width: 700px`), class mode, cards, end card |
| `src/body.html` | The page markup: header, box, mode tabs, panels, help card, cards album, Teacher options |
| `src/engine.js` | `MDEngine`, the physics: forces (LJ/WCA, Mercedes-Benz water), Langevin/Bussi thermostats, barostat, flow and hot band, analysis (ice share, mixing, gel path, drug release). No DOM; also used by the Node tools and tests |
| `src/app/00-start.js` | Start of the app script (one IIFE runs across all `app/*.js` files), `T()` translation function, colours |
| `src/app/01-systems.js` | One definition per Explore system, its analysis and readouts, building a system, temperature control |
| `src/app/02-microphone-sound.js` | Microphone level, set-up wizard, pitch → pressure, **sound effects** (`SFX`) |
| `src/app/03-controls.js`, `04-switch-system.js` | Sliders, options, switching systems |
| `src/app/05-games.js` | **The four games** (`GAMES`: goal, range, stars, scoring), game loop, end card, statistics |
| `src/app/05b-speed-run.js` | **Speed run** for all four games, opened by 3 stars in that game: reach a target (`SPEED`: ice 75 %, separation 0.90, drug 75 %, gel 160 σ, won the moment it is reached; in every drug game the lost drug fills the score band from the right) as fast as possible, no time limit (the drug run ends early if the target can no longer be reached). The HUD shows the score now, the goal, the clock and the fastest time; the star band and green path are hidden. Finished when the score stays at the target for 1.5 s; best time `mdlab-speed-<game>`; 3 stars win a card from that game's speed deck; *Start again* beside *Give up* restarts at once |
| `src/app/06-class-mode.js` | Class mode (projector) |
| `src/app/07-help-tour.js` | Welcome card and help tour, including the intro story animation |
| `src/app/08-phone-layout.js`, `09-app-modes.js` | Phone bottom sheet; Game / Explore / Energy scan switching |
| `src/app/10-preview-film.js` | **The aim** shown on the box before a game: a still picture of the target per game (ice crystal, separated liquids, drug at the start of a red window, a stored gel snapshot `GEL_AIM` with a 186 σ path), drawn once into an image per size/language/theme. Kept the old function names (`demoTick`, `demoFrame`, `drawDemo`) used by the main loop |
| `src/app/10b-rewards.js` | **Step-by-step opening**: a new player sees only the first game; each finished game opens the next item of `REWARDS` (games, Explore with Ice only, then each other Explore system one at a time, Energy scan, statistics; the microphone settings are always shown). *Teacher options → Unlock everything* opens all |
| `src/app/11-coach-guide.js` | Temperature words, green band (`bandNow()`: shown in the guided first game, which explains it, and otherwise only with *Show tips* ticked, `mdlab-tips` = 1), coach line (guided game only), guided first lesson, replay graph |
| `src/app/12-fact-cards.js` | Fact cards (54 cards in 9 decks: one per game, one per game's speed run, Explore) and the album |
| `src/app/13-challenges.js`, `14-class-battle.js` | Challenges (5 levels per game) and class battles |
| `src/app/15-energy-scan.js` | Energy scan mode |
| `src/app/16-rendering.js`, `17-follow-molecule.js` | Drawing (**speed glow** `velGlow`: a halo per molecule, blue → red by its smoothed ½v², option `mdlab-glow`; **box thermometer** `boxThermo` on the right edge in Game mode; smooth motion: the picture follows the molecules with a 0.07 s lag; option *Teacher options → Smooth motion*, kept as `mdlab-smooth`), adaptive quality, fitting the box to the screen (`fitSim`), follow-a-molecule |
| `src/app/18-prototypes.js` | **Prototype games** (`PROTOS`: Micelle stream, Follow the line, Heat-wave survival): lives, combos, levels that speed up every 20 s, fixed seeds, floating score texts and screen shake. Shown with *Teacher options → Show prototype games* |
| `src/app/19-accessibility.js` | Keyboard play (Space heats, arrows step), screen-reader announcements (`say()`), projector options (larger text, high contrast) |
| `src/app/20-offline-privacy.js` | Privacy dialog, deleting saved data, install as app, download for offline use |
| `src/app/20a-highlights.js` | Game highlights: a new piece of ice crystal (≥5 molecules frozen for good within 2 s, joined by hydrogen-bond neighbours) glows along its own bonds; a liquid domain glows only where it grows beyond its record size (not edge fluctuations); a gel path that beats its record gets a running spark |
| `src/app/20b-macro-film.js` | After a game: zoom out from the box into a hand-drawn real-life picture chosen by the stars (ice cube or ice cream, glass of liquids, patient, gel/egg); the end card then shows that picture with the stars and the verdict in one window and stays open; a won fact card waits behind a button; `window.__macro(id, stars)` plays it for tests |
| `src/app/20c-explore-scan.js` | Energy scan as an option inside Explore |
| `src/app/20d-live-ghost.js` | The **ghost**: your best run in ice, liquids and gel (saved at a new personal best as `mdlab-ghost-<game>`) shown as 👻 on the score band at the same second. Off with *Race my best run* in the game options |
| `src/app/20e-daily-share.js` | **Daily Molecule** (`dailyInfo()`: one game a day in turn, seed from the date, #1 = 2026-11-23), **challenge links** (`?c=` base64url of `{g, s, v, d, r}`: game, seed, score to beat, daily number, and `r` the run's score at each second 0–30 s as bytes of the game's scale, shown as the 😊 ghost), the **share window** and the **clip** (`clipStart/clipTick/clipStop`: a 540×960 canvas drawn from the box, temperature bar and score, recorded with `MediaRecorder`, MP4 if the browser can, else WebM; no audio). `special` holds the current daily/challenge run; `build()` takes its seed, a normal `selectGame()` clears it. Only `var`/function declarations at the top level, because `renderPick()` calls `dailyRender()` before this part runs |
| `src/app/20f-monetization.js` | **Monetization hooks, switched off**: `MONET.hook(name, info)` (gameStart, gameEnd, share) and `MONET.offer(kind)` do nothing without an adapter. See *Monetization (off)* below |
| `src/app/21-main-loop.js` | Main loop, start-up, debug line (`?debug=1`) |
| `src/i18n/fi.json`, `sv.json`, `ru.json` | Translations: English text → translated text |
| `src/manifest.json` | Order of the `app/*.js` parts and the list of languages |

The `app/*.js` parts are plain slices of one script, joined in the order of `manifest.json`: they share one scope, so a function in one file can call a function in another. To add a part, create the file and put its name in `manifest.json` at the right place.

## Screen readers

`say(text)` (in `19-accessibility.js`) reads a short message through a polite live region: stars as they are earned, the game result, and the temperature word while the keyboard drives it. In games the slider's spoken value is the temperature word (cold / cool / warm / hot). Use `say()` for any new event a blind player needs to hear; keep it short.

## Translations

- Text written by the script goes through `T('English text', { n: 3 })`; `{n}` is replaced by the value.
- Static text in `src/body.html` is translated automatically: the key is the element's English inner HTML with spaces collapsed (so `<b>` tags are part of the key).
- Add every new English text to **all three** files in `src/i18n/` with the same key. `tests/test_i18n.py` visits the whole app and fails if any text it sees has no translation.
- The Finnish and Swedish texts have not yet been reviewed by a native speaker.

## Things that have bitten before

- **Browser form restoring.** On reload the browser may put back old checkbox states and shuffle them when new checkboxes are added; every checkbox has `autocomplete="off"` for this reason.

- **`//` comments in one-line code.** Many lines hold several statements. A `// comment` added in the middle of such a line silently turns the rest of the line into a comment (this broke the heat-wave background and the challenge setup). Inside a line use `/* … */`; put `//` only at the true end of a line.
- **Order of declarations.** Several parts read variables declared in later parts (`coachReady`, `game`, `battle` are declared early with `var` for this reason). Calling such a function during start-up before its `let`/`const` is reached gives a "Cannot access … before initialization" error; `tests/test_startup.py` catches it.
- **Sounds and the microphone.** Every sound goes through `SFX.note`, which sets `SFX.busyUntil` (including the device's output latency); `levelDb()` holds the last reading until then, so the game never hears itself. On phones and tablets `SFX.note` plays nothing while the microphone drives a game or the guided lesson (the speaker is next to the microphone). New sounds must use `SFX.note` too.
- **Phones.** Anything wider than 320 px (long `<select>` options, long button labels in Russian) makes the whole page wider than the screen and pushes the bottom bar off. `tests/test_buttons.py` and `tests/test_layout.py` check this.

## Saved in the browser (localStorage)

`mdlab-welcome`, `mdlab-tour` (welcome / tour seen) · `mdlab-guided` (guided first game done) · `mdlab-unlock`, `mdlab-ladall` (teacher unlocks) · `mdlab-played` (finished games: opens rewards), `mdlab-fresh` (newest reward, marked NEW) · `mdlab-ladder-<game>` (challenge progress) · `mdlab-stats-<game>` (statistics) · `mdlab-cards` (fact cards) · `mdlab-daily` (today's Daily Molecule: date, best, tries), `mdlab-streak` (days in a row) · `mdlab-tips`, `mdlab-clip`, `mdlab-glow`, `mdlab-sound`, `mdlab-pitch`, `mdlab-mode`, `mdlab-display`, `mdlab-proto` (settings). Clear them to see the app as a new student would.

## Tests (`tests/`)

| Test | Checks |
|---|---|
| `test_engine.js` | Every system builds, runs 400 steps and stays finite (Node, no browser) |
| `test_startup.py` | No script errors: first visit, 4 languages, every mode and system, help tour, class mode |
| `test_i18n.py` | Every text seen has a translation in every language |
| `test_layout.py` | On 4 computer screen sizes the whole box and temperature bar fit; phones are not wider than the screen; the page end is not under the bottom bar |
| `test_buttons.py` | No button or menu text overflows, phone 320 px and desktop, 4 languages |
| `test_offline_privacy.py` | No network requests from the page; the served copy (with `sw.js`) reloads offline |
| `test_keyboard.py` | Holding Space heats, letting go cools, arrows step, in a game and in Explore; projector options switch on, keep the box on screen and are remembered |
| `test_a11y.py` | axe-core (WCAG 2.1 A/AA) on every mode, phone and desktop, the welcome card; colour contrast in high-contrast mode |
| `test_aim_band.py` | Every game shows its aim picture; the green band is off in a normal game and comes back with *Show tips*; the noise bar is not under the box |
| `test_daily_share.py` | The Daily Molecule uses the day's seed, saves the best and the streak, records a clip; the end card has Share; the share text carries a challenge link that opens the invitation and replays the same seed and drug windows; no monetization adapter in the normal build |
| `test_games.py` | Every game, two challenges and the three prototype games start and stop; a full ice game played along the green path gets at least one star and shows the end card |

Set `MDLAB_PAGE=/path/to/file.html` to run the browser tests on another build.

## Tools (`tools/`)

- `calibration/gamecal.js` – plays the ice, liquids or gel game headless with a fixed strategy: `node tools/calibration/gamecal.js ice path 1`.
- `calibration/gelage.js` – does the gel strand get shorter the longer you wait? Plays heat-then-cool (optionally in cycles) and logs the gel path every second: `node tools/calibration/gelage.js 1 0.7 8 0.12 120 [cycle]`. Result (Nov 2026, 6 seeds): the strand peaks 7–22 s after cooling (mean 123 σ, 13 % of the time ≥ 160 σ), then the clumps compact and it shrinks (mean 76 σ and nothing ≥ 130 σ after 90 s). Heating again resets it: a second heat-cool cycle gives a peak as long as the first.
- `calibration/geltarget.js` – finds a long gel snapshot for the aim picture.
- `calibration/speedcal.js` – game seconds to reach a speed-run target with a fixed strategy (cX constant, rA_B_D ramp): `node tools/calibration/speedcal.js ice 0.47 r0.4_0_10 1`.
- `calibration/drugch.js` – the drug challenge headless, with every parameter on the command line: `node tools/calibration/drugch.js k=3 s=follow hi=5 sq=1 spill=0.39 …`.
- `calibration/drugcal.js`, `drugrel.js` – drug zone game and micelle release kinetics vs temperature: `node tools/calibration/drugrel.js 1.5 2.5`.
- `proto_bot.py` – plays a prototype game in the browser with a human-like lag and saves screenshots: `python3 tools/proto_bot.py p-line`.
- `cvd_simulate.py` – colour-blindness simulation (protan, deutan, tritan) of screenshots: `python3 tools/cvd_simulate.py shot.png`.
- `split.py` – the one-off script that cut the old single file into `src/` (kept for reference).

## Monetization (off)

The school version has no adverts, purchases or tracking, and must stay that way (privacy note, GDPR). To keep a later option open without adding anything now:
- `src/app/20f-monetization.js` defines `MONET`. The game calls `MONET.hook('gameStart' | 'gameEnd' | 'share', info)`; a future rewarded button would `await MONET.offer(kind)` (resolves `false` today). Hooks never fire in class mode, class battles, the guided first game, or with *Unlock everything* on.
- The adapter is pasted in at build time only: `python3 build.py --monet src/monet/example-adapter.js --out build-portal/index.html`. `--monet` refuses to write into `docs/`, so the school build never contains one. `src/monet/example-adapter.js` only logs to the console; see `src/monet/README.md`.
- A real adapter (a portal's ad SDK) makes network requests, so that build needs its own privacy text.

## Old links

Earlier versions sat at the repository root as `amphiphile-assembly_v6.html`, `amphiphile-assembly-lab_v6.html` and `amphiphile-assembly-lab.html`, and many people link to them directly. `build.py` writes the current page to those three names as well (list `LEGACY` in `build.py`), so old links always open the newest version. Commit them together with `docs/`.

## Releasing

1. `python3 run_tests.py` – all must pass.
2. Commit and push: GitHub Pages serves the `docs/` folder (https://dmtolmach.github.io/be-quite-and-self-assemble/).
3. Update the teacher README if anything visible changed.
