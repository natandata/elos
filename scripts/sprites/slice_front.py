"""Jogador de frente: fatia uma faixa de N quadros (Gemini) e gera o atlas de máscaras por papel, na MESMA escala dos outros sprites.
Uso: python scripts/sprites/slice_front.py <faixa.png> <nome> <quadros> [--maxy 0.76] [--ref]
Saída: public/arenasoccer/sprites/<nome>-mask.png (11 faixas de papéis empilhadas) + caixa do cabelo em sprite-meta.json."""
import sys, os, json
import cv2
import numpy as np
from PIL import Image

ROLES = {"skin": 1, "skinShade": 2, "hair": 3, "shirt": 4, "shirtShade": 5, "shorts": 6, "socks": 7, "boots": 8, "outline": 9, "tear": 10, "accent": 11}
NROLE = 11
PALETTE = {
    (198, 134, 66): "skin", (141, 85, 36): "skinShade", (204, 204, 204): "shirt", (153, 153, 153): "shirtShade", (102, 102, 102): "shorts",
    (255, 255, 255): "socks", (27, 27, 27): "dark", (0, 0, 0): "dark",
    (96, 165, 250): "tear", (59, 130, 246): "tear", (147, 197, 253): "tear", (14, 165, 233): "tear",
    (250, 204, 21): "accent", (234, 179, 8): "accent", (253, 224, 71): "accent",
}
SCALE = 0.30  # pixels do sprite por pixel da captura (jogador em pé ~220 px na captura => ~66 px)


def key_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 170) & (b > 170) & (g < 110)


def main():
    src, name, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
    maxy = float(sys.argv[sys.argv.index("--maxy") + 1]) if "--maxy" in sys.argv else 1.0
    is_ref = "--ref" in sys.argv
    im = np.array(Image.open(src).convert("RGB"))
    H, W = im.shape[:2]
    # ignora a moldura arredondada escura nas bordas e o que passar de maxy
    fg = ~key_mask(im)
    fg[: 6, :] = False; fg[-6:, :] = False; fg[:, :6] = False; fg[:, -6:] = False
    fg[int(H * maxy):, :] = False
    # só os bonecos: tira o que encosta nas bordas (cantos arredondados da moldura) e migalhas
    nlab, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(fg.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2), connectivity=8)
    keep = np.zeros_like(fg)
    for k in range(1, nlab):
        x, y, w, h, a = st[k]
        if a < 400 or x <= 2 or y <= 2 or x + w >= W - 2 or y + h >= H - 2:
            continue
        keep |= (lab == k)
    fg &= keep
    # só vale o que está perto do magenta: tira a moldura (cantos pretos)
    fw = W / n
    frames = []
    for i in range(n):
        x0, x1 = int(i * fw), int((i + 1) * fw)
        m = fg[:, x0:x1].copy()
        ys, xs = np.nonzero(m)
        if len(ys) == 0:
            frames.append(None); continue
        frames.append((x0, int(ys.min()), int(ys.max()) + 1, int(xs.min()) + x0, int(xs.max()) + 1 + x0))
    live = [f for f in frames if f]
    figH = max(f[2] - f[1] for f in live)
    cell_h = int(np.ceil(figH * SCALE)) + 2
    cell_w = int(np.ceil(max(f[4] - f[3] for f in live) * SCALE)) + 6
    cell_w += cell_w % 2
    sheet = np.zeros((cell_h, cell_w * n), np.uint8)
    meta = []
    for i, f in enumerate(frames):
        if not f:
            meta.append([0, 0, 0, 0]); continue
        x0, top, bot, lx, rx = f
        sub = fg[top:bot, x0:int((i + 1) * fw)]
        rgb = im[top:bot, x0:int((i + 1) * fw)]
        h, w = sub.shape
        # centro e topo da cabeça (cabelo = escuros no alto da cabeça, perto do centro)
        ys, xs = np.nonzero(sub)
        fcx = (xs.min() + xs.max()) / 2
        lum = rgb.sum(axis=2)
        dark = sub & (lum < 190)
        near = dark & (np.abs(np.arange(w)[None, :] - fcx) < 30)
        hy = np.nonzero(near.any(axis=1))[0]
        head_top = int(hy.min()) if len(hy) else 0
        roles = np.zeros((h, w), np.uint8)
        ref_ok = is_ref
        for y, x in zip(*np.nonzero(sub)):
            p = rgb[y, x].astype(int)
            best, bd = None, 1e9
            for refc, role in PALETTE.items():
                d = (p[0] - refc[0]) ** 2 + (p[1] - refc[1]) ** 2 + (p[2] - refc[2]) ** 2
                if d < bd:
                    best, bd = role, d
            if best == "dark":
                if head_top <= y <= head_top + 15 and abs(x - fcx) < 34:
                    best = "hair"
                elif y > h * 0.9:
                    best = "boots"
                else:
                    best = "outline"
            if is_ref and best in ("shirt", "shirtShade", "shorts", "socks"):
                best = "outline"
            if is_ref and best == "boots":
                best = "outline"
            roles[y, x] = ROLES[best]
        # reduz
        nh, nw = max(1, round(h * SCALE)), max(1, round(w * SCALE))
        ri = Image.fromarray(roles).resize((nw, nh), Image.NEAREST)
        small = np.array(ri)
        ox = i * cell_w + (cell_w - nw) // 2
        oy = cell_h - nh - 1
        sheet[oy:oy + nh, ox:ox + nw] = np.where(small > 0, small, sheet[oy:oy + nh, ox:ox + nw])
        hb = np.argwhere(small == ROLES["hair"])
        meta.append([int(hb[:, 1].min() + ox - i * cell_w), int(hb[:, 0].min() + oy), int(hb[:, 1].max() + 1 + ox - i * cell_w), int(hb[:, 0].max() + 1 + oy)] if len(hb) else [0, 0, 0, 0])
    out = Image.new("RGBA", (cell_w * n, cell_h * NROLE), (0, 0, 0, 0))
    op = out.load()
    for y in range(cell_h):
        for x in range(cell_w * n):
            r = int(sheet[y, x])
            if r:
                op[x, (r - 1) * cell_h + y] = (255, 255, 255, 255)
    os.makedirs("public/arenasoccer/sprites", exist_ok=True)
    out.save(f"public/arenasoccer/sprites/{name}-mask.png")
    mp = "src/lib/arenasoccer/data/sprite-meta.json"
    mt = json.load(open(mp)) if os.path.exists(mp) else {}
    mt[name] = meta
    json.dump(mt, open(mp, "w"), separators=(",", ":"))
    print(f"{name}: {n} quadros de {cell_w}x{cell_h}")


main()
