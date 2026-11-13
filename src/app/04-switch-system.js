  // ---- switching systems ----
  const pickers = [...document.querySelectorAll('[data-pick]')];
  const isOrdered = () => $('initState').value === 'ordered';
  const startT = () => (SYS[sys].trange || [0.3, 2.5])[0]; // explore always starts at the slider minimum
  function applySysUI() {
    const S = SYS[sys];
    document.querySelector('.wrap').dataset.sys = sys;
    for (const b of pickers) b.setAttribute('aria-pressed', b.dataset.pick === sys);
    for (const el of document.querySelectorAll('[data-show]')) el.hidden = !el.dataset.show.split(' ').includes(sys);
    if (fcReady) renderAlbum();
    $('legendItems').innerHTML = S.legend.map(([c, t]) => `<span><i class="dot" style="background:var(--${c})"></i>${T(t)}</span>`).join('');
    $('concLab').textContent = T(S.concLab); $('plotFlab').innerHTML = T(S.plotLab); $('byClusterLab').textContent = T(S.hl || '');
    $('quench').textContent = T('Cool to {t}', { t: S.cold.toFixed(1) }); $('melt').textContent = T('Heat to {t}', { t: S.hot.toFixed(1) });
    const c = $('conc'); c.min = S.min; c.max = S.max; c.value = S.conc; $('concO').textContent = S.count ? String(S.conc) : S.conc + '%';
    $('chainLen').min = S.lenMin || 3;
    if (S.chainLen) { $('chainLen').value = S.chainLen; $('chainLenO').textContent = S.chainLen; }
    const [lo, hi] = S.trange || [0.3, 2.5], st = S.tstep || 0.01;
    for (const id of ['tslider', 'tsliderM']) { const el = $(id); el.min = lo; el.max = hi; el.step = st; }
    $('ticks').innerHTML = [0, 1, 2, 3, 4].map((q) => `<span>${(lo + q * (hi - lo) / 4).toFixed(2).replace(/0$/, '')}</span>`).join('');
    const dg = st < 0.01 ? 3 : 2; $('quench').textContent = T('Cool to {t}', { t: S.cold.toFixed(dg - 1) }); $('melt').textContent = T('Heat to {t}', { t: S.hot.toFixed(dg - 1) });
    if (S.epsPP !== undefined) { $('epsPP').value = S.epsPP; $('epsPPO').textContent = S.epsPP.toFixed(2); }
    if (S.epsH !== undefined) { $('epsH').value = S.epsH; $('epsHO').textContent = S.epsH.toFixed(2); }
    if (S.epsW !== undefined) { $('epsW').value = S.epsW; $('epsWO').textContent = S.epsW.toFixed(2); }
    $('gamma').value = S.gamma || 1; $('gammaO').textContent = (+$('gamma').value).toFixed(2); // MB systems: low friction so solutes move fast enough to meet
    const kb = S.kBend !== undefined ? S.kBend : 6.4; $('kBend').value = kb; $('kBendO').textContent = kb.toFixed(1);
    $('byCluster').checked = sys === 'polymer' || sys === 'mbpoly' || sys === 'ice';
    $('sizeRow').hidden = sys === 'ice'; $('compPanel').hidden = false;
    $('concRow').hidden = $('concNote').hidden = sys === 'plates';
    baroUI();
  }
  let userBox = $('size').value;
  $('size').addEventListener('change', () => { if (!SYS[sys].box) userBox = $('size').value; });
