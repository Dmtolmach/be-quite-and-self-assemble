"""No button or menu text sticks out of its box, on a 320 px phone and on a desktop, in every language and mode."""
import asyncio, json
from playwright.async_api import async_playwright
from common import browser, page, report
CHECK = r"""() => {
  const out = [];
  const els = document.querySelectorAll('button, select, .btn, .seg button, .gpick button, .syspick button, .mbnav button, label.gmic');
  for (const el of els) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const ow = el.scrollWidth - el.clientWidth, oh = el.scrollHeight - el.clientHeight;
    // text wider than the box, or a child sticking out
    let child = false; for (const c of el.querySelectorAll('*')) { const cr = c.getBoundingClientRect(); if (cr.width && (cr.right > r.right + 1 || cr.left < r.left - 1)) { child = true; break; } }
    // single-word check: a word broken across lines is also a problem
    if (ow > 1 || oh > 1 || child) out.push({ id: el.id || '', text: (el.innerText || el.value || '').replace(/\s+/g, ' ').slice(0, 50), w: Math.round(r.width), ow, oh });
  }
  return out;
}"""
async def scan(pg, tag, res):
    for x in await pg.evaluate(CHECK): res.add(json.dumps({**x, 'where': tag}, ensure_ascii=False))
async def main():
    res = set()
    async with async_playwright() as p:
        b = await browser(p)
        for vp, mob, name in [((320, 640), True, 'phone320'), ((1280, 850), False, 'desktop')]:
            for lang in ['en', 'fi', 'sv', 'ru']:
                pg = await page(b, vp, mob); await pg.select_option('#lang', lang); await pg.wait_for_timeout(300)
                found = set(); await scan(pg, 'start', found)
                for m in ['game', 'explore', 'scan']:
                    await pg.evaluate(f"document.querySelector('[data-{'mbmode' if mob else 'appmode'}={m}]').click()"); await pg.wait_for_timeout(400)
                    await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
                    if m == 'game': await pg.click('[data-game=drug]'); await pg.wait_for_timeout(250)
                    if mob: await pg.evaluate("document.getElementById('mbOpt').click()"); await pg.wait_for_timeout(250)
                    await scan(pg, m, found)
                    if m == 'explore':
                        for s in ['mbpoly', 'crypt', 'lcst']:
                            await pg.evaluate(f"document.querySelector('[data-pick={s}]').click()"); await pg.wait_for_timeout(250)
                            if mob: await pg.evaluate("document.getElementById('mbOpt').click()"); await pg.wait_for_timeout(200)
                            await scan(pg, 'explore-' + s, found)
                    if mob: await pg.evaluate("document.getElementById('sheetBack').click()")
                await pg.evaluate("document.getElementById('helpBtn').click()"); await pg.wait_for_timeout(300); await scan(pg, 'welcome', found)
                await pg.keyboard.press('Escape')
                await pg.evaluate("document.getElementById('classBtn').click()"); await pg.wait_for_timeout(500); await scan(pg, 'class', found)
                await pg.evaluate("document.getElementById('clsExit').click()")
                res |= {name + ' ' + lang + ' ' + f for f in found}; await pg.close()
        await b.close()
    report('buttons: no text overflow (phone 320 px and desktop, 4 languages)', sorted(res))
asyncio.run(main())
