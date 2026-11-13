#!/usr/bin/env python3
"""Build the page and run every check. Use before publishing.

    python3 run_tests.py          all checks (about 4 minutes)
    python3 run_tests.py --quick  build, syntax, physics, startup only (about 30 s)

Needs node, python3, `npm install` once in tests/ (axe-core, for the accessibility check) and Playwright for Python (pip install playwright; a system Chrome is used if present, else `playwright install chromium`)."""
import os, re, subprocess, sys, tempfile, time
ROOT = os.path.dirname(os.path.abspath(__file__)); T = lambda f: os.path.join(ROOT, 'tests', f)
def syntax():  # node --check on both scripts of the built page
    html = open(os.path.join(ROOT, 'docs', 'amphiphile-assembly-lab.html'), encoding='utf-8').read(); bad = []
    for i, js in enumerate(re.findall(r'<script>\n(.*?)</script>', html, re.S)):
        f = os.path.join(tempfile.gettempdir(), f'sugs-check{i}.js'); open(f, 'w', encoding='utf-8').write(js)
        r = subprocess.run(['node', '--check', f], capture_output=True, text=True); os.remove(f)
        if r.returncode: bad.append(r.stderr.strip().split('\n')[-1])
    print(('PASS' if not bad else 'FAIL') + ' syntax: both scripts parse'); [print('     ', b) for b in bad]; return not bad
STEPS = [('build', [sys.executable, os.path.join(ROOT, 'build.py')]), ('syntax', syntax), ('engine', ['node', T('test_engine.js')]),
         ('startup', [sys.executable, T('test_startup.py')]), ('i18n', [sys.executable, T('test_i18n.py')]),
         ('layout', [sys.executable, T('test_layout.py')]), ('buttons', [sys.executable, T('test_buttons.py')]), ('games', [sys.executable, T('test_games.py')]), ('offline', [sys.executable, T('test_offline_privacy.py')]),
         ('keyboard', [sys.executable, T('test_keyboard.py')]), ('a11y', [sys.executable, T('test_a11y.py')])]
quick = '--quick' in sys.argv; failed = []; t0 = time.time()
for name, cmd in STEPS:
    if quick and name in ('i18n', 'layout', 'buttons', 'games', 'offline', 'keyboard', 'a11y'): continue
    ok = cmd() if callable(cmd) else subprocess.run(cmd, cwd=ROOT).returncode == 0
    if not ok: failed.append(name)
    if name == 'build' and not ok: break
print(f'\n{"ALL PASSED" if not failed else "FAILED: " + ", ".join(failed)}  ({time.time() - t0:.0f} s)'); sys.exit(1 if failed else 0)
