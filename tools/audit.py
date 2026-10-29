"""Whole-site audit: structure, a11y, performance, broken things, screenshots."""
import io
import json
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    Image = None
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:8129/index.html"
SHOTS = os.path.join(ROOT, "qa", "shots", "audit")
os.makedirs(SHOTS, exist_ok=True)

AUDIT_JS = r"""
() => {
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const sections = q('section[id]').map((s) => {
    const r = s.getBoundingClientRect();
    return { id: s.id, h: Math.round(r.height), top: Math.round(r.top + window.scrollY) };
  });
  const heads = q('h1,h2,h3,h4,h5,h6').map((h) => h.tagName + ' :: ' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 55));
  const h1s = q('h1').length;

  const imgsNoAlt = q('img').filter((i) =>
    !i.hasAttribute('alt') || (i.alt.trim() === '' && !i.closest('[aria-hidden="true"]'))
  ).map((i) => (i.currentSrc || i.src).split('/').pop());

  const imgsNoDims = q('img').filter((i) => !i.getAttribute('width') && !i.getAttribute('height') && !i.style.aspectRatio && getComputedStyle(i).aspectRatio === 'auto').length;

  const smallTargets = q('button, a[href], input, select, textarea').filter(vis).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height < 40 || r.width < 40;
  }).map((el) => ({
    tag: el.tagName,
    cls: String(el.className).slice(0, 34),
    text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 26),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height)
  }));

  const anchors = q('a[href^="#"]').map((a) => a.getAttribute('href')).filter((h) => h.length > 1);
  const brokenAnchors = anchors.filter((h) => !document.getElementById(h.slice(1)));

  const ids = q('[id]').map((e) => e.id);
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);

  const inputs = q('input, textarea, select').filter((i) => i.type !== 'hidden');
  const unlabelled = inputs.filter((i) => {
    if (i.getAttribute('aria-label') || i.getAttribute('aria-labelledby')) return false;
    if (i.id && document.querySelector('label[for="' + CSS.escape(i.id) + '"]')) return false;
    return !i.closest('label');
  }).map((i) => i.id || i.name);

  const m = (n) => { const e = document.querySelector('meta[name="' + n + '"]'); return e ? e.content : null; };
  const og = (p) => { const e = document.querySelector('meta[property="og:' + p + '"]'); return e ? e.content : null; };

  const res = performance.getEntriesByType('resource');
  const bytes = res.reduce((a, r) => a + (r.transferSize || 0), 0);
  const heaviest = res.filter((r) => (r.transferSize || 0) > 0)
    .sort((a, b) => b.transferSize - a.transferSize).slice(0, 8)
    .map((r) => (r.name.split('/').pop() || '?').slice(0, 34) + ' ' + Math.round(r.transferSize / 1024) + 'kb');

  return {
    title: document.title,
    lang: document.documentElement.lang,
    viewportMeta: !!document.querySelector('meta[name="viewport"]'),
    description: m('description'),
    robots: m('robots'),
    themeColor: m('theme-color'),
    ogTitle: og('title'), ogImage: og('image'), ogDesc: og('description'),
    canonical: (document.querySelector('link[rel="canonical"]') || {}).href || null,
    favicon: !!document.querySelector('link[rel~="icon"]'),
    h1s, heads,
    sections,
    docHeight: document.documentElement.scrollHeight,
    horizOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    imgsNoAlt, imgsNoDims,
    imgCount: q('img').length,
    smallTargets, brokenAnchors, dupIds, unlabelled,
    reqCount: res.length,
    bytesKB: Math.round(bytes / 1024),
    heaviest,
    countdown: (document.getElementById('countdown') || {}).textContent ? document.getElementById('countdown').textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : null,
    diyas: q('#diyaWall .diya').length,
    railCards: q('#polaroids .polaroid').length,
    curtains: q('.curtain').length,
    hasIcs: typeof window.buildIcs === 'function' || !!document.getElementById('addCal') || !!document.querySelector('[data-ics]')
  };
}
"""

report = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()

    # ---------------- desktop ----------------
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    p = ctx.new_page()
    errs, console_errs, failed = [], [], []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.on("console", lambda m: console_errs.append(m.text) if m.type == "error" else None)
    p.on("requestfailed", lambda r: failed.append(r.url.split("/")[-1]))
    p.goto(BASE, wait_until="load")
    p.evaluate("document.fonts.ready")
    p.wait_for_timeout(2000)
    p.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
    p.wait_for_timeout(2500)

    report["desktop"] = p.evaluate(AUDIT_JS)
    report["pageerrors"] = errs
    report["consoleErrors"] = console_errs[:5]
    report["failedRequests"] = failed[:5]

    for sid in ["top", "save-date", "note", "couple", "frames", "journey", "invitation", "rituals", "before", "blessings", "countdown"]:
        try:
            p.locator("#" + sid).screenshot(path=os.path.join(SHOTS, f"d-{sid}.png"))
        except Exception as e:
            print("shot failed", sid, e)

    # ---------------- mobile ----------------
    mctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    mp = mctx.new_page()
    merrs = []
    mp.on("pageerror", lambda e: merrs.append(str(e)))
    mp.goto(BASE, wait_until="load")
    mp.wait_for_timeout(2500)
    report["mobile"] = mp.evaluate(AUDIT_JS)
    report["mobileErrors"] = merrs
    for sid in ["top", "couple", "frames", "invitation", "rituals", "blessings"]:
        try:
            mp.locator("#" + sid).screenshot(path=os.path.join(SHOTS, f"m-{sid}.png"))
        except Exception as e:
            print("mobile shot failed", sid, e)

    # ---------------- tablet ----------------
    tctx = b.new_context(viewport={"width": 834, "height": 1100})
    tp = tctx.new_page()
    tp.goto(BASE, wait_until="load")
    tp.wait_for_timeout(2000)
    report["tablet"] = tp.evaluate("() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth + 1 })")
    b.close()

json.dump(report, io.open(os.path.join(ROOT,"qa","audit.json"),"w",encoding="utf-8"), indent=1)
print("report written")

# ---------------- montages ----------------
def montage(names, out, cols=2, cw=560):
    imgs = []
    for n in names:
        fp = os.path.join(SHOTS, n + ".png")
        if not os.path.exists(fp):
            continue
        im = Image.open(fp).convert("RGB")
        scale = cw / im.width
        imgs.append((n, im.resize((cw, max(1, int(im.height * scale))), Image.LANCZOS)))
    if not imgs:
        return
    rows = (len(imgs) + cols - 1) // cols
    rh = max(i.height for _, i in imgs) + 26
    sheet = Image.new("RGB", (cols * cw, rows * rh), "white")
    d = ImageDraw.Draw(sheet)
    for idx, (n, im) in enumerate(imgs):
        x = (idx % cols) * cw
        y = (idx // cols) * rh
        sheet.paste(im, (x, y + 22))
        d.text((x + 6, y + 6), n, fill="black")
    sheet.save(os.path.join(SHOTS, out))
    print("montage", out, sheet.size)


if Image is None:
    print("PIL missing - montages skipped")
    raise SystemExit(0)

montage(["d-top", "d-save-date", "d-note", "d-couple"], "montage-a.png")
montage(["d-frames", "d-journey", "d-invitation", "d-rituals"], "montage-b.png")
montage(["d-before", "d-blessings", "d-countdown"], "montage-c.png")
montage(["m-top", "m-couple", "m-frames", "m-invitation", "m-rituals", "m-blessings"], "montage-mobile.png", cols=3, cw=390)
