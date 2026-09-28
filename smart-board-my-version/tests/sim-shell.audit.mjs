import { chromium } from 'playwright';
const tag = process.argv[2] || 'before'; const only = process.argv[3] ? process.argv[3].split(',') : null;
const pages = {
  ep: 'ep-simulation.html?sim=ep-tir&role=teacher',
  eg: 'eg-simulation.html?sim=eg-projection-generator&role=teacher',
  ma: 'ma-simulation.html?sim=ma-ode2&role=teacher',
  cn: 'cn-simulation.html?sim=cn-osi-model&role=teacher',
  dsa: 'dsa-simulation.html?category=stack&role=teacher',
  os: 'os-simulation.html?simulationId=os-process-scheduling',
  c: 'c-simulation.html?simulationId=c-memory',
};
const sizes = (process.argv[4] || '360x800,390x844,430x932,768x1024,1024x1366,1280x720,1366x768,1440x900,1920x1080,2560x1440,3840x2160,5120x1440').split(',').map((s) => s.split('x').map(Number));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [k, url] of Object.entries(pages)) {
  if (only && !only.includes(k)) continue;
  for (const [w, h] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 700 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8100/' + url); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const d = document.documentElement; const vw = innerWidth, vh = innerHeight;
      const cv = [...document.querySelectorAll('canvas, svg.sim-stage, [data-shell-stage]')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 50 && r.height > 50).sort((a, b) => b.width * b.height - a.width * a.height)[0];
      const stage = document.querySelector('[data-shell=stage]'); const sr = stage ? stage.getBoundingClientRect() : cv;
      return { sh: d.scrollHeight, sw: d.scrollWidth, vw, vh, canvas: cv ? `${Math.round(cv.width)}x${Math.round(cv.height)}@${Math.round(cv.top)}` : '-', stageShare: sr ? Math.round((sr.width * Math.min(sr.height, vh - sr.top)) / (vw * vh) * 100) : 0 };
    });
    console.log(`${k} ${w}x${h}: scroll ${r.sh}/${r.vh} h-scroll ${r.sw > r.vw ? 'YES ' + r.sw : 'no'} canvas ${r.canvas} share ${r.stageShare}% ${errs.length ? 'ERR ' + errs[0] : ''}`);
    if ([390, 768, 1280, 1366, 1920, 2560, 3840, 5120].includes(w)) await p.screenshot({ path: `/tmp/w/shots/ui/${tag}-${k}-${w}.png` });
    await p.close();
  }
}
await b.close();
