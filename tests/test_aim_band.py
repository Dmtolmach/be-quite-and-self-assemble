"""The aim picture before a game (all four games), and the green band: shown while a game has fewer than 3 stars, gone once it has 3."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report
async def main():
    bad = []; errs = []
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b, errors=errs)
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        for g in ['ice', 'demix', 'gel', 'drug']:
            await pg.click(f'[data-game={g}]')
            for _ in range(40):
                await pg.wait_for_timeout(300); d = await pg.evaluate("window.__demo()")
                if d and d['shown']: break
            else: bad.append(f'{g}: no aim picture shown ({d})')
        await pg.click('[data-game=ice]'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(3000)
        if not await pg.evaluate("document.getElementById('szone').classList.contains('on')"): bad.append('green band not shown before 3 stars')
        await pg.click('#gquit'); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.setItem('mdlab-best2-ice','0.6')"); await pg.reload(); await pg.wait_for_timeout(1000)
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        await pg.click('[data-game=ice]'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(3000)
        if await pg.evaluate("document.getElementById('szone').classList.contains('on')"): bad.append('green band still shown after 3 stars')
        if not await pg.evaluate("document.getElementById('mmeter').offsetParent === null"): bad.append('noise bar still shown under the box')
        # game options that appear later: Race my best run after 2 finished games, Record a clip after 3
        pg = await page(b, intro=True, errors=errs) # no teacher unlock in this page
        for n, want in [(1, (False, False)), (2, (True, False)), (3, (True, True))]:
            await pg.evaluate(f"localStorage.setItem('mdlab-welcome','1'); localStorage.setItem('mdlab-tour','1'); localStorage.setItem('mdlab-guided','1'); localStorage.setItem('mdlab-played','{n}')"); await pg.reload(); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('[data-game=ice]').click()"); await pg.wait_for_timeout(300) # a new player is already in Game mode (the mode switch is not shown yet)
            got = tuple(await pg.evaluate("['gghostOn','gclipOn'].map(id => document.getElementById(id).closest('label').offsetParent !== null)"))
            if got != want: bad.append(f'after {n} games: ghost/clip options shown {got}, expected {want}')
        await b.close()
    report('aim pictures and the green band', bad + sorted(set(errs)))
asyncio.run(main())
