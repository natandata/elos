"""Goleiro de frente: recorta as poses (blocos conectados) da imagem capturada e gera o atlas de máscaras por papel.
Uso: python scripts/sprites/slice_keeper.py <imagem.png>   ->  public/arenasoccer/sprites/keeper.png + keeper-mask.png e meta."""
import sys, os, json
import cv2, numpy as np
from PIL import Image

ROLES = {"skin": 1, "skinShade": 2, "hair": 3, "shirt": 4, "shirtShade": 5, "shorts": 6, "socks": 7, "boots": 8, "outline": 9}
PALETTE = {(198, 134, 66): "skin", (141, 85, 36): "skinShade", (204, 204, 204): "shirt", (153, 153, 153): "shirtShade", (102, 102, 102): "shorts", (255, 255, 255): "socks", (20, 20, 20): "dark"}
SCALE = 0.43
CW, CH = 92, 82
# pose -> (caixa do bloco, caixa da cabeça), na ordem: guarda, passo, pulo, voo, caído 1, caído 2, ajoelhado
POSES = [
    ((7, 20, 111, 162), (30, 15, 92, 78)),
    ((117, 20, 250, 162), (148, 15, 222, 82)),
    ((242, 6, 394, 184), (298, 15, 372, 95)),
    ((358, 30, 559, 146), (468, 40, 548, 118)),
    ((30, 223, 219, 313), (150, 215, 225, 288)),
    ((259, 221, 450, 314), (380, 213, 455, 288)),
    ((445, 167, 545, 313), (462, 162, 546, 238)),
]


def main():
    src = sys.argv[1]
    bgr = cv2.imread(src)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    key = (r > 200) & (b > 200) & (g < 110)
    fg = (~key).astype(np.uint8)
    fg[:3] = 0; fg[-3:] = 0; fg[:, :3] = 0; fg[:, -3:] = 0
    d = cv2.dilate(fg, np.ones((3, 3), np.uint8), iterations=2)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(d, connectivity=8)
    out = Image.new("RGBA", (CW * len(POSES), CH), (0, 0, 0, 0))
    heads = []
    for i, ((x0, y0, x1, y1), (hx0, hy0, hx1, hy1)) in enumerate(POSES):
        # bloco que contém o centro da caixa
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        # procura o rótulo dentro da caixa com maior área
        sub = lab[y0:y1, x0:x1]
        ids, cnt = np.unique(sub[sub > 0], return_counts=True)
        comp = ids[np.argmax(cnt)]
        mask = (lab == comp) & (fg > 0)
        # papel de cada pixel
        role = np.zeros(mask.shape, np.uint8)
        ys, xs = np.nonzero(mask)
        skin_mask = np.zeros(mask.shape, bool)
        classes = {}
        for y, x in zip(ys, xs):
            p = rgb[y, x]
            best, bd = None, 1e9
            for ref, name in PALETTE.items():
                dd = sum((int(a) - int(c)) ** 2 for a, c in zip(p, ref))
                if dd < bd:
                    best, bd = name, dd
            classes[(y, x)] = best
            if best in ("skin", "skinShade"):
                skin_mask[y, x] = True
        near_skin = cv2.dilate(skin_mask.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        for (y, x), name in classes.items():
            if name == "dark":
                inhead = hx0 <= x < hx1 and hy0 <= y < hy1
                name = "hair" if inhead and not near_skin[y, x] else ("boots" if y > y0 + (y1 - y0) * 0.8 and not inhead else "outline")
            role[y, x] = ROLES[name]
        # recorta o bloco, reduz e centraliza no fundo da célula
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = role[by0:by1, bx0:bx1]
        h, w = crop.shape
        nw, nh = max(1, round(w * SCALE)), max(1, round(h * SCALE))
        small = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_NEAREST)
        # nearest pode perder o contorno fino; tudo bem
        ox = i * CW + (CW - nw) // 2
        oy = CH - nh - 1
        px = out.load()
        hb = [999, 999, 0, 0]
        for yy in range(nh):
            for xx in range(nw):
                v = int(small[yy, xx])
                if v:
                    px[ox + xx, oy + yy] = (v, 0, 0, 255)
                    if v == ROLES["hair"]:
                        hb = [min(hb[0], ox - i * CW + xx), min(hb[1], oy + yy), max(hb[2], ox - i * CW + xx + 1), max(hb[3], oy + yy + 1)]
        heads.append(hb if hb[2] else [0, 0, 0, 0])
    os.makedirs("public/arenasoccer/sprites", exist_ok=True)
    out.save("public/arenasoccer/sprites/keeper.png")
    H = CH
    atlas = Image.new("RGBA", (CW * len(POSES), H * 9), (0, 0, 0, 0))
    op, ap = out.load(), atlas.load()
    for y in range(H):
        for x in range(CW * len(POSES)):
            v = op[x, y]
            if v[3] and v[0]:
                ap[x, (v[0] - 1) * H + y] = (255, 255, 255, 255)
    atlas.save("public/arenasoccer/sprites/keeper-mask.png")
    mp = "src/lib/arenasoccer/data/sprite-meta.json"
    meta = json.load(open(mp))
    meta["keeper"] = heads
    json.dump(meta, open(mp, "w"), separators=(",", ":"))
    print("ok", out.size, heads)


main()
