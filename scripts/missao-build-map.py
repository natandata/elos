"""
Missão Madureira: gera o mapa do jogo (public/missao/map.json) a partir de dados abertos.

Fontes (baixe para a pasta indicada em RAW antes de rodar):
  - OpenStreetMap (ODbL, © colaboradores do OpenStreetMap): ruas, trilhos, estação, parque, árvores, torres.
      curl "https://api.openstreetmap.org/api/0.6/map?bbox=-43.3445,-22.8805,-43.3330,-22.8685" -o area.osm
  - Data.Rio / Instituto Pereira Passos (CC BY 4.0): edificações 2013 (com altura) e quadras.
      FeatureServer .../Quadras_Lotes_Edificacoes/FeatureServer/0 (edif_*.json, paginado) e /2 (quadras.json)

Saída em metros, plano local: x = leste, z = sul (no three.js o norte é -z). Origem = a frente da PIB de Madureira.
Uso: python scripts/missao-build-map.py <pasta-raw>
"""
import glob
import json
import math
import os
import sys
import xml.etree.ElementTree as ET

RAW = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "missao", "map.json")

S, W_, N, E = -22.8805, -43.3445, -22.8685, -43.3330
# Origem do plano local (fixa). A igreja é o lote 147622 da Prefeitura (templo grande na R. Andrade Pinto)
LAT0, LON0 = -22.878819, -43.341983
KX = 111320.0 * math.cos(math.radians(LAT0))
KZ = 110540.0


def P(lat, lon):
    return (round((lon - LON0) * KX, 2), round(-(lat - LAT0) * KZ, 2))


X0, Z1 = P(S, W_)
X1, Z0 = P(N, E)


def clip(poly):
    """Recorta um polígono no retângulo do mapa (Sutherland-Hodgman)."""
    def inside(p, e):
        x, z = p
        return [x >= X0, x <= X1, z >= Z0, z <= Z1][e]

    def cut(a, b, e):
        (ax, az), (bx, bz) = a, b
        if e < 2:
            x = X0 if e == 0 else X1
            t = (x - ax) / (bx - ax)
            return (x, az + (bz - az) * t)
        z = Z0 if e == 2 else Z1
        t = (z - az) / (bz - az)
        return (ax + (bx - ax) * t, z)

    out = poly
    for e in range(4):
        if not out:
            break
        src, out = out, []
        for i in range(len(src)):
            a, b = src[i - 1], src[i]
            if inside(b, e):
                if not inside(a, e):
                    out.append(cut(a, b, e))
                out.append(b)
            elif inside(a, e):
                out.append(cut(a, b, e))
    return out


def area(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, z1 = poly[i - 1]
        x2, z2 = poly[i]
        s += x1 * z2 - x2 * z1
    return s / 2


def flat(poly, nd=1):
    out = []
    for x, z in poly:
        out += [round(x, nd), round(z, nd)]
    return out


def dedup(poly):
    out = []
    for p in poly:
        if not out or abs(out[-1][0] - p[0]) > 0.05 or abs(out[-1][1] - p[1]) > 0.05:
            out.append(p)
    if len(out) > 2 and abs(out[0][0] - out[-1][0]) < 0.05 and abs(out[0][1] - out[-1][1]) < 0.05:
        out.pop()
    return out


def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def pip(pt, poly):
    x, z = pt
    c = False
    for i in range(len(poly)):
        x1, z1 = poly[i - 1]
        x2, z2 = poly[i]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1:
            c = not c
    return c


# ------------------------------------------------------------------ Prefeitura: edificações e quadras
KIND = {"A101": 0, "A121": 1, "A103": 0, "A104": 0, "A105": 0, "A106": 0, "A119": 2, "A120": 3, "A122": 4, "H805": 5, "A114": 0}
raw_b = []
for f in sorted(glob.glob(os.path.join(RAW, "edif_*.json"))):
    for ft in json.load(open(f, encoding="utf-8"))["features"]:
        pr = ft["properties"]
        code = pr["Tipo"][:4]
        if code not in KIND:
            continue
        g = ft["geometry"]
        rings = [g["coordinates"][0]] if g["type"] == "Polygon" else [pp[0] for pp in g["coordinates"]]
        for ring in rings:
            poly = dedup([P(lat, lon) for lon, lat in ring])
            if len(poly) < 3:
                continue
            c = centroid(poly)
            if not (X0 <= c[0] <= X1 and Z0 <= c[1] <= Z1):
                continue
            poly = dedup(clip(poly))
            if len(poly) < 3 or abs(area(poly)) < 2:
                continue
            if area(poly) < 0:
                poly.reverse()
            raw_b.append({"poly": poly, "h": float(pr.get("ALTURA") or 0), "base": float(pr.get("BASE") or 0), "k": KIND[code], "code": code})

# chão aproximado: mediana da base das edificações térreas numa grade de 40 m (para achar o que está em cima do telhado)
cells = {}
for b in raw_b:
    if b["code"] == "A101":
        c = centroid(b["poly"])
        cells.setdefault((int(c[0] // 40), int(c[1] // 40)), []).append(b["base"])
ground = {k: sorted(v)[len(v) // 2] for k, v in cells.items()}


def ground_at(c):
    k = (int(c[0] // 40), int(c[1] // 40))
    if k in ground:
        return ground[k]
    near = [v for (i, j), v in ground.items() if abs(i - k[0]) <= 2 and abs(j - k[1]) <= 2]
    return sorted(near)[len(near) // 2] if near else 27.0


bld = []
for b in raw_b:
    c = centroid(b["poly"])
    rel = max(0.0, b["base"] - ground_at(c))
    h = b["h"]
    if b["k"] in (0, 1):
        if h < 2.2:
            h = 3.0 if b["code"] == "A101" else 0
        if h <= 0:
            continue
        lift = rel if rel > 2.5 else 0  # construção em cima de outra (raro): começa no alto
    elif b["k"] == 3:  # marquise: laje fina na altura dada
        lift = 0
        h = min(max(h, 2.8), 4.2)
    elif b["k"] == 2:  # telheiro
        lift = 0
        h = min(max(h, 2.6), 5.0)
    else:  # casa de máquina / caixa d'água: no telhado
        lift = rel if rel > 1 else 0
        h = max(1.5, min(h, 4.0))
        if lift == 0:
            continue
    bld.append({"p": flat(b["poly"]), "h": round(min(h, 60), 1), "k": b["k"], **({"y": round(lift, 1)} if lift else {})})

quadras = []
for ft in json.load(open(os.path.join(RAW, "quadras.json"), encoding="utf-8"))["features"]:
    g = ft["geometry"]
    rings = [g["coordinates"][0]] if g["type"] == "Polygon" else [pp[0] for pp in g["coordinates"]]
    for ring in rings:
        poly = dedup(clip(dedup([P(lat, lon) for lon, lat in ring])))
        if len(poly) >= 3 and abs(area(poly)) > 20:
            if area(poly) < 0:
                poly.reverse()
            quadras.append(flat(poly))

# ------------------------------------------------------------------ OpenStreetMap
root = ET.parse(os.path.join(RAW, "area.osm")).getroot()
nodes = {}
ntags = {}
for n in root.findall("node"):
    nodes[n.get("id")] = (float(n.get("lat")), float(n.get("lon")))
    t = {tg.get("k"): tg.get("v") for tg in n.findall("tag")}
    if t:
        ntags[n.get("id")] = t
ways = {}
for w in root.findall("way"):
    refs = [nd.get("ref") for nd in w.findall("nd")]
    t = {tg.get("k"): tg.get("v") for tg in w.findall("tag")}
    ways[w.get("id")] = (refs, t)


def wpts(refs):
    return [P(*nodes[r]) for r in refs if r in nodes]


def inbox(p, m=0):
    return X0 - m <= p[0] <= X1 + m and Z0 - m <= p[1] <= Z1 + m


def clipline(pts):
    """Corta uma linha no retângulo (mantém pedaços dentro)."""
    segs, cur = [], []
    for p in pts:
        if inbox(p, 2):
            cur.append(p)
        else:
            if len(cur) >= 2:
                segs.append(cur)
            cur = []
    if len(cur) >= 2:
        segs.append(cur)
    return segs


WIDTH = {"primary": 11, "primary_link": 7, "secondary": 9, "secondary_link": 6, "tertiary": 8, "residential": 6.5, "unclassified": 6, "living_street": 5,
         "service": 4.5, "busway": 7.5, "pedestrian": 6, "footway": 2.2, "cycleway": 2.2, "steps": 2}
roads = []
rails = []
platforms = []
parks = []
grass = []
water = []
plines = []
for wid, (refs, t) in ways.items():
    pts = wpts(refs)
    if len(pts) < 2:
        continue
    hw = t.get("highway")
    if hw in WIDTH:
        w = WIDTH[hw]
        if t.get("lanes", "").isdigit() and hw not in ("footway", "pedestrian"):
            w = max(w, int(t["lanes"]) * 3.3 + 1)
        if t.get("width", "").replace(".", "").isdigit():
            w = float(t["width"])
        br = 1 if t.get("bridge") in ("yes", "viaduct") or t.get("layer") in ("1", "2") else 0
        for seg in clipline(pts):
            roads.append({"c": flat(seg), "w": round(w, 1), "k": hw, **({"n": t["name"]} if "name" in t else {}), **({"o": 1} if t.get("oneway") == "yes" else {}), **({"b": 1} if br else {})})
    elif t.get("railway") in ("rail",):
        for seg in clipline(pts):
            rails.append({"c": flat(seg), **({"b": 1} if t.get("bridge") else {})})
    elif t.get("railway") == "platform" or (t.get("public_transport") == "platform" and refs[0] == refs[-1]):
        poly = dedup(clip(pts))
        if len(poly) >= 3:
            platforms.append(flat(poly if area(poly) > 0 else poly[::-1]))
    elif t.get("power") == "line":
        for seg in clipline(pts):
            plines.append(flat(seg))
    if refs and refs[0] == refs[-1] and len(pts) >= 4:
        poly = dedup(clip(pts))
        if len(poly) < 3:
            continue
        if area(poly) < 0:
            poly.reverse()
        if t.get("leisure") in ("park", "garden") or t.get("landuse") in ("grass", "recreation_ground", "village_green") or t.get("natural") in ("wood", "scrub"):
            (parks if t.get("leisure") == "park" else grass).append(flat(poly))
        elif t.get("natural") == "water" or t.get("leisure") == "swimming_pool" or t.get("water"):
            water.append(flat(poly))

# Parque Madureira (multipolígono): junta os pedaços externos que vieram completos
for rl in root.findall("relation"):
    t = {tg.get("k"): tg.get("v") for tg in rl.findall("tag")}
    if t.get("leisure") != "park":
        continue
    outer = [m.get("ref") for m in rl.findall("member") if m.get("type") == "way" and m.get("role") in ("outer", "")]
    segs = [ways[i][0] for i in outer if i in ways]
    # encadeia as linhas pelos nós das pontas
    rings = []
    segs = [s[:] for s in segs]
    while segs:
        ring = segs.pop(0)
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        rings.append(ring)
    for ring in rings:
        poly = dedup(clip(wpts(ring)))
        if len(poly) >= 3 and abs(area(poly)) > 50:
            parks.append(flat(poly if area(poly) > 0 else poly[::-1]))

trees = []
towers = []
for nid, t in ntags.items():
    p = P(*nodes[nid])
    if not inbox(p):
        continue
    if t.get("natural") == "tree":
        trees.append([round(p[0], 1), round(p[1], 1)])
    elif t.get("power") in ("tower", "portal"):
        towers.append([round(p[0], 1), round(p[1], 1)])

# ------------------------------------------------------------------ pontos marcantes
def nearest_bld(pt, kinds=(0,)):
    best, bd = None, 1e9
    for i, b in enumerate(bld):
        if b["k"] not in kinds:
            continue
        pts = list(zip(b["p"][0::2], b["p"][1::2]))
        if pip(pt, pts):
            return i
        c = centroid(pts)
        d = math.hypot(c[0] - pt[0], c[1] - pt[1])
        if d < bd:
            best, bd = i, d
    return best


def biggest_in(poly, kinds=(0,)):
    """Edificações cujo centro está dentro de um polígono (ex.: o lote da igreja)."""
    out = []
    for i, b in enumerate(bld):
        if b["k"] in kinds and pip(centroid(list(zip(b["p"][0::2], b["p"][1::2]))), poly):
            out.append(i)
    return out


# lote da igreja (Prefeitura, lote 147622: salão de ~1.500 m² e 14 m com parte de 21 m): os prédios dentro dele viram a igreja
church_lot = None
lot_file = os.path.join(RAW, "lotes_ap.json")
if os.path.exists(lot_file):
    for ft in json.load(open(lot_file, encoding="utf-8"))["features"]:
        if ft["properties"].get("cod_lote") == "147622":
            church_lot = dedup([P(lat, lon) for lon, lat in ft["geometry"]["coordinates"][0]])
church = biggest_in(church_lot) if church_lot else []
for i in church:
    bld[i]["m"] = "church"

# Mercadão: as edificações dentro da área "Mercadão de Madureira" do OSM (landuse=retail)
merc = 0
for wid, (refs, t) in ways.items():
    if t.get("name") == "Mercadão de Madureira" and refs and refs[0] == refs[-1]:
        mpoly = wpts(refs)
        for i in biggest_in(mpoly, (0, 1)):
            bld[i]["m"] = "mercadao"
            merc += 1

# spawn: na Rua Andrade Pinto, na calçada em frente ao lote da igreja, olhando para a igreja
ap = [r for r in roads if r.get("n") == "Rua Andrade Pinto"]
cl = centroid(church_lot) if church_lot else (0.0, 0.0)
best = None
for r in ap:
    pts = list(zip(r["c"][0::2], r["c"][1::2]))
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]
        dx, dz = bx - ax, bz - az
        L2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((cl[0] - ax) * dx + (cl[1] - az) * dz) / L2))
        q = (ax + dx * t, az + dz * t)
        d = math.hypot(q[0] - cl[0], q[1] - cl[1])
        if best is None or d < best[0]:
            best = (d, q, r["w"])
if best and church_lot:
    _, q, w = best
    # ponto do contorno do lote mais perto da rua = a frente da igreja; o jogador nasce 2,5 m para fora, olhando para ela
    fb, fd = None, 1e9
    for i in range(len(church_lot)):
        (ax, az), (bx, bz) = church_lot[i - 1], church_lot[i]
        dx, dz = bx - ax, bz - az
        L2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((q[0] - ax) * dx + (q[1] - az) * dz) / L2))
        f = (ax + dx * t, az + dz * t)
        d = math.hypot(f[0] - q[0], f[1] - q[1])
        if d < fd:
            fb, fd = f, d
    vx, vz = q[0] - fb[0], q[1] - fb[1]
    L = math.hypot(vx, vz) or 1
    sp = (fb[0] + vx / L * 2.5, fb[1] + vz / L * 2.5)
    spawn = {"x": round(sp[0], 1), "z": round(sp[1], 1), "yaw": round(math.atan2(-vx, -vz), 3), "front": [round(fb[0], 1), round(fb[1], 1)]}
else:
    spawn = {"x": 0, "z": 0, "yaw": 0}

LANDMARKS = {
    "estacao": P(-22.87613, -43.33852),
    "viaduto": P(-22.87592, -43.33536),
    "mercadao": P(-22.87229, -43.33605),
    "parque": P(-22.87014, -43.34024),
    "igreja": cl,
}

out = {
    "v": 1,
    "attr": "Mapa: © colaboradores do OpenStreetMap (ODbL) · Edificações e quadras: Data.Rio / Instituto Pereira Passos (CC BY 4.0)",
    "origin": [LAT0, LON0],
    "bounds": [round(X0, 1), round(Z0, 1), round(X1, 1), round(Z1, 1)],
    "spawn": spawn,
    "landmarks": {k: [round(v[0], 1), round(v[1], 1)] for k, v in LANDMARKS.items()},
    "churchLot": flat(church_lot) if church_lot else [],
    "blocks": quadras,
    "bld": bld,
    "roads": roads,
    "rails": rails,
    "platforms": platforms,
    "parks": parks,
    "grass": grass,
    "water": water,
    "trees": trees,
    "towers": towers,
    "plines": plines,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("ok", os.path.getsize(OUT) // 1024, "KB", {k: len(v) for k, v in out.items() if isinstance(v, list)}, "spawn", spawn, "igreja", len(church), "mercadao", merc)
