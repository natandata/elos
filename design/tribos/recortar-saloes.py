from PIL import Image, ImageFilter
import numpy as np

BASE = r"C:/Users/Cliente/.claude/projects/C--Users-Cliente-OneDrive--rea-de-Trabalho-apps-elos/fbcb8de4-5faf-41d2-b2c8-8942c1957da4/tool-results/"
FILES = {
    "feras": "mcp-783842e8-c4f8-4ead-850e-05cf0e8ca7b6-blob-1792609591617-1mti07.png",
    "bravos": "mcp-783842e8-c4f8-4ead-850e-05cf0e8ca7b6-blob-1792684375742-6rwyjf.png",
    "reliquias": "mcp-783842e8-c4f8-4ead-850e-05cf0e8ca7b6-blob-1792684375747-m4c4wp.png",
}
OUT = r"C:\dev\elos\public\tribos\obras"
sheet = Image.new("RGBA", (3 * 420, 420), (110, 150, 100, 255))
for i, (t, f) in enumerate(FILES.items()):
    im = Image.open(BASE + f).convert("RGB")
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    key = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), axis=0)
    d = np.sqrt(((a - key) ** 2).sum(2))
    alpha = np.clip((d - 40) / 70, 0, 1)
    # despill do magenta nas bordas: rebaixa o vermelho/azul excedente
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = np.clip((np.minimum(r, b) - g) / 255, 0, 1) * (1 - alpha) * 0 + 0
    edge = (alpha > 0) & (alpha < 1)
    lim = np.maximum(g, 0) + 40
    a[..., 0] = np.where(edge, np.minimum(r, lim), r)
    a[..., 2] = np.where(edge, np.minimum(b, lim), b)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
    out.putalpha(al)
    out = out.crop(out.getbbox())
    out.save(OUT + r"\salao-" + t + ".webp", quality=92)
    print(t, out.size)
    sheet.alpha_composite(out.resize((out.width, out.height)), (i * 420 + (420 - out.width) // 2, 420 - out.height - 5))
sheet.save(r"C:\Users\Cliente\AppData\Local\Temp\claude\halls_check.png")
