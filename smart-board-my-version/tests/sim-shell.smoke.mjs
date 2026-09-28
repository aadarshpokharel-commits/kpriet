import { chromium } from 'playwright';
const pages = { ep: ['ep-simulation.html?sim=ep-tir&role=teacher', '#ep-next', '#ep-banner-no'], eg: ['eg-simulation.html?sim=eg-projection-generator&role=teacher', '#ep-next', '#ep-banner-no'], ma: ['ma-simulation.html?sim=ma-eigen&role=teacher', '#ep-next', '#ep-banner-no'],
  cn: ['cn-simulation.html?sim=cn-osi-model&role=teacher', '#cn-next', '#cn-step-label'], dsa: ['dsa-simulation.html?category=bubble-sort&role=teacher', '#dsa-next', '#dsa-step-label'],
  os: ['os-simulation.html?simulationId=os-process-scheduling', '#os-next', '#os-step-label'], c: ['c-simulation.html?simulationId=c-memory', '#c-next', '#c-step-label'] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[1366, 768], [390, 844], [3840, 2160]]) for (const [k, [url, next, label]] of Object.entries(pages)) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8100/' + url); await p.waitForTimeout(700);
  const probs = [];
  const tabs = await p.$$eval('.shell-dock:not([style*="none"]) .shell-tab', (t) => t.length);
  const tabN = await p.evaluate(() => document.querySelectorAll('.shell-tab').length);
  for (let i = 0; i < tabN; i++) {
    const vis = await p.evaluate((i) => { const t = document.querySelectorAll('.shell-tab')[i]; if (!t || !t.offsetParent) return 'skip'; t.click(); const a = document.querySelector('.shell-panel.shell-active'); const all = [...document.querySelectorAll('.shell-panel.shell-active')].map((x) => x.getBoundingClientRect().height); return all.length ? Math.min(...all) : 0; }, i);
    if (vis !== 'skip' && vis < 40) probs.push(`tab ${i} panel height ${vis}`);
  }
  const lab = await p.$eval(label, (e) => e.textContent).catch(() => '?');
  const nb = await p.$(next); if (!nb) probs.push('no next'); else { const dis = await nb.isDisabled(); if (!dis) { await nb.click(); await p.waitForTimeout(300); } }
  const lab2 = await p.$eval(label, (e) => e.textContent).catch(() => '?');
  const nextVisible = await p.$eval(next, (e) => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.width > 20; }).catch(() => false);
  if (!nextVisible) probs.push('next button not visible');
  // focus mode
  const f = await p.evaluate(async () => { window.SimulationShell.setFocus(true); await new Promise((r) => setTimeout(r, 250)); const st = document.querySelector('.shell-stage').getBoundingClientRect(); const c = document.querySelector('.shell-controls').getBoundingClientRect(); const hdr = document.querySelector('.shell-header').offsetParent; const ex = document.querySelector('.shell-exit').getBoundingClientRect(); const o = { stage: Math.round(st.width * st.height / (innerWidth * innerHeight) * 100), ctrl: c.bottom <= innerHeight && c.width > 50, hdr: Boolean(hdr), exit: ex.width > 0, sh: document.documentElement.scrollHeight <= innerHeight }; window.SimulationShell.setFocus(false); return o; });
  if (f.stage < 70 || !f.ctrl || f.hdr || !f.exit || !f.sh) probs.push('focus ' + JSON.stringify(f));
  if (w < 700) { const m = await p.evaluate(() => { document.querySelector('.shell-more').click(); const a = [...document.querySelectorAll('.shell-actions')].filter((x) => x.offsetParent && x.getBoundingClientRect().height > 20).length; document.body.click(); document.querySelector('.shell-sheet-btn')?.click(); const d = document.querySelector('.shell-dock-a').getBoundingClientRect().height; document.querySelector('.shell-sheet-btn')?.click(); return { a, d: Math.round(d / innerHeight * 100) }; }); if (!m.a || m.d < 70) probs.push('mobile menu/sheet ' + JSON.stringify(m)); }
  else { const c = await p.evaluate(async () => { document.querySelector('.shell-dock-hide').click(); await new Promise((r) => setTimeout(r, 200)); const s = document.querySelector('.shell-stage').getBoundingClientRect().width / innerWidth; document.querySelector('.shell-dock-show').click(); return Math.round(s * 100); }); if (c < 90) probs.push('collapse ' + c); }
  console.log(`${w} ${k}: tabs ${tabN} step "${(lab || '').trim().slice(0, 14)}"→"${(lab2 || '').trim().slice(0, 14)}" ${probs.join('; ') || 'ok'} ${errs.length ? 'ERR ' + errs.slice(0, 2).join(' | ') : ''}`);
  await p.close();
}
await b.close();
