"""Shared helpers for the browser tests: which page to test, a browser, a page with the first-visit screens skipped."""
import os, sys, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.environ.get('MDLAB_PAGE') or os.path.join(ROOT, 'docs', 'amphiphile-assembly-lab.html')
URL = 'file://' + PAGE
SKIP_INTRO = ("localStorage.setItem('mdlab-tour','1');localStorage.setItem('mdlab-welcome','1');"
              "localStorage.setItem('mdlab-guided','1');localStorage.setItem('mdlab-unlock','1');localStorage.setItem('mdlab-ladall','1')")
def chrome():  # a system Chrome if there is one, otherwise Playwright's own Chromium
    for c in ('/usr/bin/google-chrome', shutil.which('google-chrome') or '', shutil.which('chromium') or ''):
        if c and os.path.exists(c): return c
    return None
async def browser(p, extra=()):
    exe = chrome(); args = ['--no-sandbox', *extra]
    return await (p.chromium.launch(executable_path=exe, args=args) if exe else p.chromium.launch(args=args))
async def page(b, vp=(1280, 900), mobile=False, intro=False, errors=None):
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page()
    if errors is not None: pg.on('pageerror', lambda e: errors.append(str(e)))
    if not intro: await pg.add_init_script(SKIP_INTRO)
    await pg.goto(URL); await pg.wait_for_timeout(1000); return pg
def report(name, problems):
    print(('PASS ' if not problems else 'FAIL ') + name + ('' if not problems else f': {len(problems)} problem(s)'))
    for x in problems[:40]: print('    ', x)
    if len(problems) > 40: print(f'     … and {len(problems) - 40} more')
    sys.exit(1 if problems else 0)
