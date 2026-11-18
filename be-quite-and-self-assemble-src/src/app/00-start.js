(function () {
  const $ = (id) => document.getElementById(id);
  // ---------- languages ----------
  // I18N[lang][english] = translation. Static page text is keyed by the element's English innerHTML (whitespace collapsed);
  // text written by the script goes through T(), with {name} placeholders for numbers.
/*@I18N@*/
  let LANG = 'en';
  const TKEYS = new Set();
  function T(s, v) { if (s === undefined || s === null || s === '') return s; TKEYS.add(s);
    let r = (LANG !== 'en' && I18N[LANG] && I18N[LANG][s]) || s;
    if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)); return r; }
  const INLINE = new Set(['B', 'I', 'EM', 'STRONG', 'SUB', 'SUP', 'BR', 'A', 'CODE', 'KBD']);
  const SKIPTAG = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'TEXTAREA', 'INPUT', 'OUTPUT', 'SELECT']);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const hasWord = (s) => /[A-Za-z]{2}/.test(s);
  const SKEYS = new Set(), units = [], texts = [];
  function scanStatic(el) { // record translatable units once, from the English page
    for (const c of el.childNodes) {
      if (c.nodeType === 3) { const k = norm(c.nodeValue); if (hasWord(k)) { texts.push({ node: c, en: c.nodeValue, key: k }); SKEYS.add(k); } continue; }
      if (c.nodeType !== 1 || SKIPTAG.has(c.tagName) || c.classList.contains('eq') || c.id === 'lang') continue;
      if (c.tagName === 'SELECT') continue;
      if ([...c.querySelectorAll('*')].every((n) => INLINE.has(n.tagName)) && hasWord(c.textContent)) { const k = norm(c.innerHTML); units.push({ el: c, en: c.innerHTML, key: k, set: c.innerHTML }); SKEYS.add(k); }
      else scanStatic(c);
    }
  }
  function applyStatic() {
    for (const u of units) { if (u.el.innerHTML !== u.set) continue; // the script has taken this element over
      const tr = LANG !== 'en' && I18N[LANG] && I18N[LANG][u.key]; u.el.innerHTML = tr || u.en; u.set = u.el.innerHTML; }
    for (const x of texts) { const tr = LANG !== 'en' && I18N[LANG] && I18N[LANG][x.key];
      x.node.nodeValue = tr ? x.en.replace(/\S[\s\S]*\S|\S/, tr) : x.en; }
    document.querySelectorAll('select option').forEach((o) => { if (o.closest('#lang')) return; if (!o.dataset.en) o.dataset.en = o.textContent; o.textContent = T(o.dataset.en); });
    document.documentElement.lang = LANG;
  }
  scanStatic(document.body);
  window.__i18nKeys = () => [...new Set([...SKEYS, ...TKEYS])];
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const CNAMES = ['head', 'tail', 'solv', 'bond', 'poly', 'cryst', 'mixS', 'mixC', 'cell', 'muted', 'hot', 'line', 'accent', 'cold', 'ink', 'panel'];
  let colors = {};
  const readColors = () => { colors = {}; for (const c of CNAMES) colors[c] = css('--' + c); };
  readColors();
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors); } catch (e) {}
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  const MIN_AGG = 4, RCUT = 1.5, SPACING = 1 / Math.sqrt(0.6);
  let shellMask = null, shellMask2 = null, eng2 = null, gelShow = null;
  let eng, running = true, frame = 0, an = null, sys = 'ice', plotMax = 1, rg0 = 1;
  const hist = { tset: [], tkin: [], frac: [] }, HMAX = 360;
  const pct = (v) => (100 * v).toFixed(0) + '%';

