"""Privacy and offline use.
1. The page makes no network requests of its own: opened from disk, with the (fake) microphone on, in Explore and in a game,
   the only request is the page file itself (fonts are built in).
2. Served from a web server (as on GitHub Pages) it registers the offline cache and still opens when the network is gone."""
import asyncio, functools, http.server, os, threading
from playwright.async_api import async_playwright
from common import browser, page, report, ROOT, SKIP_INTRO, URL
async def main():
    bad = []
    async with async_playwright() as p:
        b = await browser(p, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, permissions=['microphone']); pg = await ctx.new_page()
        reqs = []; pg.on('request', lambda r: reqs.append(r.url))
        await pg.add_init_script(SKIP_INTRO); await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.click('[data-appmode=explore]'); await pg.click('#micM'); await pg.wait_for_timeout(2500)
        await pg.click('[data-appmode=game]'); await pg.click('[data-game=ice]'); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(4000)
        await pg.evaluate("document.querySelector('[data-privacy]').click()"); await pg.wait_for_timeout(200)
        if await pg.evaluate("document.getElementById('privModal').hidden"): bad.append('the Privacy button does not open the privacy note')
        other = sorted({u for u in reqs if not (u == URL or u.startswith('data:') or u.startswith('blob:'))})
        bad += [f'network request: {u[:100]}' for u in other]
        await ctx.close()
        # 2. served over http (localhost counts as secure): service worker, then offline reload
        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass
        handler = functools.partial(Quiet, directory=os.path.join(ROOT, 'docs'))
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
        url = f'http://localhost:{srv.server_address[1]}/'
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900}); pg = await ctx.new_page(); await pg.add_init_script(SKIP_INTRO)
        await pg.goto(url); await pg.wait_for_timeout(500)
        ok = await pg.evaluate("navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true) : false")
        if not ok: bad.append('offline cache (service worker) did not start')
        has_manifest = await pg.evaluate("!!document.querySelector('link[rel=manifest]')")
        if not has_manifest: bad.append('no web-app manifest link when served')
        await pg.wait_for_timeout(800); await ctx.set_offline(True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        try:
            await pg.reload(); await pg.wait_for_timeout(1500)
            if not await pg.evaluate("!!document.getElementById('sim') && typeof window.__eng === 'function'"): bad.append('offline reload: the app did not start')
        except Exception as e: bad.append(f'offline reload failed: {e}')
        bad += errs; await ctx.close(); srv.shutdown(); await b.close()
    report('privacy and offline: no network use from disk; served copy works offline', bad)
asyncio.run(main())
