#!/usr/bin/env python3
"""Generate the ornamental SVG set for the Heritage Scroll wedding site.

Everything is drawn procedurally so the site ships as plain files with no
runtime dependency. Palette matches the design tokens in styles.css.

Run:  python tools/make_decor.py
"""
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "decor")
os.makedirs(OUT, exist_ok=True)

GOLD = "#A8823A"


def pol(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def n(v):
    """Trim float noise for compact SVG output."""
    return f"{v:.2f}".rstrip("0").rstrip(".")


def write(name, body, viewbox, width=None, height=None):
    vb = " ".join(n(float(x)) for x in viewbox)
    dims = ""
    if width:
        dims += f' width="{n(width)}"'
    if height:
        dims += f' height="{n(height)}"'
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{dims} '
        f'fill="none" aria-hidden="true">\n{body}\n</svg>\n'
    )
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(svg)
    print(f"{name:22s} {len(svg):6d} bytes")


# ---------------------------------------------------------------- mandala ----
def mandala(size=800):
    """Dense radial lace: bead rings, petal bands, scallops, lotus heart."""
    c = size / 2
    p = []

    def circle(r, sw=1.2, op=0.7, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        p.append(
            f'<circle cx="{n(c)}" cy="{n(c)}" r="{n(r)}" stroke="{GOLD}" '
            f'stroke-width="{sw}" opacity="{op}"{d}/>'
        )

    def bead_ring(r, count, dot, op=0.6):
        g = []
        for i in range(count):
            x, y = pol(c, c, r, i * 360 / count)
            g.append(f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(dot)}"/>')
        p.append(f'<g fill="{GOLD}" opacity="{op}">{"".join(g)}</g>')

    def petal_ring(r, count, rx, ry, sw=0.9, op=0.6, phase=0, fill_op=0.0):
        g = []
        for i in range(count):
            ang = phase + i * 360 / count
            x, y = pol(c, c, r, ang)
            g.append(
                f'<ellipse cx="{n(x)}" cy="{n(y)}" rx="{n(rx)}" ry="{n(ry)}" '
                f'transform="rotate({n(ang + 90)} {n(x)} {n(y)})"'
                f' fill="{GOLD}" fill-opacity="{fill_op}"/>'
            )
        p.append(
            f'<g stroke="{GOLD}" stroke-width="{sw}" opacity="{op}">{"".join(g)}</g>'
        )

    def leaf_ring(r, count, length, width, sw=1.0, op=0.7, fill_op=0.06, phase=0):
        g = []
        for i in range(count):
            ang = phase + i * 360 / count
            x, y = pol(c, c, r, ang)
            g.append(
                f'<path d="M0 {n(-length)} C{n(width)} {n(-length*0.36)} {n(width)} '
                f'{n(length*0.36)} 0 {n(length)} C{n(-width)} {n(length*0.36)} '
                f'{n(-width)} {n(-length*0.36)} 0 {n(-length)} Z" '
                f'transform="translate({n(x)} {n(y)}) rotate({n(ang + 90)})" '
                f'fill="{GOLD}" fill-opacity="{fill_op}"/>'
            )
        p.append(
            f'<g stroke="{GOLD}" stroke-width="{sw}" opacity="{op}">{"".join(g)}</g>'
        )

    # ---- radius ladder, outer edge inward (all absolute radii)
    circle(392, 1.6, 0.8)
    bead_ring(383, 84, 1.7, 0.55)
    circle(374, 0.9, 0.5)
    petal_ring(366, 64, 5.2, 18, 0.85, 0.55)
    circle(346, 1.2, 0.65)

    # ---- main petal band
    petal_ring(328, 32, 10.5, 26, 1.0, 0.7, fill_op=0.07)
    bead_ring(296, 64, 1.5, 0.45)
    circle(287, 1.0, 0.5)

    # ---- scallop arcs
    arcs = []
    for i in range(40):
        a0 = i * 9
        x0, y0 = pol(c, c, 272, a0)
        x1, y1 = pol(c, c, 272, a0 + 9)
        mx, my = pol(c, c, 289, a0 + 4.5)
        arcs.append(f'<path d="M{n(x0)} {n(y0)} Q{n(mx)} {n(my)} {n(x1)} {n(y1)}"/>')
    p.append(f'<g stroke="{GOLD}" stroke-width="1" opacity="0.55">{"".join(arcs)}</g>')
    circle(258, 1.2, 0.6)

    # ---- broad lotus ring
    leaf_ring(236, 24, 32, 13, 1.05, 0.75, 0.08)
    circle(200, 1.1, 0.55)
    bead_ring(190, 48, 1.4, 0.4)

    # ---- inner lace
    petal_ring(176, 48, 4.4, 12, 0.8, 0.5, phase=3.75)
    circle(160, 1.0, 0.55)
    leaf_ring(140, 16, 20, 9, 1.0, 0.7, 0.07)
    circle(116, 1.1, 0.6)

    # ---- heart
    petal_ring(104, 20, 6, 9, 0.95, 0.65, fill_op=0.06, phase=9)
    circle(90, 1.3, 0.7)
    leaf_ring(76, 10, 12, 6, 1.0, 0.7, 0.08)
    circle(60, 1.1, 0.6)
    bead_ring(48, 20, 1.4, 0.45)

    # ---- centre rosette
    petal_ring(36, 12, 4, 8, 1.0, 0.75, fill_op=0.1)
    circle(24, 1.2, 0.7)
    p.append(f'<circle cx="{n(c)}" cy="{n(c)}" r="10" stroke="{GOLD}" '
             f'stroke-width="1.4" opacity="0.8"/>')
    p.append(f'<circle cx="{n(c)}" cy="{n(c)}" r="4" fill="{GOLD}" opacity="0.55"/>')

    return "\n".join(p)


# ----------------------------------------------------------------- damask ----
def damask(size=300):
    """Seamless ogee tile: diamond lattice, corner curls, central sprig."""
    s = size
    h = s / 2
    p = []

    p.append(
        f'<path d="M0 {n(h)} L{n(h)} 0 L{n(s)} {n(h)} L{n(h)} {n(s)} Z" '
        f'stroke="{GOLD}" stroke-width="1.05" opacity="0.55" fill="none"/>'
    )
    p.append(
        f'<path d="M0 0 L{n(h)} {n(h)} L{n(s)} 0 M0 {n(s)} L{n(h)} {n(h)} L{n(s)} {n(s)}" '
        f'stroke="{GOLD}" stroke-width="0.7" opacity="0.3" fill="none"/>'
    )

    corners = []
    for cx, cy in ((0, 0), (s, 0), (0, s), (s, s)):
        corners.append(
            f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(s*0.22)}" '
            f'stroke="{GOLD}" stroke-width="0.9" opacity="0.4"/>'
        )
        corners.append(
            f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(s*0.15)}" '
            f'stroke="{GOLD}" stroke-width="0.7" opacity="0.3"/>'
        )
    p.append("".join(corners))

    p.append(
        f'<path d="M{n(h)} {n(s*0.80)} C{n(h-6)} {n(s*0.66)} {n(h+6)} {n(s*0.50)} {n(h)} {n(s*0.34)}" '
        f'stroke="{GOLD}" stroke-width="1.1" opacity="0.55" fill="none"/>'
    )
    leaves = []
    for t, sgn, ln in (
        (0.72, -1, 16), (0.72, 1, 16), (0.60, -1, 13), (0.60, 1, 13),
        (0.48, -1, 10), (0.48, 1, 10)
    ):
        y = s * t
        leaves.append(
            f'<path d="M0 0 C{n(ln*0.55)} {n(-ln*0.34)} {n(ln*0.95)} {n(-ln*0.1)} {n(ln)} {n(ln*0.18)} '
            f'C{n(ln*0.6)} {n(ln*0.26)} {n(ln*0.24)} {n(ln*0.2)} 0 0 Z" '
            f'transform="translate({n(h)} {n(y)}) scale({sgn} 1) rotate({-18 if sgn > 0 else 18})" '
            f'fill="{GOLD}" fill-opacity="0.22" stroke="{GOLD}" stroke-width="0.7" opacity="0.75"/>'
        )
    p.append("".join(leaves))
    p.append(
        f'<path d="M{n(h)} {n(s*0.34)} C{n(h+7)} {n(s*0.29)} {n(h+7)} {n(s*0.21)} {n(h)} {n(s*0.16)} '
        f'C{n(h-7)} {n(s*0.21)} {n(h-7)} {n(s*0.29)} {n(h)} {n(s*0.34)} Z" '
        f'fill="{GOLD}" fill-opacity="0.16" stroke="{GOLD}" stroke-width="0.9" opacity="0.8"/>'
    )
    p.append(
        f'<path d="M{n(h)} {n(s*0.16)} C{n(h+5)} {n(s*0.11)} {n(h+5)} {n(s*0.06)} {n(h)} {n(s*0.02)} '
        f'C{n(h-5)} {n(s*0.06)} {n(h-5)} {n(s*0.11)} {n(h)} {n(s*0.16)} Z" '
        f'fill="{GOLD}" fill-opacity="0.1" stroke="{GOLD}" stroke-width="0.7" opacity="0.6"/>'
    )

    curls = []
    for i in range(4):
        a = i * 90
        curls.append(
            f'<path d="M0 0 C{n(s*0.06)} {n(-s*0.14)} {n(s*0.2)} {n(-s*0.16)} {n(s*0.24)} {n(-s*0.06)}" '
            f'transform="translate({n(h)} {n(h)}) rotate({a})" '
            f'stroke="{GOLD}" stroke-width="0.85" opacity="0.35" fill="none"/>'
        )
    p.append("".join(curls))

    beads = []
    for cx, cy in ((h, 0), (0, h), (s, h), (h, s)):
        beads.append(f'<circle cx="{n(cx)}" cy="{n(cy)}" r="2.6"/>')
    p.append(f'<g fill="{GOLD}" opacity="0.45">{"".join(beads)}</g>')
    return "\n".join(p)


# ------------------------------------------------------------ vine border ----
def vine(width=600, height=70):
    """Running gold thread with tendrils and alternating leaves."""
    p = []
    mid = height / 2
    amp = height * 0.3
    waves = 3
    steps = 120
    pts = [
        (width * i / steps, mid + math.sin(i / steps * math.pi * 2 * waves) * amp)
        for i in range(steps + 1)
    ]
    d = "M" + " L".join(f"{n(x)} {n(y)}" for x, y in pts)
    p.append(f'<path d="{d}" stroke="{GOLD}" stroke-width="1.5" opacity="0.65"/>')

    for i in range(1, 16):
        f = i / 16
        x = width * f
        y = mid + math.sin(f * math.pi * 2 * waves) * amp
        flip = 1 if i % 2 else -1
        ln = 18 if i % 3 else 24
        p.append(
            f'<path d="M0 0 C{n(ln*0.5)} {n(-ln*0.42*flip)} {n(ln*0.9)} {n(-ln*0.16*flip)} {n(ln)} {n(ln*0.22*flip)} '
            f'C{n(ln*0.56)} {n(ln*0.3*flip)} {n(ln*0.2)} {n(ln*0.22*flip)} 0 0 Z" '
            f'transform="translate({n(x)} {n(y)})" fill="{GOLD}" fill-opacity="0.3" '
            f'stroke="{GOLD}" stroke-width="0.8" opacity="0.8"/>'
        )
        p.append(
            f'<path d="M0 0 C{n(9)} {n(11*flip)} {n(22)} {n(13*flip)} {n(24)} {n(2*flip)} '
            f'C{n(25)} {n(-4*flip)} {n(17)} {n(-4*flip)} {n(17)} {n(3*flip)}" '
            f'transform="translate({n(x)} {n(y)})" stroke="{GOLD}" stroke-width="0.9" '
            f'opacity="0.5" fill="none"/>'
        )
    for x, y in ((2, mid), (width - 2, mid)):
        p.append(f'<circle cx="{n(x)}" cy="{n(y)}" r="3.4" fill="{GOLD}" opacity="0.45"/>')
    return "\n".join(p)


# ---------------------------------------------------------------- lantern ----
def lantern():
    """Hanging brass lantern, lit from within."""
    p = []
    p.append(
        '<defs>'
        '<linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#6E4F18"/>'
        '<stop offset="0.26" stop-color="#D9B765"/>'
        '<stop offset="0.5" stop-color="#F6E4B4"/>'
        '<stop offset="0.74" stop-color="#C29B44"/>'
        '<stop offset="1" stop-color="#63460F"/>'
        '</linearGradient>'
        '<radialGradient id="glass" cx="0.5" cy="0.55" r="0.62">'
        '<stop offset="0" stop-color="#FFF0CB" stop-opacity="0.97"/>'
        '<stop offset="0.55" stop-color="#FFC061" stop-opacity="0.8"/>'
        '<stop offset="1" stop-color="#DE851C" stop-opacity="0.4"/>'
        '</radialGradient>'
        '<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">'
        '<stop offset="0" stop-color="#FFCE7A" stop-opacity="0.5"/>'
        '<stop offset="0.5" stop-color="#FFB347" stop-opacity="0.16"/>'
        '<stop offset="1" stop-color="#FFA726" stop-opacity="0"/>'
        '</radialGradient>'
        '</defs>'
    )
    p.append('<ellipse cx="80" cy="140" rx="78" ry="98" fill="url(#halo)"/>')
    p.append('<g stroke="#B08A3E" stroke-width="1.4" opacity="0.9" fill="none">'
             '<path d="M80 0 V30"/>'
             '<ellipse cx="80" cy="10" rx="3.4" ry="5"/>'
             '<ellipse cx="80" cy="22" rx="3.4" ry="5"/>'
             '</g>')
    p.append('<path d="M61 32 H99 L93 46 H67 Z" fill="url(#brass)"/>')
    p.append('<path d="M67 46 H93 L105 64 H55 Z" fill="url(#brass)" opacity="0.95"/>')
    p.append('<path d="M55 64 C55 60 59 58 63 58 H97 C101 58 105 60 105 64 Z" fill="url(#brass)"/>')
    body = ('M55 66 C47 82 45 102 45 124 C45 150 55 174 80 174 '
            'C105 174 115 150 115 124 C115 102 113 82 105 66 Z')
    p.append(f'<path d="{body}" fill="url(#glass)"/>')
    p.append(f'<path d="{body}" stroke="url(#brass)" stroke-width="3" fill="none"/>')
    for x0, x1, w in ((51, 61, 1.6), (61, 71, 1.1), (99, 89, 1.1), (109, 99, 1.6)):
        p.append(f'<path d="M{x0} 72 C{x0 + (x1-x0)*0.2} 104 {x0 + (x1-x0)*0.2} 144 {x1} 170" '
                 f'stroke="#C9A24B" stroke-width="{w}" opacity="0.55" fill="none"/>')
    p.append('<rect x="46" y="84" width="68" height="3.6" rx="1.8" fill="url(#brass)" opacity="0.9"/>')
    p.append('<rect x="46" y="156" width="68" height="3.6" rx="1.8" fill="url(#brass)" opacity="0.9"/>')
    p.append('<path d="M64 174 H96 L90 186 H70 Z" fill="url(#brass)"/>')
    p.append('<path d="M70 186 H90 L80 199 Z" fill="url(#brass)"/>')
    p.append('<circle cx="80" cy="203" r="3.6" fill="#D9B765"/>')
    p.append('<path d="M80 108 C85 118 87 128 80 136 C73 128 75 118 80 108 Z" '
             'fill="#FFF6DC" opacity="0.95"/>')
    p.append('<path d="M80 118 C82 124 82 129 80 132 C78 129 78 124 80 118 Z" fill="#FFFDF4"/>')
    return "\n".join(p)


# --------------------------------------------------------------- flourish ----
def flourish(width=560, height=76):
    """Divider: central lozenge with symmetric scrolls growing out of it."""
    c = width / 2
    mid = height / 2
    p = []
    v = 20
    for sgn in (-1, 1):
        p.append(
            f'<path d="M{n(c + sgn*20)} {n(mid)} '
            f'C{n(c + sgn*64)} {n(mid)} {n(c + sgn*86)} {n(mid-12)} {n(c + sgn*120)} {n(mid-12)} '
            f'C{n(c + sgn*156)} {n(mid-12)} {n(c + sgn*170)} {n(mid)} {n(c + sgn*196)} {n(mid)} '
            f'C{n(c + sgn*214)} {n(mid)} {n(c + sgn*222)} {n(mid-7)} {n(c + sgn*236)} {n(mid-7)}" '
            f'stroke="{GOLD}" stroke-width="1.4" opacity="0.75" fill="none"/>'
        )
        p.append(
            f'<path d="M{n(c + sgn*20)} {n(mid)} '
            f'C{n(c + sgn*64)} {n(mid)} {n(c + sgn*86)} {n(mid+10)} {n(c + sgn*118)} {n(mid+10)} '
            f'C{n(c + sgn*150)} {n(mid+10)} {n(c + sgn*166)} {n(mid+4)} {n(c + sgn*184)} {n(mid+4)}" '
            f'stroke="{GOLD}" stroke-width="1" opacity="0.45" fill="none"/>'
        )
        p.append(
            f'<path d="M0 0 C{n(9)} {n(-7)} {n(20)} {n(-7)} {n(26)} 0 C{n(20)} {n(7)} {n(9)} {n(7)} 0 0 Z" '
            f'transform="translate({n(c + sgn*138)} {n(mid-12)})" '
            f'fill="{GOLD}" fill-opacity="0.22" stroke="{GOLD}" stroke-width="0.7" opacity="0.7"/>'
        )
        p.append(f'<circle cx="{n(c + sgn*243)}" cy="{n(mid-7)}" r="2.6" fill="{GOLD}" opacity="0.6"/>')
        p.append(f'<circle cx="{n(c + sgn*256)}" cy="{n(mid-7)}" r="1.4" fill="{GOLD}" opacity="0.4"/>')
        for dx, dy, r in ((64, 5, 2.0), (96, 5, 1.6), (168, 3, 1.6)):
            p.append(f'<circle cx="{n(c + sgn*dx)}" cy="{n(mid + dy)}" r="{n(r)}" fill="{GOLD}" opacity="0.45"/>')

    p.append(f'<path d="M{n(c)} {n(mid-v)} L{n(c+18)} {n(mid)} L{n(c)} {n(mid+v)} L{n(c-18)} {n(mid)} Z" '
             f'stroke="{GOLD}" stroke-width="1.4" opacity="0.85" fill="{GOLD}" fill-opacity="0.07"/>')
    p.append(f'<path d="M{n(c)} {n(mid-v+8)} C{n(c+7.5)} {n(mid-3)} {n(c+7.5)} {n(mid+3)} {n(c)} {n(mid+v-8)} '
             f'C{n(c-7.5)} {n(mid+3)} {n(c-7.5)} {n(mid-3)} {n(c)} {n(mid-v+8)} Z" '
             f'fill="{GOLD}" opacity="0.45"/>')
    return "\n".join(p)


# ------------------------------------------------------------------- arch ----
def arch_icon():
    """Small pointed-arch frame used behind timeline icons."""
    return (
        f'<path d="M8 58 V30 C8 14 20 6 30 6 C40 6 52 14 52 30 V58 Z" '
        f'stroke="{GOLD}" stroke-width="1.4" opacity="0.8" fill="{GOLD}" fill-opacity="0.05"/>'
        f'<path d="M13 58 V31 C13 18 23 11 30 11 C37 11 47 18 47 31 V58" '
        f'stroke="{GOLD}" stroke-width="0.8" opacity="0.45" fill="none"/>'
        f'<path d="M8 58 H52" stroke="{GOLD}" stroke-width="1.4" opacity="0.8"/>'
    )


if __name__ == "__main__":
    write("mandala.svg", mandala(800), (0, 0, 800, 800), 800, 800)
    write("damask.svg", damask(300), (0, 0, 300, 300), 300, 300)
    write("vine.svg", vine(600, 70), (0, 0, 600, 70), 600, 70)
    write("lantern.svg", lantern(), (0, 0, 160, 220), 160, 220)
    write("flourish.svg", flourish(560, 76), (0, 0, 560, 76), 560, 76)
    write("arch.svg", arch_icon(), (0, 0, 60, 64), 60, 64)
    print("done ->", OUT)
