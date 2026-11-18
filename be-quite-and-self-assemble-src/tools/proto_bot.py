"""Plays a prototype game in the browser like a decent player (0.4 s reaction, microphone-like smoothing) and reports the run.
python3 tools/proto_bot.py p-stream|p-line|p-waves [max_seconds] [shot_at_seconds]"""
import asyncio, math, sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests'))
from playwright.async_api import async_playwright
from common import browser, page
gid = sys.argv[1]; maxs = float(sys.argv[2]) if len(sys.argv) > 2 else 120; shot = float(sys.argv[3]) if len(sys.argv) > 3 else -1
DECIDE = {
 'p-stream': """(()=>{const E=window.__eng(),hb=E.p.hotBand; for(let i=0;i<E.N;i++) if(E.type[i]===4){let b=E.x[i]-hb.x0+2; b-=E.L*Math.floor(b/E.L); if(b<hb.w+2) return 2.9;} return 0.4})()""",
 'p-line': """(()=>{const G=window.__game(); return G && G.band ? (G.band[0]+G.band[1])/2 : 0.15})()""",
 'p-waves': """0.34""",
}
async def main():
    async with async_playwright() as p:
        b = await browser(p); pg = await page(b, (1280, 900)); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.evaluate("localStorage.setItem('mdlab-proto','1')"); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.click('[data-appmode=game]'); await pg.evaluate("document.getElementById('guseMic').checked=false")
        await pg.click(f'[data-proto={gid}]'); await pg.wait_for_timeout(400); await pg.evaluate("document.getElementById('gstartBox').click()"); await pg.wait_for_timeout(2700)
        q = []; T = None; t0 = time.time(); shotDone = False
        while True:
            st = await pg.evaluate("(()=>{const G=window.__game(); if(!G) return null; return [G.score, G.lives, G.lvl, +document.getElementById('tsliderM').min, +document.getElementById('tsliderM').max]})()")
            if st is None: break
            want = await pg.evaluate(DECIDE[gid]); q.append(want); d = q[-5] if len(q) >= 5 else st[3]
            T = st[3] if T is None else T + (1 - math.exp(-0.1 / (0.3 if d > T else 0.6))) * (d - T)
            await pg.evaluate(f"(()=>{{const e=document.getElementById('tsliderM'); e.value={T:.4f}; e.dispatchEvent(new Event('input'))}})()")
            if shot > 0 and not shotDone and time.time() - t0 > shot: shotDone = True; await pg.locator('.cellbox').screenshot(path=f'/home/claude/sim/proto_{gid}.png')
            if time.time() - t0 > maxs: print('stopped at time limit', st); break
            await pg.wait_for_timeout(100)
        await pg.wait_for_timeout(1500)
        res = await pg.evaluate("document.getElementById('gres').textContent"); note = await pg.evaluate("(document.querySelector('#gend .gendnote')||{}).textContent")
        print(gid, f'{time.time() - t0:.0f}s wall', '|', res, '|', note, errs[:3])
        await pg.locator('.cellbox').screenshot(path=f'/home/claude/sim/proto_{gid}_end.png'); await b.close()
asyncio.run(main())
