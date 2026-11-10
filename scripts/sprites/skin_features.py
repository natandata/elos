"""Mede a pele de cada busto (só pixels de pele do miolo do rosto, em Lab) e salva design/sprites-pilot/skin.json: { id: [L, a, b] }.
Depois `skin_sheet.py` ordena por L para eu conferir a olho onde cada tom começa."""
import json, os
import cv2
import numpy as np

SRC = "public/arenasoccer/players"
cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def measure(path):
    img = cv2.imread(path)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(w // 4, w // 4))
    if len(faces):
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    else:
        fw, fh = int(w * 0.5), int(h * 0.42)
        x, y = (w - fw) // 2, int(h * 0.22)
    # bochechas, testa e nariz (evita olhos, boca, barba e cabelo)
    regions = [
        (x + int(fw * 0.18), y + int(fh * 0.50), x + int(fw * 0.40), y + int(fh * 0.72)),  # bochecha esquerda
        (x + int(fw * 0.60), y + int(fh * 0.50), x + int(fw * 0.82), y + int(fh * 0.72)),  # bochecha direita
        (x + int(fw * 0.30), y + int(fh * 0.12), x + int(fw * 0.70), y + int(fh * 0.28)),  # testa
    ]
    px = []
    for x0, y0, x1, y1 in regions:
        px.append(img[max(0, y0):y1, max(0, x0):x1].reshape(-1, 3))
    px = np.concatenate(px)
    ycc = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_BGR2YCrCb).reshape(-1, 3)
    mask = (ycc[:, 1] > 128) & (ycc[:, 1] < 180) & (ycc[:, 2] > 70) & (ycc[:, 2] < 135) & (ycc[:, 0] > 20)
    if mask.sum() < 20:
        mask = ycc[:, 0] > 20
    sel = px[mask]
    lab = cv2.cvtColor(sel.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(float)
    # tira brilho (flash) e sombra: fica com o miolo da distribuição de luminosidade
    lo, hi = np.percentile(lab[:, 0], [20, 80])
    core = lab[(lab[:, 0] >= lo) & (lab[:, 0] <= hi)]
    L, a, b = core.mean(axis=0)
    return [round(L * 100 / 255, 1), round(a - 128, 1), round(b - 128, 1)]


def main():
    out = {}
    for f in sorted(os.listdir(SRC)):
        if f.endswith(".jpg"):
            out[f[:-4]] = measure(os.path.join(SRC, f))
    json.dump(out, open("design/sprites-pilot/skin.json", "w"), separators=(",", ":"))
    Ls = np.array([v[0] for v in out.values()])
    print(len(out), "L min/med/max", Ls.min(), np.median(Ls), Ls.max())


main()
