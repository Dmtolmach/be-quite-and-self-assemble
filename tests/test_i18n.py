"""Every English text the page shows has a translation in every language (src/i18n/*.json).
Visits all modes, systems and games, then compares the texts seen (static and through T()) with the dictionaries."""
import asyncio, json, os, re
from playwright.async_api import async_playwright
from common import browser, page, report, ROOT
SKIP = re.compile(r'^(Shut Up and Get Structured|Dmitry Tolmachev|Google Scholar|[^A-Za-z]*|[A-G]♯?\d · \d+ Hz|(Cool|Heat) to [\d.]+|· kin|.*σ.*|English|Suomi|Svenska|Русский)$')  # brand, names, note names, numbers, units, language names
async def main():
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b)
        for m in ['explore', 'scan', 'game']:
            await pg.click(f'[data-appmode={m}]'); await pg.wait_for_timeout(200)
            if m == 'explore':
                for s in await pg.evaluate("[...document.querySelectorAll('[data-pick]')].filter(e=>e.offsetParent).map(e=>e.dataset.pick)"):
                    await pg.evaluate(f"document.querySelector('[data-pick={s}]').click()"); await pg.wait_for_timeout(200)
            if m == 'game':
                for gid in ['ice', 'demix', 'drug', 'gel']:
                    await pg.click(f'[data-game={gid}]'); await pg.wait_for_timeout(200)
        await pg.click('#helpBtn')
        for k in range(8):
            if await pg.evaluate("document.getElementById('tour').hidden"): break
            await pg.evaluate("document.getElementById('tTour').offsetParent ? document.getElementById('tTour').click() : document.getElementById('tNext').click()"); await pg.wait_for_timeout(100)
        keys = await pg.evaluate("window.__i18nKeys()"); await b.close()
    man = json.load(open(os.path.join(ROOT, 'src', 'manifest.json'))); miss = []
    for lang in man['languages']:
        d = json.load(open(os.path.join(ROOT, 'src', 'i18n', lang + '.json'), encoding='utf-8'))
        miss += [f'{lang}: {k[:90]}' for k in sorted(set(keys)) if k not in d and not SKIP.match(k.strip())]
    report(f'i18n: {len(set(keys))} texts seen, all translated', miss)
asyncio.run(main())
