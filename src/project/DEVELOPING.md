# Developing Shut Up and Get Structured

The app is delivered as **one self-contained HTML file** (`dist/amphiphile-assembly-lab.html`): that is what teachers download, what GitHub serves and what the claude.ai artifact shows. To make it easier to work on, the source is split into parts under `src/`, and `build.py` joins them back into that one file.

```
python3 build.py            # src/ -> dist/amphiphile-assembly-lab.html
python3 run_tests.py        # build + every check (about 4 min)
python3 run_tests.py --quick  # build, syntax, physics, startup (about 30 s)
```

Requirements: Python 3, Node.js, and Playwright for Python (`pip install playwright`). The tests use a system Chrome when there is one, otherwise run `playwright install chromium` once.

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
| `src/app/06-class-mode.js` | Class mode (projector) |
| `src/app/07-help-tour.js` | Welcome card and help tour, including the intro story animation |
| `src/app/08-phone-layout.js`, `09-app-modes.js` | Phone bottom sheet; Game / Explore / Energy scan switching |
| `src/app/10-preview-film.js` | Goal preview film shown before a game |
| `src/app/11-coach-guide.js` | Temperature words, green band, coach line (guided game only), guided first lesson, replay graph |
| `src/app/12-fact-cards.js` | Fact cards (30 cards in 5 decks) and the album |
| `src/app/13-challenges.js`, `14-class-battle.js` | Challenges (5 levels per game) and class battles |
| `src/app/15-energy-scan.js` | Energy scan mode |
| `src/app/16-rendering.js`, `17-follow-molecule.js` | Drawing, adaptive quality, fitting the box to the screen (`fitSim`), follow-a-molecule |
| `src/app/18-main-loop.js` | Main loop, start-up, debug line (`?debug=1`) |
| `src/i18n/fi.json`, `sv.json`, `ru.json` | Translations: English text → translated text |
| `src/manifest.json` | Order of the `app/*.js` parts and the list of languages |

The `app/*.js` parts are plain slices of one script, joined in the order of `manifest.json`: they share one scope, so a function in one file can call a function in another. To add a part, create the file and put its name in `manifest.json` at the right place.

## Translations

- Text written by the script goes through `T('English text', { n: 3 })`; `{n}` is replaced by the value.
- Static text in `src/body.html` is translated automatically: the key is the element's English inner HTML with spaces collapsed (so `<b>` tags are part of the key).
- Add every new English text to **all three** files in `src/i18n/` with the same key. `tests/test_i18n.py` visits the whole app and fails if any text it sees has no translation.
- The Finnish and Swedish texts have not yet been reviewed by a native speaker.

## Things that have bitten before

- **`//` comments in one-line code.** Many lines hold several statements. A `// comment` added in the middle of such a line silently turns the rest of the line into a comment (this broke the heat-wave background and the challenge setup). Inside a line use `/* … */`; put `//` only at the true end of a line.
- **Order of declarations.** Several parts read variables declared in later parts (`coachReady`, `game`, `battle` are declared early with `var` for this reason). Calling such a function during start-up before its `let`/`const` is reached gives a "Cannot access … before initialization" error; `tests/test_startup.py` catches it.
- **Sounds and the microphone.** Every sound goes through `SFX.note`, which sets `SFX.busyUntil`; `levelDb()` holds the last reading until then, so the game never hears itself. New sounds must use `SFX.note` too.
- **Phones.** Anything wider than 320 px (long `<select>` options, long button labels in Russian) makes the whole page wider than the screen and pushes the bottom bar off. `tests/test_buttons.py` and `tests/test_layout.py` check this.

## Saved in the browser (localStorage)

`mdlab-welcome`, `mdlab-tour` (welcome / tour seen) · `mdlab-guided` (guided first game done) · `mdlab-unlock`, `mdlab-ladall` (teacher unlocks) · `mdlab-ladder-<game>` (challenge progress) · `mdlab-stats-<game>` (statistics) · `mdlab-cards` (fact cards) · `mdlab-tips`, `mdlab-sound`, `mdlab-pitch`, `mdlab-mode` (settings). Clear them to see the app as a new student would.

## Tests (`tests/`)

| Test | Checks |
|---|---|
| `test_engine.js` | Every system builds, runs 400 steps and stays finite (Node, no browser) |
| `test_startup.py` | No script errors: first visit, 4 languages, every mode and system, help tour, class mode |
| `test_i18n.py` | Every text seen has a translation in every language |
| `test_layout.py` | On 4 computer screen sizes the whole box and temperature bar fit; phones are not wider than the screen; the page end is not under the bottom bar |
| `test_buttons.py` | No button or menu text overflows, phone 320 px and desktop, 4 languages |
| `test_games.py` | Every game and two challenges start and stop; a full ice game played along the green path gets at least one star and shows the end card |

Set `MDLAB_PAGE=/path/to/file.html` to run the browser tests on another build.

## Tools (`tools/`)

- `calibration/gamecal.js` – plays the ice, liquids or gel game headless with a fixed strategy: `node tools/calibration/gamecal.js ice path 1`.
- `calibration/drugch.js` – the drug challenge headless, with every parameter on the command line: `node tools/calibration/drugch.js k=3 s=follow hi=5 sq=1 spill=0.39 …`.
- `calibration/drugcal.js`, `drugrel.js` – drug zone game and micelle release kinetics vs temperature: `node tools/calibration/drugrel.js 1.5 2.5`.
- `cvd_simulate.py` – colour-blindness simulation (protan, deutan, tritan) of screenshots: `python3 tools/cvd_simulate.py shot.png`.
- `split.py` – the one-off script that cut the old single file into `src/` (kept for reference).

## Releasing

1. `python3 run_tests.py` – all must pass.
2. Publish `dist/amphiphile-assembly-lab.html` (GitHub, the artifact).
3. Update the teacher README if anything visible changed.
