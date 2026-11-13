  // ---------- fact cards: one fact per card, won with three stars (games) or a minute with a system (Explore), kept in an album ----------
  const FC = (() => {
    // ---------- sketch helpers (viewBox 240 x 140) ----------
    const P = (d, c = '') => `<path class="ln ${c}" d="${d}"/>`;
    const C = (x, y, r, f, ln = '') => `<circle cx="${x}" cy="${y}" r="${r}" class="${f}${ln ? ' ln ' + ln : ''}"/>`;
    const R = (x, y, w, h, rx, f, ln = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${f}${ln ? ' ln ' + ln : ''}"/>`;
    const TX = (x, y, s, c = '', anchor = 'middle') => `<text x="${x}" y="${y}" class="tx ${c}" text-anchor="${anchor}">${/[a-z]{3}/.test(s) ? T(s) : s}</text>`;
    const rad = (a) => a * Math.PI / 180;
    const pt = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))].map((v) => +v.toFixed(1));
    function flake(cx, cy, R0, c = 'co') { let d = '';
      for (let k = 0; k < 6; k++) { const a = k * 60 - 90, [x, y] = pt(cx, cy, R0, a); d += `M${cx} ${cy}L${x} ${y}`;
        for (const f of [0.45, 0.72]) { const [bx, by] = pt(cx, cy, R0 * f, a), L = R0 * 0.28 * (f > 0.6 ? 0.8 : 1);
          for (const s of [-45, 45]) { const [ex, ey] = pt(bx, by, L, a + s); d += `M${bx} ${by}L${ex} ${ey}`; } } }
      return P(d, c); }
    function thermo(x, y, h, frac, hot, label) { // tube with bulb at the bottom
      const fill = hot ? 'f-hot' : 'f-cold', lv = y + h - (h - 6) * frac;
      return R(x - 5, y, 10, h, 5, 'f-panel', '') + `<rect x="${x - 2.5}" y="${lv}" width="5" height="${y + h - lv}" class="${fill}"/>` + C(x, y + h + 5, 8, fill) +
        `<rect x="${x - 5}" y="${y}" width="10" height="${h}" rx="5" class="ln f-none"/>` + C(x, y + h + 5, 8, 'f-none', 'ln') + (label ? TX(x + 12, y + 10, label, 'b', 'start') : ''); }
    function amph(x, y, a, len = 12, hr = 3.2) { const [tx, ty] = pt(x, y, len, a); return P(`M${x} ${y}L${tx} ${ty}`, 'ta') + C(x, y, hr, 'f-head'); }
    function micelle(cx, cy, r, n, core = '') { let s = core ? C(cx, cy, r - 6, core) : '';
      for (let k = 0; k < n; k++) { const a = k * 360 / n, [x, y] = pt(cx, cy, r, a); s += amph(x, y, a + 180, r - 5 > 13 ? 13 : r - 5, 3); } return s; }
    function vesicle(cx, cy, r, n) { let s = C(cx, cy, r - 13, 'f-w');
      for (let k = 0; k < n; k++) { const a = k * 360 / n, [x, y] = pt(cx, cy, r, a), [x2, y2] = pt(cx, cy, r - 13, a); s += amph(x, y, a + 180, 5.5, 2.6) + amph(x2, y2, a, 5.5, 2.6); } return s; }
    const star = (x, y, r = 5, c = 'f-cr') => { let d = ''; for (let k = 0; k < 10; k++) { const [px, py] = pt(x, y, k % 2 ? r * 0.45 : r, k * 36 - 90); d += (k ? 'L' : 'M') + px + ' ' + py; } return `<path d="${d}Z" class="${c}"/>`; };
    const arrow = (x1, y1, x2, y2, c = 'mu') => { const a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, [ax, ay] = pt(x2, y2, 7, a + 150), [bx, by] = pt(x2, y2, 7, a - 150);
      return P(`M${x1} ${y1}L${x2} ${y2}M${ax} ${ay}L${x2} ${y2}L${bx} ${by}`, c); };
    const heat = (x, y, n = 3, c = 'ho') => { let d = ''; for (let k = 0; k < n; k++) { const X = x + k * 10; d += `M${X} ${y}c-4 -5 4 -8 0 -13c-4 -5 4 -8 0 -13`; } return P(d, c); };
    const blob = (cx, cy, r, f, seed = 1, ln = '') => { let d = ''; const n = 9;
      for (let k = 0; k <= n; k++) { const a = k * 360 / n, rr = r * (1 + 0.13 * Math.sin(seed * 7 + k * 2.3)), [x, y] = pt(cx, cy, rr, a); d += (k ? 'L' : 'M') + x + ' ' + y; }
      return `<path d="${d}Z" class="${f}${ln ? ' ln ' + ln : ''}" style="stroke-linejoin:round"/>`; };
    const chain = (pts, c = 'po', beads = true, bc = 'f-po') => P('M' + pts.map((p) => p.join(' ')).join('L'), c) + (beads ? pts.map(([x, y]) => C(x, y, 3, bc)).join('') : '');
    const coil = (cx, cy, r, n, seed) => { const p = []; for (let k = 0; k < n; k++) { const a = k * 137.5 + seed * 40, rr = r * Math.sqrt((k + 1) / n); p.push(pt(cx, cy, rr, a)); } return p; };
    const svg = (inner, label) => `<svg class="fcsk" viewBox="0 0 240 140" role="img" aria-label="${label}">${inner}</svg>`;
    const hexIce = (x0, y0, cols, rows, s, keep = () => true) => { let d = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (!keep(c, r)) continue; const cx = x0 + c * s * 1.5, cy = y0 + r * s * 1.732 + (c % 2 ? s * 0.866 : 0); let h = '';
        for (let k = 0; k <= 6; k++) { const [x, y] = pt(cx, cy, s, k * 60); h += (k ? 'L' : 'M') + x + ' ' + y; } d += h; } return P(d, 'co th'); };
    const dots = (n, x0, y0, w, h, f, r = 3, seed = 3) => { let s = ''; for (let k = 0; k < n; k++) { const x = x0 + ((k * 73.13 + seed * 17) % w), y = y0 + ((k * 41.7 + seed * 29) % h); s += C(+x.toFixed(1), +y.toFixed(1), r, f); } return s; };

    // ---------- the cards ----------
    const DECKS = [
     { id: 'ice', cls: 'd-ice', name: 'Ice', game: 'ice', cards: [
      { t: 'Six arms', d: 'Almost every snowflake has six arms. The six-fold shape comes from the honeycomb that water molecules build in ice.',
        s: () => flake(78, 70, 50) + hexIce(160, 34, 4, 3, 13) + arrow(132, 70, 148, 70) },
      { t: 'Ice floats', d: 'Ice is lighter than liquid water, so it floats. Lakes freeze from the top down, and fish spend the winter in the water below.',
        s: () => R(20, 40, 200, 86, 4, 'f-w') + R(20, 30, 200, 16, 2, 'f-ice', 'co') + P('M20 46H220', 'co') +
          P('M110 92c14 -12 34 -12 46 0c-12 12 -32 12 -46 0zM110 92l-12 -8v16z', '') + C(146, 89, 1.8, 'f-ink') + P('M40 120q20 -8 40 0q20 8 40 0', 'mu th') + TX(200, 24, '0 °C', 'mu') + TX(196, 118, '4 °C', 'mu') },
      { t: 'Liquid below zero', d: 'Very pure water can stay liquid far below 0 °C. Droplets in clouds can stay liquid down to about −40 °C before they freeze.',
        s: () => P('M48 76c-16 0 -22 -22 -6 -28c2 -16 26 -22 36 -8c10 -12 34 -8 36 10c16 2 16 26 0 26z', '') + [[60,94],[78,104],[96,92],[70,116],[90,120]].map(([x,y]) => P(`M${x} ${y-7}q6 8 0 11q-6 -3 0 -11z`, 'co')).join('') +
          thermo(176, 26, 74, 0.1, false, '−40 °C') },
      { t: 'Frost needs a start', d: 'Frost on a window begins at scratches and specks of dust. Freezing needs a starting point, a nucleus, and the crystals grow out from it.',
        s: () => R(30, 14, 180, 112, 6, 'f-w', '') + P('M120 14V126M30 70H210', 'mu th') + P('M60 100l40 -50', 'mu') +
          [[70,88,0],[86,68,1]].map(([x,y]) => [0,60,120,180,240,300].map((a) => { const [ex,ey] = pt(x,y,16,a), [mx,my] = pt(x,y,9,a), [l1x,l1y] = pt(mx,my,6,a+40), [l2x,l2y] = pt(mx,my,6,a-40); return P(`M${x} ${y}L${ex} ${ey}M${mx} ${my}L${l1x} ${l1y}M${mx} ${my}L${l2x} ${l2y}`, 'co th'); }).join('')).join('') +
          TX(120, 137, 'frost grows from a scratch', 'mu') },
      { t: 'Salt on the road', d: 'Salt melts ice on roads even below 0 °C. The dissolved salt gets in the way of water molecules locking into ice.',
        s: () => R(0, 92, 240, 48, 0, 'f-soft') + P('M0 92H240', 'mu') + P('M20 116H50M90 116H120M160 116H190', 'cr') +
          R(20, 74, 70, 18, 6, 'f-ice', 'co') + `<ellipse cx="150" cy="90" rx="38" ry="6" class="f-w"/>` + P('M112 90q38 -10 76 0', 'co th') + [[124,70],[140,62],[158,72],[172,60],[150,50]].map(([x,y]) => R(x, y, 6, 6, 1, 'f-panel', 'th')).join('') +
          thermo(212, 16, 46, 0.35, false, '') + TX(212, 90, '−5 °C', 'b') + arrow(94, 82, 108, 82) },
      { t: 'Slow ice, big crystals', d: 'Slow freezing grows a few large crystals, as in clear ice cubes. Ice cream is churned while it freezes fast, so its crystals stay small and feel smooth.',
        s: () => R(26, 40, 70, 70, 8, 'f-ice', 'co') + P('M44 52l12 10M70 86l10 8', 'panel') + P('M40 60L60 54M72 92L84 86', 'co th') + TX(61, 128, 'slow: clear', 'mu') +
          P('M156 70l22 52l22 -52z', 'tail') + C(178, 58, 24, 'f-panel', '') + dots(26, 158, 40, 40, 34, 'f-ice', 3.2, 5) + C(178, 58, 24, 'f-none', 'ln') + TX(178, 134, 'fast: smooth', 'mu') },
     ]},
     { id: 'liq', cls: 'd-liq', name: 'Two liquids', game: 'demix', cards: [
      { t: 'Mayonnaise', d: 'Mayonnaise is oil and water that stay mixed. Molecules from egg yolk coat the oil droplets and stop them from joining.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + [[60,50,22],[130,86,28],[190,42,18],[80,108,14]].map(([x,y,r]) => C(x, y, r, 'f-oil') + Array.from({ length: Math.round(r / 2.2) }, (_, k) => { const a = k * 360 / Math.round(r / 2.2), [px, py] = pt(x, y, r + 1, a); return amph(px, py, a + 180, 6, 2.6); }).join('')).join('') },
      { t: 'Rooms without walls', d: 'Inside living cells, some proteins separate from the surrounding liquid into droplets. These droplets work as tiny rooms without walls.',
        s: () => `<ellipse cx="120" cy="62" rx="96" ry="52" class="f-w ln hd"/>` + C(120, 62, 18, 'f-soft', 'mu') + [[62,48,12],[160,92,10],[178,46,14],[86,88,8],[132,30,6]].map(([x,y,r]) => C(x, y, r, 'f-c')).join('') + TX(120, 134, 'droplets with no membrane', 'mu') },
      { t: 'Salad dressing', d: 'Shake an oil-and-vinegar dressing and it mixes, but only for a while. The droplets merge and the two liquids separate again.',
        s: () => { const bottle = (x, inner) => P(`M${x} 30h24v12q12 8 12 22v56q0 8 -8 8h-32q-8 0 -8 -8v-56q0 -14 12 -22z`, '') + inner;
          return bottle(40, `<rect x="31" y="66" width="42" height="56" class="f-w"/>` + dots(16, 34, 68, 36, 52, 'f-oil', 4, 2)) + arrow(96, 90, 144, 90) + TX(120, 80, 'minutes', 'mu') +
            bottle(166, `<rect x="157" y="66" width="42" height="22" class="f-oil"/><rect x="157" y="88" width="42" height="34" class="f-w"/>`) + P('M166 30h24v12q12 8 12 22v56q0 8 -8 8h-32q-8 0 -8 -8v-56q0 -14 12 -22z', ''); } },
      { t: 'Cloudy ouzo', d: 'Ouzo turns cloudy when water is added. Its anise oil can no longer stay dissolved and comes out as countless tiny droplets.',
        s: () => { const glass = (x) => P(`M${x} 40l6 80h36l6 -80`, ''); return `<path d="M50 60l4.5 60h36l4.5 -60z" class="f-panel"/>` + glass(46) + P('M50 60h40', 'mu th') +
          P('M120 34q8 10 0 14q-8 -4 0 -14z', 'co') + arrow(104, 84, 136, 84) + `<path d="M154 60l4.5 60h36l4.5 -60z" class="f-soft"/>` + dots(40, 158, 62, 38, 56, 'f-oil', 2.2, 9) + glass(150) + P('M154 60h40', 'mu th'); } },
      { t: 'Mixes only when warm', d: 'Water and phenol mix into one liquid only above about 66 °C. Cool them and they split into two layers again.',
        s: () => { const bk = (x) => P(`M${x} 40v76q0 6 6 6h48q6 0 6 -6v-76`, ''); return `<rect x="30" y="56" width="60" height="30" class="f-s" opacity=".55"/><rect x="30" y="86" width="60" height="36" class="f-c" opacity=".55"/>` + bk(30) + TX(60, 34, '20 °C', 'b') +
          `<rect x="150" y="56" width="60" height="66" class="f-po" opacity=".35"/>` + bk(150) + TX(180, 34, '70 °C', 'b') + arrow(98, 90, 142, 90, 'ho') + heat(110, 128, 3); } },
      { t: 'Glass full of pores', d: 'Some glasses split into two intertwined phases while they cool. Dissolve one phase away and you get a glass full of tiny pores.',
        s: () => { let px = ''; for (let x = 34; x < 206; x += 5) for (let y = 24; y < 116; y += 5) { const v = Math.sin(x / 9) + Math.sin(y / 8 + 1) + Math.sin((x + y) / 13) + 0.6 * Math.sin((x - 2 * y) / 7);
            if (v > 0.2) px += `<rect x="${x}" y="${y}" width="5.2" height="5.2" class="f-c" opacity=".75"/>`; }
          return R(30, 20, 180, 100, 10, 'f-soft', '') + px + R(30, 20, 180, 100, 10, 'f-none', 'ln') + TX(120, 136, 'two phases, then pores', 'mu'); } },
     ]},
     { id: 'soap', cls: 'd-soap', name: 'Soap molecules', game: 'drug', cards: [
      { t: 'The first nano-medicine', d: 'Doxil, approved in 1995, was the first nanoparticle cancer medicine. It carries the drug inside tiny bubbles made of lipids, the molecules of cell membranes.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + vesicle(120, 70, 54, 30) + star(110, 62, 7) + star(132, 76, 7) + star(118, 86, 6) },
      { t: 'Release on heat', d: 'Heat-triggered carriers are being tested in medicine. Some release their drug when a tumour is warmed to about 40–42 °C.',
        s: () => blob(110, 82, 40, 'f-soft', 5, 'ho') + vesicle(70, 40, 22, 14) + star(70, 40, 4) + vesicle(124, 70, 22, 14) +
          star(150, 50, 5) + star(160, 68, 4) + star(144, 34, 4) + heat(190, 108, 3) + thermo(210, 20, 50, 0.7, true, '') + TX(212, 134, '41 °C', 'b') },
      { t: 'How soap cleans', d: 'Soap molecules gather into micelles. Grease hides in their oily cores and is rinsed away with the water.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + micelle(80, 70, 40, 22, 'f-oil') + micelle(176, 52, 24, 13) + micelle(178, 108, 18, 10) + TX(80, 74, 'grease', 'b') },
      { t: 'Bile digests fat', d: 'Bile from your liver is full of soap-like molecules. They break the fat in your food into tiny droplets, so it can be digested.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + C(56, 70, 38, 'f-oil') + arrow(104, 70, 136, 70) +
          [[166,40,13],[198,56,11],[168,82,12],[204,96,10],[176,114,9]].map(([x,y,r]) => C(x, y, r, 'f-oil') + Array.from({ length: 7 }, (_, k) => { const a = k * 360 / 7, [px, py] = pt(x, y, r + 1, a); return amph(px, py, a + 180, 4.5, 2.2); }).join('')).join('') },
      { t: 'Every cell’s skin', d: 'Every cell is wrapped in a double layer of soap-like lipids. Bacteria and fish change their lipids with the seasons, so the layer stays just soft enough.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + Array.from({ length: 15 }, (_, k) => { const x = 16 + k * 15; return amph(x, 46, 90, 18, 4.2) + amph(x, 94, -90, 18, 4.2); }).join('') + TX(120, 74, 'oily middle', 'mu') + TX(120, 24, 'water outside', 'mu') + TX(120, 128, 'water inside', 'mu') },
      { t: 'Milk', d: 'Milk is tiny droplets of fat in water. Each one is wrapped in a thin skin of soap-like molecules that stops the droplets from merging.',
        s: () => P('M30 30h40l-4 90h-32z', '') + `<path d="M33 50h34l-3 69h-28z" class="f-panel"/>` + P('M30 30h40l-4 90h-32z', '') + C(120, 70, 2, 'f-ink') + P('M70 62L118 30M70 96L118 112', 'mu th') +
          C(170, 70, 50, 'f-w', 'mu') + [[150,50,12],[186,58,14],[164,92,11],[196,96,8],[142,80,7]].map(([x,y,r]) => C(x, y, r, 'f-oil') + Array.from({ length: Math.round(r / 2) }, (_, k) => { const a = k * 360 / Math.round(r / 2), [px, py] = pt(x, y, r + 1, a); return amph(px, py, a + 180, 4, 2); }).join('')).join('') },
     ]},
     { id: 'prot', cls: 'd-prot', name: 'Proteins', game: 'gel', cards: [
      { t: 'Boiled egg', d: 'Boiling turns clear egg white solid. Heat unfolds its proteins, and they stick together into a gel.',
        s: () => blob(64, 72, 38, 'f-w', 2, 'mu') + C(64, 74, 15, 'f-cr') + TX(64, 132, 'raw', 'mu') + TX(180, 136, 'boiled', 'mu') + arrow(110, 72, 132, 72) + heat(112, 104, 2) +
          P('M180 32c26 0 34 40 34 54c0 22 -16 34 -34 34s-34 -12 -34 -34c0 -14 8 -54 34 -54z', '') + `<path d="M180 33c25 0 33 40 33 53c0 22 -15 33 -33 33s-33 -11 -33 -33c0 -13 8 -53 33 -53z" class="f-panel"/>` + C(180, 86, 15, 'f-cr') + P('M180 32c26 0 34 40 34 54c0 22 -16 34 -34 34s-34 -12 -34 -34c0 -14 8 -54 34 -54z', '') },
      { t: 'Jelly melts in your mouth', d: 'Gelatin jelly melts at about 30–35 °C, a little below body temperature. That is why it melts in your mouth.',
        s: () => P('M40 100q60 20 120 0', 'mu') + P('M60 96l8 -50h48l8 50z', 'c') + `<path d="M60 96l8 -50h48l8 50z" class="f-c" opacity=".55"/>` + P('M76 58l-2 26M104 58l2 22', 'panel th') +
          thermo(196, 22, 70, 0.62, true, '') + TX(204, 128, '35 °C', 'b') },
      { t: 'Tofu', d: 'Tofu is a protein gel. Soy milk is heated, then salts such as magnesium chloride make the soy proteins clump together.',
        s: () => P('M24 60h70v50q0 10 -10 10h-50q-10 0 -10 -10z', '') + `<rect x="27" y="66" width="64" height="50" class="f-soft"/>` + P('M24 60h70v50q0 10 -10 10h-50q-10 0 -10 -10z', '') + heat(44, 138, 3) +
          [[110,40],[118,30],[126,44]].map(([x,y]) => R(x, y, 6, 6, 1, 'f-panel', 'th')).join('') + arrow(120, 76, 146, 76) +
          R(156, 52, 64, 52, 6, 'f-panel', '') + P('M156 70h64M178 52v52M200 52v52', 'mu th') },
      { t: 'Skin on hot milk', d: 'Heat unfolds proteins and their sticky parts join up. That is why fried meat turns firm and a skin forms on hot milk.',
        s: () => P('M66 50h108l-10 70h-88z', '') + `<path d="M68 52h104l-9 66h-86z" class="f-panel"/>` + P('M68 54q10 -6 20 0t20 0t20 0t20 0t20 0', 'cr') + P('M66 50h108l-10 70h-88z', '') + P('M174 66q20 4 14 26q-4 10 -18 8', '') +
          heat(98, 38, 4, 'mu') },
      { t: 'Clumps that make us ill', d: 'When proteins unfold and clump in the brain, they can cause diseases such as Alzheimer’s. Helper proteins called chaperones cover the sticky parts until the protein folds again.',
        s: () => chain(coil(64, 70, 26, 14, 1)) + chain(coil(84, 86, 20, 10, 2), 'tail', true, 'f-tail') + chain(coil(56, 98, 16, 8, 3), 'tail', true, 'f-tail') +
          R(146, 40, 68, 62, 18, 'f-soft', 'hd') + P('M146 46l-8 -14M214 46l8 -14', 'hd') + chain(coil(180, 72, 16, 10, 4)) + TX(180, 124, 'chaperone', 'mu') + TX(70, 130, 'clump', 'mu') },
      { t: 'Ricotta', d: 'Ricotta is made by heating whey, the liquid left over from cheese, with a little acid. Its proteins unfold and clump into soft curds.',
        s: () => P('M40 50h160v56q0 14 -14 14h-132q-14 0 -14 -14z', '') + `<rect x="43" y="64" width="154" height="52" class="f-w"/>` + [[70,70],[96,66],[128,72],[160,68],[180,74],[84,82],[146,84]].map(([x,y], k) => blob(x, y, 9, 'f-panel', k, 'mu')).join('') +
          P('M40 50h160v56q0 14 -14 14h-132q-14 0 -14 -14z', '') + heat(100, 138, 4) },
     ]},
     { id: 'exp', cls: 'd-exp', name: 'Explore', cards: [
      { t: 'Why milk bottles look milky', sys: 'polymer', d: 'A polyethylene milk bottle looks milky because light scatters off tiny crystals in the plastic. Heat it and it turns clear and soft as they melt.',
        s: () => P('M50 26h24v14q18 10 18 30v46q0 8 -8 8h-44q-8 0 -8 -8v-46q0 -20 18 -30z', '') + `<path d="M35 72h54v42q0 6 -6 6h-42q-6 0 -6 -6z" class="f-soft"/>` +
          [[46,82],[70,92],[54,104],[78,110],[62,80]].map(([x,y]) => P(`M${x} ${y}h10M${x} ${y+3}h10M${x} ${y+6}h10`, 'cr th')).join('') + P('M50 26h24v14q18 10 18 30v46q0 8 -8 8h-44q-8 0 -8 -8v-46q0 -20 18 -30z', '') +
          P('M110 76l20 -12M110 86l24 0M110 96l20 12', 'cr') + arrow(140, 86, 162, 86, 'ho') + P('M184 26h24v14q18 10 18 30v46q0 8 -8 8h-44q-8 0 -8 -8v-46q0 -20 18 -30z', 'mu') + TX(196, 138, 'heated: clear', 'mu') },
      { t: 'Candle wax', sys: 'polymer', d: 'Candle wax is made of short chains that crystallize like plastic: clear and liquid when hot, cloudy and solid when cool.',
        s: () => R(52, 52, 56, 74, 4, 'f-soft', '') + `<path d="M54 54h52v8q-26 6 -52 0z" class="f-w"/>` + P('M80 52v-12', '') + P('M80 40c-10 -10 0 -22 0 -30c8 10 10 20 0 30z', 'ho') + `<path d="M80 40c-10 -10 0 -22 0 -30c8 10 10 20 0 30z" class="f-cr" opacity=".6"/>` +
          TX(136, 62, 'liquid, clear', 'mu', 'start') + TX(136, 100, 'solid, cloudy', 'mu', 'start') + P('M112 58h20M112 96h20', 'mu th') },
      { t: 'Swelling gloves', sys: 'lcst', d: 'Rubber gloves swell in some solvents, because a good solvent pulls the polymer chains apart. In a poor solvent, the chains curl up into balls.',
        s: () => chain(coil(70, 70, 36, 18, 2)) + P('M70 70m-46 0a46 46 0 1 0 92 0a46 46 0 1 0 -92 0', 'mu th') + TX(70, 134, 'good solvent', 'mu') +
          chain(coil(180, 74, 14, 14, 5)) + TX(180, 134, 'poor solvent', 'mu') },
      { t: 'Smart gel', sys: 'lcst', d: 'PNIPAM, a polymer used in smart gels, dissolves in water below 32 °C and collapses above it. Most polymers do the opposite.',
        s: () => R(0, 0, 240, 140, 0, 'f-w') + chain(coil(66, 66, 36, 18, 1)) + TX(66, 128, 'below 32 °C', 'co') + arrow(112, 70, 136, 70, 'ho') +
          chain(coil(180, 68, 13, 14, 3)) + TX(180, 128, 'above 32 °C', 'ho') },
      { t: 'Oil on soup', sys: 'mbpoly', d: 'Oil drops on soup join into bigger drops. Water pushes oily molecules together so it can keep its own hydrogen bonds.',
        s: () => P('M30 60h180q-10 62 -90 62t-90 -62z', '') + `<path d="M33 62h174q-12 56 -87 56t-87 -56z" class="f-w"/>` + P('M30 60h180q-10 62 -90 62t-90 -62z', '') +
          [[64,74,6],[86,72,8],[146,76,5],[170,72,7]].map(([x,y,r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.55}" class="f-oil"/>`).join('') + `<ellipse cx="120" cy="88" rx="20" ry="10" class="f-oil"/>` + arrow(92, 80, 104, 86) + arrow(148, 80, 138, 86) + heat(100, 44, 3, 'mu') },
      { t: 'Unfolded by cold', sys: 'mbpoly', d: 'Some proteins unfold not only when heated but also when cooled far enough. In the cold, the push of water on their oily parts gets weaker.',
        s: () => chain([[20,60],[34,50],[46,62],[58,50],[70,64]], 'po') + flake(46, 104, 14) + arrow(86, 64, 100, 64) +
          chain(coil(120, 62, 14, 10, 2)) + TX(120, 104, 'folded', 'mu') + arrow(140, 64, 154, 64) +
          chain([[170,60],[184,50],[196,62],[208,50],[220,64]], 'po') + P('M196 112c-10 -10 0 -22 0 -30c8 10 10 20 0 30z', 'ho') },
     ]},
    ];

    DECKS.forEach((dk) => dk.cards.forEach((c, i) => { c.id = dk.id + (i + 1); c.deck = dk; c.i = i; }));
    return { DECKS, svg, pt };
  })();
  const FC_ALL = FC.DECKS.flatMap((dk) => dk.cards);
  const fcOwned = () => { try { const a = JSON.parse(localStorage.getItem('mdlab-cards') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const fcSave = (a) => { try { localStorage.setItem('mdlab-cards', JSON.stringify(a)); } catch (e) {} };
  const fcFace = (c) => `<article class="fccard ${c.deck.cls}"><div class="fctop"><span>${T(c.deck.name)}</span><i>${c.i + 1} / ${c.deck.cards.length}</i></div>${FC.svg(c.s(), T(c.t))}<div class="fcbody"><h3>${T(c.t)}</h3><p>${T(c.d)}</p></div></article>`;
  const fcBackArt = '<svg viewBox="0 0 100 100" aria-hidden="true">' + Array.from({ length: 10 }, (_, k) => { const [x, y] = FC.pt(50, 50, 30, k * 36), [tx, ty] = FC.pt(50, 50, 16, k * 36);
    return `<line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="${x}" cy="${y}" r="6" fill="white"/>`; }).join('') +
    '<text x="50" y="59" text-anchor="middle" font-size="26" font-weight="700" fill="white" font-family="Instrument Sans, sans-serif">?</text></svg>';
  function fcHow(dk) {
    if (dk.game) return T('Three stars in “{g}” win a card.', { g: T(GAMES.find((g) => g.id === dk.game).title) });
    return T('In Explore, each minute with Plastic, Polymer chains or Oily particles wins a card of that system.');
  }
  function fcGive(pool) { // a random card from the pool that this browser does not have yet; null when the pool is complete
    const own = fcOwned(), left = pool.filter((c) => !own.includes(c.id)); if (!left.length) return null;
    const c = left[Math.floor(Math.random() * left.length)]; own.push(c.id); fcSave(own); renderAlbum(); if (typeof renderLadder === 'function') renderLadder(); return c;
  }
  // the big card over the page: a new card flips over with stars; an album card just opens
  let fcShown = null;
  function fcOpen(c, isNew) {
    fcShown = [c, isNew]; const m = $('fcModal'), f = $('fcFlip'), b = $('fcBurst');
    $('fcFront').innerHTML = fcFace(c); $('fcNew').textContent = isNew ? T('New card!') : ''; $('fcClose').textContent = T(isNew ? 'Add to my cards' : 'Close');
    m.hidden = false; f.classList.toggle('on', !isNew); b.innerHTML = '';
    if (isNew) setTimeout(() => { f.classList.add('on');
      b.innerHTML = Array.from({ length: 12 }, (_, k) => { const a = (k * 30 + 8 * Math.random()) * Math.PI / 180, d = 130 + 50 * Math.random();
        return `<span style="--x:${(Math.cos(a) * d).toFixed(0)}px;--y:${(Math.sin(a) * d).toFixed(0)}px;animation-delay:${(0.35 + 0.05 * Math.random()).toFixed(2)}s">★</span>`; }).join(''); }, 350);
    $('fcClose').focus();
  }
  function fcCloseModal() { $('fcModal').hidden = true; fcShown = null; }
  $('fcClose').addEventListener('click', fcCloseModal);
  $('fcModal').addEventListener('click', (e) => { if (e.target === $('fcModal')) fcCloseModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('fcModal').hidden) fcCloseModal(); });
  // the album, in place of the old "In everyday life" texts: the current system's deck first
  function renderAlbum() {
    const own = fcOwned(), deckOf = (dk) => (dk.game ? GAMES.find((g) => g.id === dk.game).sys === sys : dk.cards.some((c) => c.sys === sys));
    const decks = FC.DECKS.slice().sort((a, b) => deckOf(b) - deckOf(a));
    $('albumCount').textContent = `${own.filter((id) => FC_ALL.some((c) => c.id === id)).length} / ${FC_ALL.length}`;
    $('album').innerHTML = decks.map((dk) => { const n = dk.cards.filter((c) => own.includes(c.id)).length;
      return `<section class="fcdeck ${dk.cls}"><h3>${T(dk.name)} <span>${n} / ${dk.cards.length}</span></h3><p class="note">${fcHow(dk)}</p><div class="fcrow">` +
        dk.cards.map((c) => own.includes(c.id) ? `<button class="fcmini ${dk.cls}" data-card="${c.id}">${FC.svg(c.s(), T(c.t))}<b>${T(c.t)}</b></button>`
          : `<div class="fcmini locked" role="img" aria-label="${T('Not won yet')}">${fcBackArt}</div>`).join('') + '</div></section>'; }).join('');
    $('fcReset').textContent = T('Reset cards'); fcArm = false;
  }
  $('album').addEventListener('click', (e) => { const b = e.target.closest('[data-card]'); if (b) fcOpen(FC_ALL.find((c) => c.id === b.dataset.card), false); });
  let fcArm = false, fcArmT = 0; // resetting takes two clicks, since the page cannot show a confirm dialog
  $('fcReset').addEventListener('click', () => { if (!fcArm) { fcArm = true; $('fcReset').textContent = T('Click again to remove all cards'); clearTimeout(fcArmT); fcArmT = setTimeout(() => { fcArm = false; $('fcReset').textContent = T('Reset cards'); }, 4000); return; }
    fcSave([]); renderAlbum(); renderLadder(); });
  // Explore: every minute of running with a system that has no game wins its next card
  const fcExpAcc = {};
  function cardTick(dtSec) {
    if (appMode !== 'explore' || !running || classOn || !$('fcModal').hidden) return;
    const pool = FC_ALL.filter((c) => c.sys === sys); if (!pool.length) return;
    fcExpAcc[sys] = (fcExpAcc[sys] || 0) + dtSec;
    if (fcExpAcc[sys] >= 60) { fcExpAcc[sys] = 0; const c = fcGive(pool); if (c) fcOpen(c, true); }
  }
  renderAlbum();
  $('fcBack').innerHTML = fcBackArt; fcReady = true;

