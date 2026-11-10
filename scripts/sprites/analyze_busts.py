"""Lê o busto de cada jogador (public/arenasoccer/players/*.jpg) e anota tom de pele e cabelo, só pelo que se vê por trás da cabeça:
cor do cabelo, careca/raspado, volume (crespo/cheio) e cabelo comprido. Sem rosto, sem identificar pessoas: só cores e proporções.

Uso: python scripts/sprites/analyze_busts.py   ->  src/lib/arenasoccer/data/looks.json  { "<id foto>": [pele 0-5, cabelo cor, estilo] }
"""
import json, os, sys
import cv2
import numpy as np

SRC = "public/arenasoccer/players"
OUT = "src/lib/arenasoccer/data/looks.json"
cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# 0 muito clara .. 5 muito escura (pela luminância mediana da pele)
SKIN_CUTS = [185, 160, 135, 115, 100]
HAIR_COLORS = ["preto", "castanho", "loiro", "ruivo", "grisalho", "careca"]
STYLES = ["raspado", "curto", "cheio", "longo"]


def lum(rgb):
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b


def analyze(path):
    img = cv2.imread(path)
    if img is None:
        return None
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(w // 4, w // 4))
    if len(faces):
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    else:  # busto centralizado: rosto aproximado
        fw, fh = int(w * 0.5), int(h * 0.42)
        x, y = (w - fw) // 2, int(h * 0.22)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    # fundo = cantos do topo
    bg = np.median(np.concatenate([rgb[:6, :8].reshape(-1, 3), rgb[:6, -8:].reshape(-1, 3)]), axis=0)
    # pele = miolo do rosto (bochechas e testa), tirando sombras e brilhos
    cx0, cx1 = x + int(fw * 0.25), x + int(fw * 0.75)
    cy0, cy1 = y + int(fh * 0.40), y + int(fh * 0.75)
    patch = rgb[cy0:cy1, cx0:cx1].reshape(-1, 3)
    patch = patch[(patch.mean(axis=1) > 25)]
    skin = np.median(patch, axis=0) if len(patch) else np.array([150, 110, 90], dtype=np.float32)
    skin_tone = sum(lum(skin) < c for c in SKIN_CUTS)
    # cabelo = faixa logo acima da testa
    top = max(0, y - int(fh * 0.28))
    band = rgb[top : max(top + 2, y + int(fh * 0.08)), x + int(fw * 0.15) : x + int(fw * 0.85)].reshape(-1, 3)
    d_bg = np.linalg.norm(band - bg, axis=1)
    d_skin = np.linalg.norm(band - skin, axis=1)
    hair_px = band[(d_bg > 38) & (d_skin > 34)]
    frac_hair = len(hair_px) / max(1, len(band))
    if frac_hair < 0.18:
        color, style = "careca", "raspado"
        hair_rgb = skin
    else:
        hair_rgb = np.median(hair_px, axis=0)
        r, g, b = hair_rgb
        mx, mn = max(hair_rgb), min(hair_rgb)
        v = lum(hair_rgb)
        sat = (mx - mn) / (mx + 1e-6)
        if v > 150 and sat < 0.22:
            color = "grisalho"
        elif v < 62:
            color = "preto"
        elif r > g * 1.35 and r > 110 and sat > 0.45:
            color = "ruivo"
        elif v > 120 and sat > 0.28:
            color = "loiro"
        else:
            color = "castanho"
        # volume: o quanto de cabelo sobe acima da cabeça, em relação ao rosto
        up = rgb[: y + int(fh * 0.1), max(0, x - int(fw * 0.1)) : x + int(fw * 1.1)]
        rows = np.linalg.norm(up - bg, axis=2) > 38
        vol = rows.any(axis=1).sum() / max(1, fh)
        # comprimento: cabelo nas laterais, abaixo da orelha
        side = rgb[y + int(fh * 0.55) : y + int(fh * 1.05), max(0, x - int(fw * 0.12)) : x + int(fw * 0.1)].reshape(-1, 3)
        long_frac = (np.linalg.norm(side - bg, axis=1) > 38).mean() if len(side) else 0
        dark_side = (np.linalg.norm(side - hair_rgb, axis=1) < 45).mean() if len(side) else 0
        if dark_side > 0.55 and long_frac > 0.5:
            style = "longo"
        elif vol > 0.5 and frac_hair > 0.6:
            style = "cheio"
        elif frac_hair < 0.4:
            style = "raspado"
        else:
            style = "curto"
    return [int(skin_tone), HAIR_COLORS.index(color), STYLES.index(style)]


def main():
    out = {}
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".jpg"))
    for i, f in enumerate(files):
        r = analyze(os.path.join(SRC, f))
        if r:
            out[f[:-4]] = r
        if i % 200 == 0:
            print(i, "/", len(files), flush=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), separators=(",", ":"))
    from collections import Counter
    print("pele", sorted(Counter(v[0] for v in out.values()).items()))
    print("cabelo", {HAIR_COLORS[k]: n for k, n in Counter(v[1] for v in out.values()).items()})
    print("estilo", {STYLES[k]: n for k, n in Counter(v[2] for v in out.values()).items()})


main()
