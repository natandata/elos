"""Taça: tira o magenta e salva os 4 quadros com fundo transparente (cores originais)."""
import cv2, numpy as np
from PIL import Image
im = np.array(Image.open("design/sprites-pilot/front/trophy.png").convert("RGB"))
H, W = im.shape[:2]
r, g, b = im[..., 0].astype(int), im[..., 1].astype(int), im[..., 2].astype(int)
key = (r > 170) & (b > 170) & (g < 120)
fg = ~key
fg[:6] = False; fg[-6:] = False; fg[:, :6] = False; fg[:, -6:] = False
N = 4
fw = W / N
cells = []
for i in range(N):
    x0, x1 = int(i * fw), int((i + 1) * fw)
    sub = fg[:, x0:x1]
    ys, xs = np.nonzero(sub)
    cells.append((x0 + xs.min(), ys.min(), xs.max() + 1 + x0, ys.max() + 1))
S = 0.42
cw = int(max(c[2] - c[0] for c in cells) * S) + 4
ch = int(max(c[3] - c[1] for c in cells) * S) + 2
out = Image.new("RGBA", (cw * N, ch), (0, 0, 0, 0))
for i, (x0, y0, x1, y1) in enumerate(cells):
    rgb = im[y0:y1, x0:x1]
    alpha = (fg[y0:y1, x0:x1]).astype(np.uint8) * 255
    crop = Image.fromarray(np.dstack([rgb, alpha])).resize((max(1, int((x1 - x0) * S)), max(1, int((y1 - y0) * S))), Image.NEAREST)
    out.paste(crop, (i * cw + (cw - crop.width) // 2, ch - crop.height - 1), crop)
out.save("public/arenasoccer/sprites/trophy.png")
print(out.size)
