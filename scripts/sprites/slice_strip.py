"""Fatia uma faixa de animação gerada pelo Gemini em quadros e converte as cores em "papéis" recoloríveis.

Uso:  python scripts/sprites/slice_strip.py <faixa.png> <nome> <quadros> [--height 64]
Saída: public/arenasoccer/sprites/<nome>.png  (uma linha, `quadros` células iguais; a cor de cada pixel é o papel: R = id do papel)
"""
import sys, os
from PIL import Image

ROLES = {"skin": 1, "skinShade": 2, "hair": 3, "shirt": 4, "shirtShade": 5, "shorts": 6, "socks": 7, "boots": 8, "outline": 9}
PALETTE = {  # cor de referência pedida ao Gemini -> papel
    (198, 134, 66): "skin", (141, 85, 36): "skinShade", (27, 27, 27): "dark", (204, 204, 204): "shirt", (153, 153, 153): "shirtShade",
    (102, 102, 102): "shorts", (255, 255, 255): "socks", (0, 0, 0): "dark",
}
CELL_W_RATIO = 0.75


def is_key(p):
    r, g, b = p[:3]
    return r > 200 and b > 200 and g < 90


def main():
    src, name, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
    height = int(sys.argv[sys.argv.index("--height") + 1]) if "--height" in sys.argv else 64
    im = Image.open(src).convert("RGB")
    W, H = im.size
    fw = W / n
    px = im.load()
    # caixa de cada quadro (sem o magenta)
    boxes = []
    for i in range(n):
        x0, x1 = int(i * fw), int((i + 1) * fw)
        xs, ys = [], []
        for y in range(H):
            for x in range(x0, x1):
                if not is_key(px[x, y]):
                    xs.append(x)
                    ys.append(y)
        boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    top = min(b[1] for b in boxes)
    bottom = max(b[3] for b in boxes)
    scale = height / (bottom - top)
    cw = int(max((b[2] - b[0]) for b in boxes) * scale) + 4
    cw += cw % 2
    out = Image.new("RGBA", (cw * n, height + 2), (0, 0, 0, 0))
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        # centraliza pelo meio do quadro original, pés na mesma linha (base comum)
        cx = (x0 + x1) / 2
        # só o que pertence a este quadro: o resto da faixa vira fundo (sem pedaços do vizinho)
        pad = int(cw / scale)
        band = Image.new("RGB", (W + 2 * pad, H), (253, 1, 250))
        bx0, bx1 = int(i * fw), int((i + 1) * fw)
        band.paste(im.crop((bx0, 0, bx1, H)), (bx0 + pad, 0))
        crop = band.crop((int(cx - cw / scale / 2) + pad, top, int(cx + cw / scale / 2) + pad, bottom))
        crop = crop.resize((cw, height), Image.NEAREST)
        cp = crop.load()
        # papéis: preto vira cabelo (cabeça), chuteira (pés) ou contorno
        for y in range(height):
            for x in range(cw):
                p = cp[x, y]
                if is_key(p) or (p[0] > 150 and p[2] > 150 and p[1] < 140):
                    continue
                best, bd = None, 1e9
                for ref, role in PALETTE.items():
                    d = sum((a - b) ** 2 for a, b in zip(p, ref))
                    if d < bd:
                        best, bd = role, d
                role = best
                if role in ("shirt", "shirtShade") and y > height * 0.62:
                    role = "socks"
                if role == "socks" and y < height * 0.5:
                    role = "hair" if y < height * 0.28 else "shirt"
                if role == "shorts" and y < height * 0.4:
                    role = "hair" if y < height * 0.28 else "outline"
                if role == "dark":
                    role = "hair" if y < height * 0.28 else "boots" if y > height * 0.9 else "outline"
                out.putpixel((i * cw + x, y + 1), (ROLES[role], 0, 0, 255))
    dst = os.path.join("public", "arenasoccer", "sprites", f"{name}.png")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)
    # caixa do cabelo em cada quadro (para o jogo desenhar coque, volume e cabelo comprido no lugar certo)
    import json
    meta_path = os.path.join("src", "lib", "arenasoccer", "data", "sprite-meta.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    boxes_h = []
    po = out.load()
    for i in range(n):
        xs, ys = [], []
        for y in range(height + 2):
            for x in range(cw):
                px_ = po[i * cw + x, y]
                if px_[3] and px_[0] == ROLES["hair"]:
                    xs.append(x)
                    ys.append(y)
        boxes_h.append([min(xs), min(ys), max(xs) + 1, max(ys) + 1] if xs else [0, 0, 0, 0])
    meta[name] = boxes_h
    json.dump(meta, open(meta_path, "w"), separators=(",", ":"))
    # atlas de máscaras (uma faixa por papel, branco onde o papel existe): o jogo recolore com composição de canvas, sem ler pixels
    H = height + 2
    atlas = Image.new("RGBA", (cw * n, H * 11), (0, 0, 0, 0))
    op, ap = out.load(), atlas.load()
    for y in range(H):
        for x in range(cw * n):
            r = op[x, y][0] if op[x, y][3] else 0
            if r:
                ap[x, (r - 1) * H + y] = (255, 255, 255, 255)
    atlas.save(os.path.join("public", "arenasoccer", "sprites", f"{name}-mask.png"))
    print(f"{dst}: {n} quadros de {cw}x{height + 2}")


main()
