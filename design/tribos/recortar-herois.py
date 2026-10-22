from PIL import Image, ImageFilter
import numpy as np, os

SRC = r"C:\dev\elos\design\tribos\herois-frente-costas.webp"
OUT = r"C:\dev\elos\public\tribos\herois"
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)

BOXES = {
    "davi": (18, 28, 118, 182),
    "golias": (255, 4, 368, 182),
    "moises": (448, 18, 560, 182),
    "sansao": (638, 28, 738, 182),
    "salomao": (815, 18, 928, 182),
    "elias": (28, 213, 142, 372),
    "josue": (250, 213, 382, 372),
    "ester": (452, 213, 562, 372),
    "debora": (813, 213, 928, 372),
    "gideao": (33, 398, 148, 557),
    "pedro": (232, 398, 358, 557),
    "miguel": (428, 393, 590, 557),
    "daniel": (268, 583, 392, 737),
    "joao": (638, 583, 745, 737),
    "abraao": (803, 583, 928, 737),
}

def matte(box):
    x0, y0, x1, y1 = box
    c = a[y0:y1, x0:x1].copy()
    h, w, _ = c.shape
    border = np.concatenate([c[:3].reshape(-1, 3), c[-3:].reshape(-1, 3), c[:, :3].reshape(-1, 3), c[:, -3:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.sqrt(((c - bg) ** 2).sum(2))
    mask = d < 30
    vis = np.zeros_like(mask)
    stack = [(y, x) for y in range(h) for x in (0, w - 1)] + [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or vis[y, x] or not mask[y, x]:
            continue
        vis[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    fg = ~vis
    lab = np.zeros((h, w), np.int32)
    comps = []
    n = 0
    for y in range(h):
        for x in range(w):
            if fg[y, x] and lab[y, x] == 0:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                pts = []
                while st:
                    yy, xx = st.pop()
                    pts.append((yy, xx))
                    for ny, nx in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = n
                            st.append((ny, nx))
                comps.append(pts)
    comps.sort(key=len, reverse=True)
    keep = np.zeros((h, w), bool)
    main = comps[0]
    ys = [p[0] for p in main]; xs = [p[1] for p in main]
    bx0, bx1, by0, by1 = min(xs) - 14, max(xs) + 14, min(ys) - 14, max(ys) + 14
    for pts in comps:
        if len(pts) < 12:
            continue
        py = [p[0] for p in pts]; px = [p[1] for p in pts]
        touches = min(px) <= 0 or min(py) <= 0 or max(px) >= w - 1 or max(py) >= h - 1
        if pts is not main and touches:
            continue
        if pts is main or (min(px) >= bx0 and max(px) <= bx1 and min(py) >= by0 and max(py) <= by1):
            for (yy, xx) in pts:
                keep[yy, xx] = True
    alpha = Image.fromarray((keep * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = Image.fromarray(c.astype(np.uint8)).convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())

names = list(BOXES)
sheet = Image.new("RGBA", (5 * 200, 3 * 220), (70, 50, 40, 255))
for i, n in enumerate(names):
    o = matte(BOXES[n])
    o = o.resize((int(o.width * 2), int(o.height * 2)), Image.LANCZOS)
    o.save(os.path.join(OUT, n + ".webp"), quality=92)
    print(n, o.size)
    t = o.copy(); t.thumbnail((190, 210))
    sheet.alpha_composite(t, ((i % 5) * 200 + 5, (i // 5) * 220 + 5))
sheet.save(r"C:\Users\Cliente\AppData\Local\Temp\claude\herois_check.png")
