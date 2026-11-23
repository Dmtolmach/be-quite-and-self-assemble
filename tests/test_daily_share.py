"""Daily Molecule, share window, clip and challenge links:
the daily button is there, a daily run uses the day's seed and saves the best and the streak, the end card has Share,
the share text carries a challenge link, the link opens the invitation and replays the same start (same seed, same drug windows),
and monetization is off in the normal build."""
import asyncio
from playwright.async_api import async_playwright
from common import browser, page, report, URL
async def main():
    bad = []; errs = []
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b, errors=errs)
        if await pg.evaluate("window.__monet().enabled"): bad.append('monetization adapter present in the normal build')
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        if await pg.evaluate("document.getElementById('gdaily').hidden"): bad.append('Daily Molecule button not shown')
        info = await pg.evaluate("window.__daily().info")
        await pg.click('#gdailyBtn'); await pg.wait_for_timeout(300)
        if await pg.evaluate("(window.__daily().special||{}).kind") != 'daily': bad.append('daily button did not select the daily run')
        await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(2600)
        seed = await pg.evaluate("window.__eng().p.seed")
        if seed != info['seed']: bad.append(f'daily run seed {seed} is not the day seed {info["seed"]}')
        if not await pg.evaluate("window.__daily().recording"): bad.append('no clip is being recorded during the run')
        g = info['gid']
        path = {'ice': "0.17-0.12*Math.min(1,t/25)", 'demix': "0.33", 'drug': "(G.win||[]).some(w=>E.time-G.t0>=w[0]-1&&E.time-G.t0<=w[1]-0.5)?2.0:0.5", 'gel': "t<10?2.6:1.0"}[g]
        while True:
            T = await pg.evaluate(f"(()=>{{const G=window.__game(); if(!G) return null; const E=window.__eng(); const t=(E.time-G.t0)/G.g.D*30; return {path}}})()")
            if T is None: break
            await pg.evaluate(f"(()=>{{const e=document.getElementById('tsliderM'); e.value={T}; e.dispatchEvent(new Event('input'))}})()"); await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(1500)
        if await pg.evaluate("!document.getElementById('macroBox').hidden"): await pg.evaluate("document.getElementById('macroGo').click()")
        await pg.wait_for_timeout(2500)
        if not await pg.evaluate("!!document.querySelector('#gend [data-act=share]')"): bad.append('no Share button on the end card')
        if not await pg.evaluate("!!document.querySelector('#gend .gendsp')"): bad.append('no daily line on the end card')
        d = await pg.evaluate("window.__daily()")
        if not d['rec'] or d['rec']['tries'] != 1: bad.append(f'daily result not saved: {d["rec"]}')
        if d['streak'] != 1: bad.append(f'streak is {d["streak"]}, expected 1')
        if not d['clip']: bad.append('no clip after the run')
        await pg.click('#gend [data-act=share]'); await pg.wait_for_timeout(400)
        if await pg.evaluate("document.getElementById('shareModal').hidden"): bad.append('share window did not open')
        txt = await pg.text_content('#shareText')
        if '?c=' not in txt: bad.append('share text has no challenge link')
        if await pg.evaluate("document.getElementById('shareClipBox').hidden"): bad.append('clip not offered in the share window')
        link = [w for w in txt.split() if '?c=' in w][0]; q = link[link.index('?'):]
        par = await pg.evaluate(f"window.__daily().parse({q!r})")
        if not par or par['seed'] != info['seed'] or par['gid'] != g: bad.append(f'challenge link does not carry the run: {par}')
        if await pg.evaluate("window.__daily().parse('?c=bm9wZQ')"): bad.append('a broken link was accepted')
        await pg.click('#shareClose')
        # a drug challenge link: the invitation opens, and the same seed gives the same drug windows twice
        q2 = await pg.evaluate("window.__daily().chalUrl({g:'drug', s:123457, v:40, d:0})")
        q2 = q2[q2.index('?'):]
        p2 = await page(b, errors=errs); await p2.goto(URL + q2); await p2.wait_for_timeout(1500)
        if await p2.evaluate("document.getElementById('chalModal').hidden"): bad.append('challenge invitation not shown')
        if '?c=' in await p2.evaluate("location.href"): bad.append('challenge parameter left in the address')
        await p2.evaluate("document.getElementById('guseMic').checked=false")
        await p2.click('#chalGo'); await p2.wait_for_timeout(3000)
        st = await p2.evaluate("(()=>{const G=window.__game(); return G ? [window.__eng().p.seed, JSON.stringify(G.win), G.special && G.special.kind] : null})()")
        if not st or st[0] != 123457 or st[2] != 'challenge': bad.append(f'challenge run did not use the link: {st}')
        await p2.click('#gquit'); await p2.wait_for_timeout(300)
        await p2.evaluate("document.getElementById('gstartBox').click()"); await p2.wait_for_timeout(3000)
        st2 = await p2.evaluate("(()=>{const G=window.__game(); return G ? [window.__eng().p.seed, JSON.stringify(G.win)] : null})()")
        if not st2 or st2[0] != 123457 or st2[1] != st[1]: bad.append('playing the challenge again gave another start or other drug windows')
        await p2.click('#gquit'); await p2.wait_for_timeout(300)
        await p2.click('[data-game=ice]'); await p2.wait_for_timeout(300)
        if await p2.evaluate("window.__daily().special"): bad.append('a normal game pick did not leave the challenge')
        await b.close()
    report('daily molecule, share, clip and challenge links', bad + sorted(set(errs)))
asyncio.run(main())
