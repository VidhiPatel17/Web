#!/usr/bin/env python3
"""Build the link-preview (Open Graph) card from the e-invite artwork.

WhatsApp / Facebook / LinkedIn want a 1200x630 landscape image under ~300 KB.
The supplied `website.png` is a near-square 519x449 e-invite card, so cropping it
to 1.91:1 would cut "Shree Ganeshaya Namah" off the top and the invite line off
the bottom. Instead the whole card is kept intact and centred, and the empty
side space is filled with a blurred, darkened copy of the same photograph - so
nothing is cropped and the frame reads as deliberate.

Run:  python tools/make_share_card.py
"""
import os

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "website.png")
OUT_DIR = os.path.join(ROOT, "assets", "share")
OUT = os.path.join(OUT_DIR, "vidhi-jay-og.jpg")

W, H = 1200, 630
PAD = 34                     # breathing room around the invite card
GOLD = (198, 161, 91)


def cover(im, w, h):
    """Scale-and-crop to fill w x h without distorting."""
    scale = max(w / im.width, h / im.height)
    resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"missing source artwork: {SRC}")

    invite = Image.open(SRC).convert("RGB")

    # --- backdrop: the same photo, blown up, blurred and pushed down ---------
    bg = cover(invite, W, H).filter(ImageFilter.GaussianBlur(34))
    bg = ImageEnhance.Brightness(bg).enhance(0.58)
    bg = ImageEnhance.Color(bg).enhance(0.92)
    canvas = bg.copy()

    # soft vignette so the centred card separates from the backdrop
    veil = Image.new("L", (W, H), 0)
    ImageDraw.Draw(veil).ellipse(
        (-W * 0.15, -H * 0.55, W * 1.15, H * 1.55), fill=55
    )
    veil = veil.filter(ImageFilter.GaussianBlur(120))
    canvas = Image.composite(Image.new("RGB", (W, H), (12, 6, 8)), canvas, veil.point(lambda v: v))

    # --- foreground: the full invite, nothing cropped ------------------------
    target_h = H - PAD * 2
    scale = target_h / invite.height
    fg = invite.resize((round(invite.width * scale), target_h), Image.LANCZOS)
    x = (W - fg.width) // 2
    y = (H - fg.height) // 2

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle(
        (x - 10, y - 10, x + fg.width + 10, y + fg.height + 10), fill=(0, 0, 0, 165)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)

    canvas.paste(fg, (x, y))

    # hairline gold frame around the invite
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(
        (x - 6, y - 6, x + fg.width + 6, y + fg.height + 6),
        outline=GOLD + (200,),
        width=2,
    )

    os.makedirs(OUT_DIR, exist_ok=True)
    card = canvas.convert("RGB")
    for quality in (88, 84, 80, 76, 72, 68):
        card.save(OUT, "JPEG", quality=quality, optimize=True, progressive=True)
        kb = os.path.getsize(OUT) / 1024
        if kb <= 280:
            break
    print(f"{OUT}  {card.width}x{card.height}  {kb:.0f} KB  q={quality}")


if __name__ == "__main__":
    main()
