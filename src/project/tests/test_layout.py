"""Everything needed stays on screen: on a computer the whole box and the temperature bar fit in the window
(Explore, Energy scan, a running game); on a phone the page is no wider than the screen and its end is not hidden by the bottom bar."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report
Q = "(()=>{const c=document.getElementById('sim').getBoundingClientRect(), m=document.querySelector('.mbar').getBoundingClientRect(); return [c.top, c.bottom, m.bottom, innerHeight]})()"
async def main():
    bad = []
    async with async_playwright() as p:
        b = await browser(p)
        for vp in [(1024, 768), (1280, 720), (1440, 900), (1920, 1080)]:
            pg = await page(b, vp)
            for m in ['explore', 'scan']:
                await pg.click(f'[data-appmode={m}]'); await pg.wait_for_timeout(400); await pg.evaluate("scrollTo(0,0)")
                t, cb, mb, h = await pg.evaluate(Q)
                if mb > h + 1: bad.append(f'{vp} {m}: temperature bar ends at {mb:.0f} px, window is {h} px')
            await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
            await pg.click('[data-game=ice]'); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(3500)
            t, cb, mb, h = await pg.evaluate(Q)
            if t < -1 or mb > h + 1: bad.append(f'{vp} game: box top {t:.0f}, temperature bar bottom {mb:.0f}, window {h}')
            await pg.close()
        for w in [320, 375]:
            pg = await page(b, (w, 700), True)
            for m in ['game', 'explore', 'scan']:
                await pg.evaluate(f"document.querySelector('[data-mbmode={m}]').click()"); await pg.wait_for_timeout(400)
                await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
                sw = await pg.evaluate("document.documentElement.scrollWidth")
                if sw > w + 1: bad.append(f'phone {w}: page is {sw} px wide in {m} (wider than the screen)')
                await pg.evaluate("document.getElementById('sheetBack') && document.getElementById('sheetBack').click()")
            await pg.evaluate("scrollTo(0, document.documentElement.scrollHeight)"); await pg.wait_for_timeout(300)
            last, nav = await pg.evaluate("[document.querySelector('.teachpanel').getBoundingClientRect().bottom, document.querySelector('.mbnav').getBoundingClientRect().top]")
            if last > nav + 1: bad.append(f'phone {w}: Teacher options end at {last:.0f}, below the bottom bar top {nav:.0f}')
            await pg.close()
        await b.close()
    report('layout: box + temperature bar on screen, phones fit', bad)
asyncio.run(main())
