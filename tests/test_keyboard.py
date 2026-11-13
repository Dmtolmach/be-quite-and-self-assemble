"""Keyboard play: holding Space heats like noise, letting go cools, the arrows step the temperature; works in a game and in Explore.
Also the projector options (larger text, high contrast) switch on and the box still fits on screen."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report
FR = "(()=>{const s=document.getElementById('tsliderM'); return (+s.value - +s.min)/(+s.max - +s.min)})()"
async def main():
    bad = []; errs = []
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b, errors=errs)
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        await pg.click('[data-game=ice]'); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(2800)
        await pg.mouse.click(5, 5)  # focus away from buttons, as a player would
        f0 = await pg.evaluate(FR); await pg.keyboard.down('Space'); await pg.wait_for_timeout(1500); f1 = await pg.evaluate(FR)
        await pg.keyboard.up('Space'); await pg.wait_for_timeout(2500); f2 = await pg.evaluate(FR)
        if not (f1 > 0.8): bad.append(f'game: holding Space for 1.5 s reached only {f1:.2f} of the range')
        if not (f2 < 0.2): bad.append(f'game: 2.5 s after letting go of Space still at {f2:.2f} of the range')
        await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); f3 = await pg.evaluate(FR)
        if not (f3 > f2 + 0.08): bad.append(f'game: two presses of → moved the temperature from {f2:.2f} to {f3:.2f}')
        if not await pg.evaluate("!!window.__game()"): bad.append('game: Space ended or restarted the game')
        await pg.click('#gquit'); await pg.wait_for_timeout(300)
        await pg.click('[data-appmode=explore]'); await pg.wait_for_timeout(300); await pg.mouse.click(5, 5)
        g0 = await pg.evaluate(FR); await pg.keyboard.down('Space'); await pg.wait_for_timeout(1200); await pg.keyboard.up('Space'); g1 = await pg.evaluate(FR)
        if not (g1 > g0 + 0.3): bad.append(f'explore: Space did not heat ({g0:.2f} → {g1:.2f})')
        # projector options
        await pg.evaluate("document.querySelector('details.teacher').open=true")
        for cb in ('optBig', 'optHi'):  # set like a click would, without aiming at a page that is changing size
            await pg.evaluate(f"(()=>{{const c=document.getElementById('{cb}'); c.checked=true; c.dispatchEvent(new Event('change'))}})()")
        await pg.wait_for_timeout(500)
        cls = await pg.evaluate("document.documentElement.className")
        if 'bigtext' not in cls or 'hicon' not in cls: bad.append('projector options did not switch on')
        await pg.evaluate("scrollTo(0,0)"); await pg.wait_for_timeout(300)
        mb, h = await pg.evaluate("[document.querySelector('.mbar').getBoundingClientRect().bottom, innerHeight]")
        if mb > h + 1: bad.append(f'larger text: temperature bar ends at {mb:.0f}, window {h}')
        before = await pg.evaluate("localStorage.getItem('mdlab-display')")
        await pg.reload(); await pg.wait_for_timeout(800)
        st = await pg.evaluate("[document.documentElement.className, localStorage.getItem('mdlab-display')]")
        if 'hicon' not in st[0]: bad.append(f'projector options not remembered after reload: {st}, before reload {before}')
        await b.close()
    report('keyboard play and projector options', bad + sorted(set(errs)))
asyncio.run(main())
