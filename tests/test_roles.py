"""Player mode and teacher mode: the welcome choice, the header switch, ?teacher links, what each mode shows, and the lesson buttons."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report, URL
VIS = "(s)=>{const e=document.querySelector(s); return !!e && e.offsetParent !== null}"
async def main():
    bad = []; errs = []
    async with async_playwright() as p:
        b = await browser(p)
        pg = await page(b, intro=True, errors=errs); await pg.wait_for_timeout(1200)
        if not await pg.evaluate(f"({VIS})('#tTeach')"): bad.append("no 'I am a teacher' button on the welcome card")
        await pg.click('#tTeach'); await pg.wait_for_timeout(800)
        if not (await pg.evaluate("window.__role()"))['teacher']: bad.append('welcome button did not switch to teacher mode')
        for s, want in [('#lessonPanel', True), ('#classBtn', True), ('#gdaily', False), ('[data-l=ice]', True)]:
            if await pg.evaluate(f"({VIS})('{s}')") != want: bad.append(f'teacher mode: {s} visible should be {want}')
        n = await pg.evaluate("document.querySelectorAll('#lessons .lesson').length")
        if n != 5: bad.append(f'{n} lesson cards, expected 5')
        await pg.click('[data-l=demix] summary'); await pg.click('[data-l=demix] [data-lgo=explore]'); await pg.wait_for_timeout(800)
        if await pg.evaluate("document.querySelector('.wrap').dataset.sys") != 'demix': bad.append('lesson "Open in Explore" did not open the two liquids')
        await pg.click('[data-l=scan] summary'); await pg.click('[data-l=scan] [data-lgo=scan]'); await pg.wait_for_timeout(800)
        if not await pg.evaluate(f"({VIS})('#scanHeat')"): bad.append('lesson "Open the energy scan" did not show the scan')
        await pg.click('[data-l=ice] summary'); await pg.click('[data-l=ice] [data-lgo=class]'); await pg.wait_for_timeout(1500)
        if not await pg.evaluate("document.querySelector('.wrap').classList.contains('classmode')"): bad.append('lesson "Play in class mode" did not open class mode')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        await pg.click('#roleBtn'); await pg.wait_for_timeout(800)
        if (await pg.evaluate("window.__role()"))['teacher']: bad.append('header switch did not go back to player mode')
        await pg.evaluate("localStorage.setItem('mdlab-played','12')"); await pg.reload(); await pg.wait_for_timeout(1000)
        await pg.evaluate("document.querySelector('.modeseg [data-appmode=explore]').click()"); await pg.wait_for_timeout(800)
        for s, want in [('#lessonPanel', False), ('#classBtn', False), ('#modelPanel', False), ('#viewPanel', False), ('[data-appmode=scan]', False), ('.rosec', False), ('#compPanel', True)]:
            if await pg.evaluate(f"({VIS})('{s}')") != want: bad.append(f'player mode: {s} visible should be {want}')
        if await pg.evaluate("[...document.querySelectorAll('#compPanel .row[data-show]')].some(r => getComputedStyle(r).display !== 'none')"): bad.append('player mode: model parameters shown in Explore')
        if not await pg.evaluate("document.getElementById('tsetM').className.startsWith('tw')"): bad.append('player mode: temperature not shown as a word in Explore')
        p2 = await page(b, intro=True, errors=errs); await p2.goto(URL + '?teacher'); await p2.wait_for_timeout(1200)
        if not (await p2.evaluate("window.__role()"))['teacher']: bad.append('?teacher link did not open teacher mode')
        if await p2.evaluate(f"({VIS})('#tour')"): bad.append('?teacher link still showed the welcome card')
        await b.close()
    report('player mode and teacher mode', bad + sorted(set(errs)))
asyncio.run(main())
