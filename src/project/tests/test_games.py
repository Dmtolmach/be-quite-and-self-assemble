"""Games still play: each game and its first challenge starts, runs and can be given up without errors;
one full ice game played along the green path ends with at least one star and the end card."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report
async def main():
    bad = []; errs = []
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b, errors=errs)
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        for sel in ['[data-game=ice]', '[data-game=demix]', '[data-game=drug]', '[data-game=gel]', '[data-lad="drug:1"]', '[data-lad="demix:3"]']:
            await pg.click(sel); await pg.wait_for_timeout(300); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(3000)
            if not await pg.evaluate("!!window.__game()"): bad.append(f'{sel}: the game did not start')
            if sel == '[data-lad="drug:1"]' and await pg.evaluate("!!window.__game().win"): bad.append('drug challenge has time windows again')
            await pg.click('#gquit'); await pg.wait_for_timeout(300)
        # a whole ice game, cooling slowly along the path
        await pg.click('[data-game=ice]'); await pg.wait_for_timeout(300); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(2600)
        while True:
            T = await pg.evaluate("(()=>{const G=window.__game(); if(!G) return null; const E=window.__eng(); const t=(E.time-G.t0)/G.g.D*30; return 0.17-0.12*Math.min(1,t/25)})()")
            if T is None: break
            await pg.evaluate(f"(()=>{{const e=document.getElementById('tsliderM'); e.value={T}; e.dispatchEvent(new Event('input'))}})()"); await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(2500)
        st = await pg.evaluate("document.querySelectorAll('#gend .gs.on').length"); shown = await pg.evaluate("!document.getElementById('gend').hidden")
        if not shown: bad.append('end card not shown after a full game')
        if st < 1: bad.append(f'slow cooling along the path gave {st} stars (expected at least 1)')
        print(f'     full ice game: {st} star(s), result line: {(await pg.text_content("#gres")).strip()}')
        await b.close()
    report('games: all start and stop, a full game scores and shows the end card', bad + sorted(set(errs)))
asyncio.run(main())
