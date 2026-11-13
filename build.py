#!/usr/bin/env python3
"""Build the single-file app from src/.

    python3 build.py              -> docs/amphiphile-assembly-lab.html
    python3 build.py --out X.html -> another path

The page stays one self-contained HTML file (that is what teachers download and what the artifact serves);
src/ only splits it into parts that are easier to read and edit:
  src/head.html      <head> up to <style>
  src/styles.css     all CSS
  src/body.html      the page markup
  src/engine.js      MDEngine, the physics (also loaded by the node scripts in tests/ and sim/)
  src/app/*.js       the app, in the order given by src/manifest.json (one IIFE across the files)
  src/i18n/*.json    translations: English text -> translated text, one file per language
  src/tail.html      closing tags
  src/fonts/         the two fonts (OFL), embedded into the page so it needs no internet
  src/pwa/           app icons; the build also writes the web-app manifest and the offline service worker

docs/ then holds everything for a web server (e.g. GitHub Pages): the page (also as index.html), manifest.webmanifest,
sw.js and the icons. The page alone (docs/amphiphile-assembly-lab.html) also works offline when opened from disk.
"""
import base64, hashlib, json, os, shutil, sys
ROOT = os.path.dirname(os.path.abspath(__file__)); S = lambda *p: os.path.join(ROOT, 'src', *p)
read = lambda p: open(p, encoding='utf-8').read()

def i18n_block():
    man = json.load(open(S('manifest.json')))
    langs = []
    for lang in man['languages']:
        d = json.load(open(S('i18n', lang + '.json'), encoding='utf-8'))
        rows = ',\n'.join('  ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) for k, v in d.items())
        langs.append(f' {json.dumps(lang)}: {{\n{rows}\n }}')
    return '  const I18N = {\n' + ',\n'.join(langs) + '\n};'

def fonts_block():  # @font-face rules with the font files inlined, so the page never asks a font server
    faces = json.load(open(S('fonts', 'fonts.json')))['faces']; out = []
    for f in faces:
        b64 = base64.b64encode(open(S('fonts', f['file']), 'rb').read()).decode()
        out.append(f"@font-face {{ font-family: '{f['family']}'; font-style: normal; font-display: swap; font-weight: {f['weight']}; "
                   f"src: url(data:font/woff2;base64,{b64}) format('woff2'); unicode-range: {f['range']}; }}")
    return '<style>\n' + '\n'.join(out) + '\n</style>'

def build():
    man = json.load(open(S('manifest.json')))
    app = ''.join(read(S('app', f)) for f in man['app'])
    assert app.count('/*@I18N@*/') == 1, 'the I18N marker must appear once in src/app'
    app = app.replace('/*@I18N@*/', i18n_block())
    return (read(S('head.html')).replace('<!--@FONTS@-->', fonts_block()) + '<style>\n' + read(S('styles.css')) + '</style>\n' + read(S('body.html')) +
            '<script>\n' + read(S('engine.js')) + '</script>\n<script>\n' + app + '</script>\n' + read(S('tail.html')))

# Earlier releases lived at the repository root under these names, and many people have direct links to them.
# Every build writes the current page to these names too, so those links open the newest version.
LEGACY = ['amphiphile-assembly_v6.html', 'amphiphile-assembly-lab_v6.html', 'amphiphile-assembly-lab.html']

MANIFEST = {'name': 'Shut Up and Get Structured', 'short_name': 'Get Structured', 'description': 'Control molecules with your voice: a molecular dynamics game for schools.',
            'start_url': './', 'scope': './', 'display': 'standalone', 'background_color': '#f4f7f8', 'theme_color': '#1f8a8a',
            'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                      {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}, {'src': 'icon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]}
SW = '''// Offline cache for Shut Up and Get Structured. Written by build.py; the version changes with every build.
const CACHE = 'sugs-%s', FILES = ['./', './index.html', './amphiphile-assembly-lab.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon.svg', './apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// the cached copy first (works with no internet); a new version is picked up on the next build's install
self.addEventListener('fetch', (e) => { const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((hit) => hit || fetch(r).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); return res; }))); });
'''

if __name__ == '__main__':
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'docs', 'amphiphile-assembly-lab.html')
    d = os.path.dirname(out); os.makedirs(d, exist_ok=True); html = build()
    open(out, 'w', encoding='utf-8').write(html)
    if '--out' not in sys.argv:  # the files a web server needs for "install as app" and offline use
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(html)
        json.dump(MANIFEST, open(os.path.join(d, 'manifest.webmanifest'), 'w'), indent=1)
        open(os.path.join(d, 'sw.js'), 'w').write(SW % hashlib.sha1(html.encode()).hexdigest()[:10])
        for f in os.listdir(S('pwa')): shutil.copy(S('pwa', f), os.path.join(d, f))
        for name in LEGACY:  # older file names that people still link to directly: keep them pointing at the current version
            open(os.path.join(ROOT, name), 'w', encoding='utf-8').write(html)
    print(f'built {out} ({len(html) // 1024} kB)')
