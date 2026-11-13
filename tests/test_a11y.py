"""Screen-reader and keyboard check of the menus with axe-core (WCAG 2.1 A/AA rules): names of buttons and controls, labels,
dialogs, contrast in high-contrast mode. Needs `npm install` in tests/ once (axe-core)."""
import asyncio, os, json
from playwright.async_api import async_playwright
from common import browser, page, report
AXE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'node_modules', 'axe-core', 'axe.min.js')
RUN = """async (hi) => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: { 'color-contrast': { enabled: hi } } });
  return r.violations.map(v => ({ id: v.id, help: v.help, n: v.nodes.length, where: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); }"""
async def main():
    if not os.path.exists(AXE): print('SKIP accessibility: run `npm install` in tests/ first'); return
    bad = []
    async with async_playwright() as p:
        b = await browser(p)
        for vp, mob, tag in [((1280, 900), False, 'desktop'), ((375, 740), True, 'phone')]:
            pg = await page(b, vp, mob); await pg.add_script_tag(path=AXE)
            for m in ['game', 'explore', 'scan']:
                await pg.evaluate(f"document.querySelector('[data-{'mbmode' if mob else 'appmode'}={m}]').click()"); await pg.wait_for_timeout(400)
                await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
                for v in await pg.evaluate(RUN, False): bad.append(f"{tag} {m}: {v['id']} ({v['n']}×) {v['help']} — {', '.join(v['where'])}")
            if not mob:
                await pg.evaluate("document.getElementById('helpBtn').click()"); await pg.wait_for_timeout(300)
                for v in await pg.evaluate(RUN, False): bad.append(f"welcome: {v['id']} ({v['n']}×) {v['help']} — {', '.join(v['where'])}")
                await pg.keyboard.press('Escape')
                await pg.evaluate("document.getElementById('optHi').checked=true; document.getElementById('optHi').dispatchEvent(new Event('change'))"); await pg.wait_for_timeout(300)
                for v in await pg.evaluate(RUN, True):
                    if v['id'] == 'color-contrast': bad.append(f"high contrast: {v['n']} text(s) below 4.5:1 — {', '.join(v['where'])}")
            await pg.close()
        await b.close()
    report('accessibility (axe-core, WCAG 2.1 AA): menus and controls', sorted(set(bad)))
asyncio.run(main())
