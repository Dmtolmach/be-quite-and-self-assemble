# Shut Up and Get Structured — download and install

A molecular dynamics game for schools: students control molecules with their voice. It runs in any modern browser (Chrome, Edge, Firefox, Safari) on laptops, tablets and phones. No account, no server, no internet needed once you have it.

**Play online:** https://dmtolmach.github.io/be-quite-and-self-assemble/

## 1. Use it from one file

1. Download **[amphiphile-assembly-lab.html](https://github.com/Dmtolmach/be-quite-and-self-assemble/raw/main/docs/amphiphile-assembly-lab.html)** (if the browser shows code instead: right-click the link → *Save link as…*).
2. Double-click the file. It opens in your browser and works with no internet.
3. For a classroom, copy the same file to each computer or a USB stick.

The browser asks for the microphone the first time a student presses **Mic**. The microphone is optional: the slider and the keyboard (hold Space) do the same job.

## 2. Install it as an app

1. Open https://dmtolmach.github.io/be-quite-and-self-assemble/
2. Install:
   - **Chrome or Edge** (Windows, macOS, Chromebook, Android): the install icon in the address bar, or *Teacher options → Use without internet → Install as an app* at the bottom of the page.
   - **iPad or iPhone** (Safari): *Share → Add to Home Screen*.
3. The app opens from the home screen or app list and works with no internet. When it is opened online it picks up new versions by itself.

## 3. Privacy (for the school)

The sound is analysed inside the browser and never recorded, stored or sent. The page makes no network connections of its own: no analytics, cookies, accounts or adverts, and the fonts are built in. Progress is kept only in that browser; *Teacher options → Delete saved data* removes it. Details: *Privacy and offline use* in [README.md](README.md).

## 4. Your own copy (fork)

1. **Fork** this repository on GitHub.
2. In your fork: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder **`/docs`**, **Save**.
3. After a minute your copy is at `https://<your-user>.github.io/be-quite-and-self-assemble/`.

The `docs/` folder is the whole website: the page (also as `index.html`), `manifest.webmanifest`, `sw.js` and the icons. Keep them together; they are what make installing and offline use work.

## 5. For developers

```
git clone https://github.com/Dmtolmach/be-quite-and-self-assemble.git
cd be-quite-and-self-assemble
python3 build.py          # src/ -> docs/
python3 run_tests.py      # all checks (needs Node, Playwright for Python, and `npm install` in tests/ once)
```

The source is split into parts under `src/`; `build.py` joins them into the one HTML file in `docs/`. See [DEVELOPING.md](DEVELOPING.md).
