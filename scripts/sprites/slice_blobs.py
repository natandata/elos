"""Poses soltas (grade irregular): recorta cada boneco (bloco conectado), ordena por linha e depois por x, e gera o atlas de papéis.
Uso: python scripts/sprites/slice_blobs.py <imagem.png> <nome> <altura_do_primeiro_em_px_da_captura>"""
import sys, os, json
import cv2
import numpy as np
from PIL import Image

sys.argv_backup = list(sys.argv)
ROLES = {"skin": 1, "skinShade": 2, "hair": 3, "shirt": 4, "shirtShade": 5, "shorts": 6, "socks": 7, "boots": 8, "outline": 9, "tear": 10, "accent": 11}
PALETTE = {(198, 134, 66): "skin", (141, 85, 36): "skinShade", (204, 204, 204): "shirt", (153, 153, 153): "shirtShade", (102, 102, 102): "shorts", (255, 255, 255): "socks", (27, 27, 27): "dark", (0, 0, 0): "dark", (96, 165, 250): "tear", (59, 130, 246): "tear", (147, 197, 253): "tear", (250, 204, 21): "accent"}


def main():
    src, name, ref_h = sys.argv[1], sys.argv[2], float(sys.argv[3])
    im = np.array(Image.open(src).convert("RGB"))
    H, W = im.shape[:2]
    r, g, b = im[..., 0].astype(int), im[..., 1].astype(int), im[..., 2].astype(int)
    fg = ~((r > 170) & (b > 170) & (g < 110))
    # moldura arredondada da captura: tira os cantos (fora do arco de raio 30) e uma faixa fina nas bordas
    yy, xx = np.mgrid[0:H, 0:W]
    R = 30
    for cx, cy in ((R, R), (W - 1 - R, R), (R, H - 1 - R), (W - 1 - R, H - 1 - R)):
        inside_sq = (abs(xx - cx) <= R) & (abs(yy - cy) <= R) & ((xx < R) | (xx > W - 1 - R)) & ((yy < R) | (yy > H - 1 - R))
        fg &= ~(inside_sq & ((xx - cx) ** 2 + (yy - cy) ** 2 > (R - 1) ** 2) & (((xx - cx) * (1 if cx < W / 2 else -1) < 0) | True) & False)
    corner = np.zeros((H, W), bool)
    for sx, sy in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
        cx = R if sx == 0 else W - 1 - R
        cy = R if sy == 0 else H - 1 - R
        sq = (abs(xx - sx) <= R) & (abs(yy - sy) <= R)
        corner |= sq & (((xx - cx) ** 2 + (yy - cy) ** 2) > R * R)
    fg &= ~corner
    fg[:2, :] = False; fg[-2:, :] = False; fg[:, :2] = False; fg[:, -2:] = False
    nlab, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(fg.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2), connectivity=8)
    comps = []
    for k in range(1, nlab):
        x, y, w, h, a = st[k]
        touches = (x <= 2) + (y <= 2) + (x + w >= W - 2) + (y + h >= H - 2)
        if a < 600 or touches >= 2:  # cantos arredondados da moldura tocam duas bordas
            continue
        comps.append((k, x, y, w, h))
    comps.sort(key=lambda c: (round((c[2] + c[4] / 2) / (H / 2.2)), c[1]))
    sc = 66.0 / ref_h
    pieces = []
    for k, x, y, w, h in comps:
        m = (lab == k) & fg
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub, rgb = m[y0:y1, x0:x1], im[y0:y1, x0:x1]
        hh, ww = sub.shape
        lum = rgb.sum(axis=2)
        dark = sub & (lum < 190)
        # topo da cabeça = o escuro mais alto (pose deitada: o cabelo está onde o escuro encosta no rosto, então aproxima)
        hy = np.nonzero(dark.any(axis=1))[0]
        head_top = int(hy.min()) if len(hy) else 0
        dxs = np.nonzero(dark[head_top:head_top + 6].any(axis=0))[0]
        hcx = float(dxs.mean()) if len(dxs) else ww / 2
        roles = np.zeros((hh, ww), np.uint8)
        for yy, xx in zip(*np.nonzero(sub)):
            p = rgb[yy, xx].astype(int)
            best, bd = None, 1e9
            for refc, role in PALETTE.items():
                d = (p[0] - refc[0]) ** 2 + (p[1] - refc[1]) ** 2 + (p[2] - refc[2]) ** 2
                if d < bd:
                    best, bd = role, d
            if best == "dark":
                best = "hair" if (head_top <= yy <= head_top + 13 and abs(xx - hcx) < 32) else ("boots" if yy > hh * 0.92 else "outline")
            roles[yy, xx] = ROLES[best]
        nh, nw = max(1, round(hh * sc)), max(1, round(ww * sc))
        pieces.append(np.array(Image.fromarray(roles).resize((nw, nh), Image.NEAREST)))
    cell_h = max(p.shape[0] for p in pieces) + 2
    cell_w = max(p.shape[1] for p in pieces) + 6
    cell_w += cell_w % 2
    n = len(pieces)
    sheet = np.zeros((cell_h, cell_w * n), np.uint8)
    meta = []
    for i, p in enumerate(pieces):
        ox, oy = i * cell_w + (cell_w - p.shape[1]) // 2, cell_h - p.shape[0] - 1
        sheet[oy:oy + p.shape[0], ox:ox + p.shape[1]] = p
        hb = np.argwhere(p == ROLES["hair"])
        meta.append([int(hb[:, 1].min() + ox - i * cell_w), int(hb[:, 0].min() + oy), int(hb[:, 1].max() + 1 + ox - i * cell_w), int(hb[:, 0].max() + 1 + oy)] if len(hb) else [0, 0, 0, 0])
    out = Image.new("RGBA", (cell_w * n, cell_h * 11), (0, 0, 0, 0))
    op = out.load()
    for y in range(cell_h):
        for x in range(cell_w * n):
            v = int(sheet[y, x])
            if v:
                op[x, (v - 1) * cell_h + y] = (255, 255, 255, 255)
    out.save(f"public/arenasoccer/sprites/{name}-mask.png")
    mp = "src/lib/arenasoccer/data/sprite-meta.json"
    mt = json.load(open(mp))
    mt[name] = meta
    json.dump(mt, open(mp, "w"), separators=(",", ":"))
    print(name, n, "poses", cell_w, "x", cell_h)


main()
