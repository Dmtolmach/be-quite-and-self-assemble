#!/usr/bin/env python3
"""Build the single-file app from src/.

    python3 build.py              -> dist/amphiphile-assembly-lab.html
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
"""
import json, os, sys
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

def build():
    man = json.load(open(S('manifest.json')))
    app = ''.join(read(S('app', f)) for f in man['app'])
    assert app.count('/*@I18N@*/') == 1, 'the I18N marker must appear once in src/app'
    app = app.replace('/*@I18N@*/', i18n_block())
    return (read(S('head.html')) + '<style>\n' + read(S('styles.css')) + '</style>\n' + read(S('body.html')) +
            '<script>\n' + read(S('engine.js')) + '</script>\n<script>\n' + app + '</script>\n' + read(S('tail.html')))

if __name__ == '__main__':
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'dist', 'amphiphile-assembly-lab.html')
    os.makedirs(os.path.dirname(out), exist_ok=True); html = build()
    open(out, 'w', encoding='utf-8').write(html); print(f'built {out} ({len(html) // 1024} kB)')
