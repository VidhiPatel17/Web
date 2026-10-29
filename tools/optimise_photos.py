"""Resize the phone originals for the web and build a contact sheet to review."""
import glob
import os
import shutil

from PIL import Image, ImageDraw, ImageOps

ROOT = r"C:\Users\JayPatel\Downloads\Wedding"
PHOTOS = os.path.join(ROOT, "Wedding-site", "assets", "photos")
ORIGINALS = os.path.join(ROOT, "photo-originals")
os.makedirs(ORIGINALS, exist_ok=True)


def fit(im, longest):
    w, h = im.size
    scale = longest / max(w, h)
    if scale >= 1:
        return im
    return im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


files = sorted(glob.glob(os.path.join(PHOTOS, "couple-*.jpg")))
files = [f for f in files if "-sm" not in os.path.basename(f)]
print(f"{len(files)} originals")

thumbs = []
for path in files:
    name = os.path.basename(path)
    stem = name[:-4]
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")

    full = fit(im, 1600)
    full.save(os.path.join(PHOTOS, "_tmp_full.jpg"), "JPEG", quality=82, optimize=True, progressive=True)

    thumb = fit(im, 700)
    thumb.save(os.path.join(PHOTOS, "_tmp_thumb.jpg"), "JPEG", quality=78, optimize=True, progressive=True)

    # keep the original outside the site folder so it never gets uploaded
    dest = os.path.join(ORIGINALS, name)
    if not os.path.exists(dest):
        shutil.move(path, dest)
    else:
        os.remove(path)

    os.replace(os.path.join(PHOTOS, "_tmp_full.jpg"), os.path.join(PHOTOS, name))
    os.replace(os.path.join(PHOTOS, "_tmp_thumb.jpg"), os.path.join(PHOTOS, stem + "-sm.jpg"))

    thumbs.append((stem, thumb.copy()))
    print(f"  {name:16s} {im.size} -> {full.size} / {thumb.size}")

# contact sheet
cols = 4
tw, th = 260, 340
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * (th + 20)), "white")
d = ImageDraw.Draw(sheet)
for i, (stem, im) in enumerate(thumbs):
    im = ImageOps.contain(im, (tw - 8, th - 8))
    x = (i % cols) * tw + (tw - im.width) // 2
    y = (i // cols) * (th + 20) + (th - im.height) // 2
    sheet.paste(im, (x, y))
    d.text(((i % cols) * tw + 6, (i // cols) * (th + 20) + th + 3), stem, fill="black")
sheet.save(os.path.join(ROOT, "Wedding-site", "qa", "shots", "new-photos.png"))
print("contact sheet:", sheet.size)

total = 0
for f in glob.glob(os.path.join(PHOTOS, "*.jpg")):
    total += os.path.getsize(f)
print(f"photo folder now {total/1024/1024:.1f} MB")
