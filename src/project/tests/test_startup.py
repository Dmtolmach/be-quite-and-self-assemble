"""No script errors: first visit (welcome), every language, every mode, every Explore system, the help tour, class mode."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report
async def main():
    errs = []
    async with async_playwright() as p:
        b = await browser(p)
        pg = await page(b, intro=True, errors=errs); await pg.wait_for_timeout(1200)
        if not await pg.evaluate("!document.getElementById('tour').hidden"): errs.append('welcome card did not open on the first visit')
        await pg.click('#tFree'); await pg.close()
        for lang in ['en', 'fi', 'sv', 'ru']:
            pg = await page(b, errors=errs); await pg.select_option('#lang', lang); await pg.wait_for_timeout(200)
            for m in ['explore', 'scan', 'game']:
                await pg.click(f'[data-appmode={m}]'); await pg.wait_for_timeout(250)
                if m == 'explore':
                    for s in await pg.evaluate("[...document.querySelectorAll('[data-pick]')].filter(e=>e.offsetParent).map(e=>e.dataset.pick)"):
                        await pg.evaluate(f"document.querySelector('[data-pick={s}]').click()"); await pg.wait_for_timeout(250)
            await pg.click('#helpBtn'); await pg.click('#tTour')
            for k in range(8):
                if await pg.evaluate("document.getElementById('tour').hidden"): break
                await pg.click('#tNext'); await pg.wait_for_timeout(120)
            await pg.click('#classBtn'); await pg.wait_for_timeout(400); await pg.click('#clsExit'); await pg.wait_for_timeout(200)
            await pg.close()
        await b.close()
    report('startup: no script errors in any language, mode or system', sorted(set(errs)))
asyncio.run(main())
