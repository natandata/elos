from PIL import Image
import numpy as np, os

CAMPO = r"C:\dev\elos\public\arena\campo"
OUT = r"C:\dev\elos\public\tribos\obras"
os.makedirs(OUT, exist_ok=True)

def load(n):
    return np.asarray(Image.open(os.path.join(CAMPO, n + ".webp")).convert("RGBA")).astype(np.float32) / 255

def rgb2hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    h = np.where(d < 1e-6, 0, h)
    return h % 360, s, mx

def hsv2rgb(h, s, v):
    h = (h % 360) / 60
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,), np.float32)
    opts = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    for k, (r, g, b) in enumerate(opts):
        m = i == k
        out[..., 0] = np.where(m, r, out[..., 0]); out[..., 1] = np.where(m, g, out[..., 1]); out[..., 2] = np.where(m, b, out[..., 2])
    return out

def save(a, name, maxw=420):
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGBA")
    if img.width > maxw:
        img = img.resize((maxw, int(img.height * maxw / img.width)), Image.LANCZOS)
    img.save(os.path.join(OUT, name + ".webp"), quality=90)
    print(name, img.size)

def hue_shift(a, lo, hi, target, smin=0.25, sgain=1.0, vgain=1.0):
    h, s, v = rgb2hsv(a[..., :3])
    sel = ((h >= lo) & (h <= hi) & (s > smin)).astype(np.float32)
    sel = np.clip(sel * np.clip((s - smin) / 0.15, 0, 1), 0, 1)
    new = hsv2rgb(np.full_like(h, target), np.clip(s * sgain, 0, 1), np.clip(v * vgain, 0, 1))
    out = a.copy()
    out[..., :3] = a[..., :3] * (1 - sel[..., None]) + new * sel[..., None]
    return out

def gradient_map(a, stops, mix=1.0):
    lum = a[..., :3] @ np.array([0.3, 0.59, 0.11], np.float32)
    lum = np.clip((lum - 0.12) / 0.8, 0, 1)
    pos = np.array([s[0] for s in stops]); cols = np.array([s[1] for s in stops], np.float32) / 255
    mapped = np.stack([np.interp(lum, pos, cols[:, c]) for c in range(3)], axis=-1)
    out = a.copy()
    # só colore o que é pedra (pouco saturado); mantém verde do capim
    h, s, v = rgb2hsv(a[..., :3])
    stone = np.clip(1 - s * 2.4, 0, 1)[..., None]
    out[..., :3] = a[..., :3] * (1 - mix * stone) + mapped * (mix * stone)
    return out

# --- Salão da Tribo: a torre-rei da Arena nas cores de cada tribo
blue = load("rei-azul")
save(hue_shift(blue, 190, 260, 46, smin=0.3, sgain=1.05, vgain=1.15), "salao-feras")
save(hue_shift(blue, 190, 260, 138, smin=0.3, sgain=0.95, vgain=0.95), "salao-bravos")
save(load("rei-vermelho"), "salao-reliquias")

# --- Mina de Ouro: montinho de pedras viradas minério de ouro
gold = [(0, (70, 46, 6)), (0.35, (176, 118, 14)), (0.7, (244, 188, 38)), (1, (255, 244, 170))]
save(gradient_map(load("pedras"), gold, 0.92), "mina-ouro")

# --- Poço de Maná: rochedo virado cristal azul
mana = [(0, (8, 28, 78)), (0.4, (28, 96, 220)), (0.75, (90, 190, 255)), (1, (225, 248, 255))]
save(gradient_map(load("rochedo"), mana, 0.95), "poco-mana")

# --- Cofre de Ouro: sacos cheios (tom dourado) e Reservatório de Maná: lagoa azul
sacos = gradient_map(load("quartel-sacos"), [(0, (60, 40, 10)), (0.5, (205, 150, 30)), (1, (255, 232, 120))], 0.85)
save(sacos, "cofre-ouro")
save(hue_shift(load("vitoria-regia"), 60, 200, 196, smin=0.2, sgain=1.0, vgain=1.0), "reservatorio-mana")

# --- Cabana do Obreiro: barraca e bandeira na cor da tribo
tent = load("quartel-barraca")
save(hue_shift(tent, 40, 170, 36, smin=0.15, sgain=0.8, vgain=1.25), "cabana-feras")
save(tent, "cabana-bravos")
save(hue_shift(tent, 40, 170, 6, smin=0.15, sgain=1.2, vgain=1.0), "cabana-reliquias")
flag = load("quartel-bandeira")
save(hue_shift(hue_shift(flag, 340, 360, 46, smin=0.3), 0, 25, 46, smin=0.3), "bandeira-feras", 200)
save(hue_shift(hue_shift(flag, 340, 360, 138, smin=0.3), 0, 20, 138, smin=0.3), "bandeira-bravos", 200)
save(flag, "bandeira-reliquias", 200)

# conferência
names = ["salao-feras", "salao-bravos", "salao-reliquias", "mina-ouro", "poco-mana", "cofre-ouro", "reservatorio-mana", "cabana-feras", "cabana-bravos", "cabana-reliquias", "bandeira-feras", "bandeira-bravos"]
sheet = Image.new("RGBA", (4 * 260, 3 * 260), (110, 150, 100, 255))
for i, n in enumerate(names):
    im = Image.open(os.path.join(OUT, n + ".webp")).convert("RGBA")
    im.thumbnail((250, 250))
    sheet.paste(im, ((i % 4) * 260 + 5, (i // 4) * 260 + 5), im)
sheet.save(r"C:\Users\Cliente\AppData\Local\Temp\claude\obras_check.png")
