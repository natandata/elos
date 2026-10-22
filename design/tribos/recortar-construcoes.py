import sys
from PIL import Image, ImageFilter
import numpy as np

BASE = r"C:/Users/Cliente/.claude/projects/C--Users-Cliente-OneDrive--rea-de-Trabalho-apps-elos/fbcb8de4-5faf-41d2-b2c8-8942c1957da4/tool-results/"
OUT = r"C:\dev\elos\public\tribos\obras"
# nome_saida=arquivo_origem
for arg in sys.argv[1:]:
    name, f = arg.split("=")
    im = Image.open(BASE + f).convert("RGB")
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    key = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), axis=0)
    d = np.sqrt(((a - key) ** 2).sum(2))
    alpha = np.clip((d - 40) / 70, 0, 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    edge = (alpha > 0) & (alpha < 1)
    lim = g + 40
    a[..., 0] = np.where(edge, np.minimum(r, lim), r)
    a[..., 2] = np.where(edge, np.minimum(b, lim), b)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
    out.putalpha(al)
    out = out.crop(out.getbbox())
    out.save(OUT + "\\" + name + ".webp", quality=92)
    print(name, out.size)
