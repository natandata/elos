"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PaperDoll, SLOT_VIEWBOX } from "./PaperDoll";
import type { DollBase } from "@/lib/games/dress/characters";
import { ITEM_BY_ID, SLOTS, familiesBySlot, type FamilyGroup, type Look, type Slot } from "@/lib/games/dress/items";

export type MallStation = "hair" | "makeup" | "skin";

type Target = { kind: "item"; slot: Slot; family: string } | { kind: "station"; cat: MallStation };
type Spot = { target: Target; x: number; z: number; label: string };

const HW = 15; // meia largura do salão
const HL = 24; // meio comprimento
const SPACING = 2.1;
const TIERS = 3;
const ZONE_LABEL: Record<Slot, string> = { tunic: "👗 Roupas", head: "👑 Cabeça", mantle: "🧣 Mantos", shoes: "👠 Calçados", hand: "🪄 Acessórios" };

type Placed = { slot: Slot; fam: FamilyGroup; x: number; y: number; z: number; face: 1 | -1; w: number; h: number; sprite?: THREE.Sprite };

/** Uma peça de cada família, em cada prateleira: o salão é montado a partir do catálogo. */
function layoutShelves(): { placed: Placed[]; units: { x: number; z: number; face: 1 | -1 }[]; signs: { text: string; x: number; z: number; face: 1 | -1 }[] } {
  const placed: Placed[] = [];
  const units: { x: number; z: number; face: 1 | -1 }[] = [];
  const signs: { text: string; x: number; z: number; face: 1 | -1 }[] = [];
  const walls: { face: 1 | -1; slots: Slot[] }[] = [
    { face: 1, slots: ["tunic", "head", "mantle"] },
    { face: -1, slots: ["shoes", "hand"] },
  ];
  for (const wall of walls) {
    let z = -HL + 5;
    for (const slot of wall.slots) {
      const fams = familiesBySlot(slot);
      const cols = Math.ceil(fams.length / TIERS);
      const startZ = z;
      for (let c = 0; c < cols; c++) {
        const uz = z + SPACING / 2;
        units.push({ x: -wall.face * (HW - 0.45), z: uz, face: wall.face });
        for (let t = 0; t < TIERS; t++) {
          const f = fams[c * TIERS + t];
          if (!f) continue;
          const vb = SLOT_VIEWBOX[slot].split(" ").map(Number);
          const ar = vb[2] / vb[3];
          const hh = slot === "tunic" ? 1.15 : slot === "mantle" ? 1.1 : slot === "shoes" ? 0.6 : 0.95;
          const ww = Math.min(SPACING * 0.86, hh * ar);
          const hFinal = ww / ar;
          const boardTop = 0.55 + t * 1.35;
          placed.push({ slot, fam: f, x: -wall.face * (HW - 0.95), y: boardTop + hFinal / 2 + 0.04, z: uz, face: wall.face, w: ww, h: hFinal });
        }
        z += SPACING;
      }
      signs.push({ text: ZONE_LABEL[slot], x: -wall.face * (HW - 0.2), z: (startZ + z) / 2, face: wall.face });
      z += 1.6;
    }
  }
  return { placed, units, signs };
}

function textSprite(text: string, w = 4.6, color = "#6b2d6f"): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath();
  g.roundRect(6, 10, 500, 108, 40);
  g.fill();
  g.strokeStyle = "#e9b84a";
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = color;
  g.font = "900 52px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(w, w / 4, 1);
  return sp;
}

function woodTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const cols = ["#6e4f5c", "#7a5866", "#664958", "#71515f"];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(0, i * 32, 256, 32);
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(0, i * 32, 256, 2);
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let k = 0; k < 6; k++) g.fillRect((k * 53 + i * 31) % 256, i * 32 + 6, 38, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(HW / 2.5, HL / 2.5);
  return t;
}

function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 512);
  g.beginPath();
  g.moveTo(14, 512);
  g.lineTo(14, 130);
  g.arc(128, 130, 114, Math.PI, 0);
  g.lineTo(242, 512);
  g.closePath();
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#6fb6f2");
  grad.addColorStop(1, "#d6ecff");
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 7;
  for (let x = 14; x <= 242; x += 76) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  }
  for (let y = 90; y < 512; y += 92) {
    g.beginPath();
    g.moveTo(14, y);
    g.lineTo(242, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** SVG do boneco/peça (já no DOM) vira textura: copia o <svg>, dá tamanho e desenha num canvas. */
function svgToTexture(svg: SVGSVGElement, maxW: number): Promise<{ tex: THREE.CanvasTexture; ar: number }> {
  return new Promise((resolve, reject) => {
    const vb = (svg.getAttribute("viewBox") ?? "0 0 200 360").split(/\s+/).map(Number);
    const ar = vb[2] / vb[3];
    const w = maxW;
    const h = Math.round(maxW / ar);
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve({ tex, ar });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg"));
    };
    img.src = url;
  });
}

/**
 * Loja gigante em 3D, em terceira pessoa, no jeito do Dress to Impress: a jogadora anda pelo salão, chega nas
 * prateleiras, toca numa peça para vestir e escolhe a cor no painel. Espelhos de maquiagem, salão de cabelo e provador no fundo.
 */
export function MallStore3D({ base, look, onEquip, onStation, quiet = false }: { base: DollBase; look: Look; onEquip: (slot: Slot, id: string | undefined) => void; onStation: (cat: MallStation) => void; quiet?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const avatarBankRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState<Spot | null>(null);
  const [panel, setPanel] = useState<{ slot: Slot; family: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const layout = useMemo(() => layoutShelves(), []);
  const lookRef = useRef(look);
  const onEquipRef = useRef(onEquip);
  const onStationRef = useRef(onStation);
  const avatarSet = useRef<((svg: SVGSVGElement) => void) | null>(null);
  const selectRef = useRef<((t: Target) => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    lookRef.current = look;
    onEquipRef.current = onEquip;
    onStationRef.current = onStation;
  });

  const say = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });

  // a avatar do salão acompanha o look: copia o SVG do "banco" escondido sempre que ele mudar
  const lookKey = JSON.stringify([base, look]);
  useEffect(() => {
    const t = setTimeout(() => {
      const svg = avatarBankRef.current?.querySelector("svg");
      if (svg) avatarSet.current?.(svg as SVGSVGElement);
    }, 30);
    return () => clearTimeout(t);
  }, [lookKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, powerPreference: "high-performance" });
    } catch {
      const t = setTimeout(() => setFailed(true), 0);
      return () => clearTimeout(t);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0xf1dfe9);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf1dfe9, 22, 58);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 90);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9bfe0, 1.35));
    const sun = new THREE.DirectionalLight(0xfff3e0, 0.9);
    sun.position.set(6, 14, 8);
    scene.add(sun);

    const disposables: { dispose: () => void }[] = [];
    const mat = (color: number | string) => {
      const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
      disposables.push(m);
      return m;
    };
    const geo = <T extends THREE.BufferGeometry>(g: T) => {
      disposables.push(g);
      return g;
    };
    const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    // ---- salão
    const floorTex = woodTexture();
    disposables.push(floorTex);
    const floor = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, HL * 2)), new THREE.MeshLambertMaterial({ map: floorTex })), 0, 0, 0);
    floor.rotation.x = -Math.PI / 2;
    const wallMat = mat(0xf6e3ec);
    const trimMat = mat(0xffffff);
    const H = 10;
    add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, H)), wallMat), 0, H / 2, -HL).rotation.y = 0;
    const front = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, H)), wallMat), 0, H / 2, HL);
    front.rotation.y = Math.PI;
    const lw = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HL * 2, H)), wallMat), -HW, H / 2, 0);
    lw.rotation.y = Math.PI / 2;
    const rw = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HL * 2, H)), wallMat), HW, H / 2, 0);
    rw.rotation.y = -Math.PI / 2;
    const ceil = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, HL * 2)), mat(0xfff7fb)), 0, H, 0);
    ceil.rotation.x = Math.PI / 2;
    // rodapé e faixa dourada
    for (const [w, d, x, z] of [
      [HW * 2, 0.2, 0, -HL + 0.1],
      [HW * 2, 0.2, 0, HL - 0.1],
      [0.2, HL * 2, -HW + 0.1, 0],
      [0.2, HL * 2, HW - 0.1, 0],
    ] as const) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, 0.35, d)), trimMat), x, 0.18, z);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, 0.12, d)), mat(0xe9b84a)), x, 5.7, z);
    }
    // janelas em arco no fundo
    const winTex = windowTexture();
    disposables.push(winTex);
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, transparent: true });
    for (const x of [-9, -3, 3, 9]) {
      const w = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(4, 8)), winMat), x, 5.6, -HL + 0.05);
      w.rotation.y = 0;
    }
    // colunas
    const colMat = mat(0xffffff);
    const colliders: { x: number; z: number; r: number }[] = [];
    const columns: { x: number; z: number; parts: THREE.Mesh[] }[] = [];
    for (const z of [-14, -4, 6, 16]) {
      for (const x of [-9, 9]) {
        const shaft = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.55, 0.65, H, 14)), colMat), x, H / 2, z);
        const foot = add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 14)), mat(0xe9b84a)), x, 0.25, z);
        columns.push({ x, z, parts: [shaft, foot] });
        colliders.push({ x, z, r: 1.15 });
      }
    }
    // tapete e palco central
    const rug = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(10, 22)), mat(0xfde7f1)), 0, 0.02, 2);
    rug.rotation.x = -Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.6, 3.8, 0.6, 30)), mat(0xffffff)), 0, 0.3, -12);
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(2.8, 3, 0.4, 30)), mat(0xf8c7dc)), 0, 0.8, -12);
    colliders.push({ x: 0, z: -12, r: 3.9 });
    // plantas
    for (const [x, z] of [[-13, 18], [13, 18], [-13, -21], [13, -21], [-6, 21], [6, 21]]) {
      add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.45, 0.35, 0.8, 10)), mat(0xf5f5f5)), x, 0.4, z);
      add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.95, 10, 8)), mat(0x3f8f4f)), x, 1.5, z);
    }

    // ---- prateleiras
    const shelfBack = mat(0xf3e6ee);
    const shelfBoard = mat(0xffffff);
    const shelfPink = mat(0xf5b7d0);
    for (const u of layout.units) {
      const g = new THREE.Group();
      g.position.set(u.x, 0, u.z);
      const back = new THREE.Mesh(geo(new THREE.BoxGeometry(0.12, 4.5, SPACING - 0.08)), shelfBack);
      back.position.set(-u.face * 0.42, 2.25, 0);
      g.add(back);
      for (let t = 0; t < TIERS; t++) {
        const b = new THREE.Mesh(geo(new THREE.BoxGeometry(0.95, 0.09, SPACING - 0.08)), shelfBoard);
        b.position.set(0, 0.5 + t * 1.35, 0);
        g.add(b);
      }
      const top = new THREE.Mesh(geo(new THREE.BoxGeometry(1, 0.12, SPACING - 0.04)), shelfPink);
      top.position.set(0, 4.5, 0);
      g.add(top);
      const base0 = new THREE.Mesh(geo(new THREE.BoxGeometry(0.95, 0.4, SPACING - 0.08)), shelfPink);
      base0.position.set(0, 0.2, 0);
      g.add(base0);
      scene.add(g);
    }
    for (const s of layout.signs) {
      const sp = textSprite(s.text);
      sp.position.set(s.x + (s.face === 1 ? 0.4 : -0.4), 5.3, s.z);
      scene.add(sp);
      disposables.push(sp.material);
    }

    // ---- estações (fundo da frente do salão)
    const spots: Spot[] = [];
    const stationDefs: { cat: MallStation; label: string; x: number; title: string; tint: number }[] = [
      { cat: "makeup", label: "Maquiar", x: -7.5, title: "💄 Maquiagem", tint: 0xf5b7d0 },
      { cat: "hair", label: "Cabelo", x: 0, title: "💇‍♀️ Salão de cabelo", tint: 0xd8c2f0 },
      { cat: "skin", label: "Tom de pele", x: 7.5, title: "🎨 Pele", tint: 0xffd9a8 },
    ];
    for (const s of stationDefs) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(4.6, 4.2, 0.3)), mat(0xffffff)), s.x, 2.4, HL - 0.5);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(3.9, 3.5, 0.12)), new THREE.MeshLambertMaterial({ color: s.tint, emissive: s.tint, emissiveIntensity: 0.25 })), s.x, 2.4, HL - 0.68);
      for (let i = -2; i <= 2; i++) add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 8, 6)), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })), s.x + i * 0.9, 4.6, HL - 0.62);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.6, 0.9, 1)), mat(0xf5b7d0)), s.x, 0.45, HL - 1.3);
      const sp = textSprite(s.title, 4.2);
      sp.position.set(s.x, 5.5, HL - 0.8);
      scene.add(sp);
      disposables.push(sp.material);
      spots.push({ target: { kind: "station", cat: s.cat }, x: s.x, z: HL - 2.6, label: s.label });
      colliders.push({ x: s.x, z: HL - 1.3, r: 1.5 });
    }

    // ---- peças nas prateleiras (texturas chegam sob demanda)
    const placeholder = new THREE.SpriteMaterial({ color: 0xe8d4e0, transparent: true, opacity: 0.55, depthWrite: false });
    disposables.push(placeholder);
    const itemSprites = new Map<Placed, THREE.Sprite>();
    const spriteToPlaced = new Map<THREE.Object3D, Placed>();
    const textures: THREE.Texture[] = [];
    for (const p of layout.placed) {
      const sp = new THREE.Sprite(placeholder);
      sp.scale.set(p.w * 0.8, p.h * 0.8, 1);
      sp.position.set(p.x, p.y, p.z);
      scene.add(sp);
      itemSprites.set(p, sp);
      spriteToPlaced.set(sp, p);
      spots.push({ target: { kind: "item", slot: p.slot, family: p.fam.family }, x: p.x + p.face * 1.2, z: p.z, label: p.fam.base });
    }
    const loading = new Set<Placed>();
    const loaded = new Set<Placed>();
    const bank = bankRef.current;
    const loadItem = (p: Placed) => {
      if (loading.has(p) || loaded.has(p) || !bank) return;
      const el = bank.querySelector(`[data-k="${p.slot}:${p.fam.family}"] svg`) as SVGSVGElement | null;
      if (!el) return;
      loading.add(p);
      svgToTexture(el, 160)
        .then(({ tex }) => {
          textures.push(tex);
          const sp = itemSprites.get(p);
          if (!sp || disposed) {
            tex.dispose();
            return;
          }
          sp.material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
          sp.scale.set(p.w, p.h, 1);
          loaded.add(p);
        })
        .catch(() => undefined)
        .finally(() => loading.delete(p));
    };

    // ---- avatar da jogadora
    const avatarMat = new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false });
    const avatar = new THREE.Sprite(avatarMat);
    const AV_H = 2.2;
    avatar.scale.set((AV_H * 200) / 360, AV_H, 1);
    avatar.center.set(0.5, 0);
    scene.add(avatar);
    const shadow = new THREE.Mesh(geo(new THREE.CircleGeometry(0.5, 20)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    scene.add(shadow);
    let avatarTex: THREE.Texture | null = null;
    let avatarBusy = false;
    let avatarPending: SVGSVGElement | null = null;
    const setAvatar = (svg: SVGSVGElement) => {
      if (avatarBusy) {
        avatarPending = svg;
        return;
      }
      avatarBusy = true;
      svgToTexture(svg, 300)
        .then(({ tex }) => {
          if (disposed) return tex.dispose();
          avatarTex?.dispose();
          avatarTex = tex;
          avatarMat.map = tex;
          avatarMat.needsUpdate = true;
          setReady(true);
        })
        .catch(() => undefined)
        .finally(() => {
          avatarBusy = false;
          if (avatarPending) {
            const n = avatarPending;
            avatarPending = null;
            setAvatar(n);
          }
        });
    };
    avatarSet.current = setAvatar;
    const firstAvatar = setTimeout(() => {
      const svg = avatarBankRef.current?.querySelector("svg");
      if (svg) setAvatar(svg as SVGSVGElement);
    }, 60);

    // ---- controles
    const keys = new Set<string>();
    const st = { x: 0, z: HL - 7, yaw: 0, pitch: 0.28, vx: 0, vz: 0, joyX: 0, joyY: 0, t: 0 };
    if (process.env.NODE_ENV !== "production") (window as unknown as { __mall?: unknown }).__mall = st;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        if (down) keys.add(k);
        else keys.delete(k);
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const canvas = renderer.domElement;
    const ptrs = new Map<number, { x0: number; y0: number; x: number; y: number; t0: number; role: "joy" | "look" }>();
    const raycaster = new THREE.Raycaster();
    const setKnob = (dx: number, dy: number) => {
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const joyBase = joyRef.current;
    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético ou já solto: segue sem captura */
      }
      const r = canvas.getBoundingClientRect();
      const left = e.clientX - r.left < r.width * 0.42 && e.pointerType === "touch";
      ptrs.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), role: left ? "joy" : "look" });
      if (left && joyBase) {
        joyBase.style.left = `${e.clientX - r.left - 46}px`;
        joyBase.style.top = `${e.clientY - r.top - 46}px`;
        joyBase.style.opacity = "1";
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (p.role === "joy") {
        const jx = Math.max(-1, Math.min(1, (p.x - p.x0) / 46));
        const jy = Math.max(-1, Math.min(1, (p.y - p.y0) / 46));
        const len = Math.hypot(jx, jy);
        const k = len > 1 ? 1 / len : 1;
        st.joyX = jx * k;
        st.joyY = jy * k;
        setKnob(st.joyX * 30, st.joyY * 30);
      } else {
        st.yaw -= dx * 0.0065;
        st.pitch = Math.max(0.05, Math.min(0.9, st.pitch + dy * 0.004));
      }
    };
    const onUp = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (!p) return;
      if (p.role === "joy") {
        st.joyX = st.joyY = 0;
        setKnob(0, 0);
        if (joyBase) joyBase.style.opacity = "0.35";
        return;
      }
      // toque curto sem arrastar = tentar pegar a peça tocada
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < 8 && performance.now() - p.t0 < 380) {
        const r = canvas.getBoundingClientRect();
        raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), camera);
        const hits = raycaster.intersectObjects([...spriteToPlaced.keys()], false);
        const hit = hits[0] ? spriteToPlaced.get(hits[0].object) : undefined;
        if (hit) {
          if (Math.hypot(hit.x - st.x, hit.z - st.z) > 7.5) sayRef.current("Chegue mais perto da prateleira para pegar a peça.");
          else selectRef.current?.({ kind: "item", slot: hit.slot, family: hit.fam.family });
        }
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const resize = () => {
      const w = host.clientWidth || 300;
      const h = host.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 66 : 58;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ---- laço
    let disposed = false;
    let raf = 0;
    let last = performance.now();
    let nearKey = "";
    let nearT = 0;
    let loadT = 0;
    const camPos = new THREE.Vector3(0, 3, HL - 3);
    const tmp = new THREE.Vector3();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      st.t += dt;
      // direção desejada (no referencial da câmera)
      let ix = st.joyX;
      let iz = st.joyY;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iz -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iz += 1;
      const len = Math.hypot(ix, iz);
      if (len > 1) {
        ix /= len;
        iz /= len;
      }
      const speed = (keys.has("shift") ? 8.5 : 5.2) * Math.min(1, len);
      const sy = Math.sin(st.yaw);
      const cy = Math.cos(st.yaw);
      const wx = ix * cy + iz * sy;
      const wz = -ix * sy + iz * cy;
      const dirLen = Math.hypot(wx, wz) || 1;
      const tvx = len > 0.05 ? (wx / dirLen) * speed : 0;
      const tvz = len > 0.05 ? (wz / dirLen) * speed : 0;
      st.vx += (tvx - st.vx) * Math.min(1, dt * 12);
      st.vz += (tvz - st.vz) * Math.min(1, dt * 12);
      st.x += st.vx * dt;
      st.z += st.vz * dt;
      // limites do salão e colisões
      st.x = Math.max(-HW + 1.9, Math.min(HW - 1.9, st.x));
      st.z = Math.max(-HL + 1.2, Math.min(HL - 1.2, st.z));
      for (const c of colliders) {
        const dx = st.x - c.x;
        const dz = st.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d < c.r + 0.3) {
          const k = (c.r + 0.3) / (d || 0.001);
          st.x = c.x + dx * k;
          st.z = c.z + dz * k;
        }
      }
      const moving = Math.hypot(st.vx, st.vz);
      const bob = Math.abs(Math.sin(st.t * 9)) * 0.1 * Math.min(1, moving / 3);
      avatar.position.set(st.x, bob, st.z);
      avatarMat.rotation = Math.sin(st.t * 9) * 0.05 * Math.min(1, moving / 3);
      shadow.position.set(st.x, 0.03, st.z);
      // câmera em terceira pessoa atrás da jogadora
      const dist = 5;
      tmp.set(st.x + Math.sin(st.yaw) * dist * Math.cos(st.pitch), 1.5 + dist * Math.sin(st.pitch) + 0.6, st.z + Math.cos(st.yaw) * dist * Math.cos(st.pitch));
      tmp.x = Math.max(-HW + 0.6, Math.min(HW - 0.6, tmp.x));
      tmp.z = Math.max(-HL + 0.6, Math.min(HL - 0.6, tmp.z));
      camPos.lerp(tmp, Math.min(1, dt * 10));
      camera.position.copy(camPos);
      camera.lookAt(st.x, 1.3, st.z);
      // coluna entre a câmera e a jogadora some, para não tapar a vista
      const sx = st.x - camPos.x;
      const sz = st.z - camPos.z;
      const sl = sx * sx + sz * sz || 1;
      for (const c of columns) {
        const t = Math.max(0, Math.min(1, ((c.x - camPos.x) * sx + (c.z - camPos.z) * sz) / sl));
        const hide = Math.hypot(camPos.x + sx * t - c.x, camPos.z + sz * t - c.z) < 1.5;
        for (const m of c.parts) m.visible = !hide;
      }

      // peça/estação mais perto + carregamento das texturas por perto
      nearT += dt;
      loadT += dt;
      if (nearT > 0.12) {
        nearT = 0;
        let best: Spot | null = null;
        let bd = 2.8;
        for (const s of spots) {
          const d = Math.hypot(s.x - st.x, s.z - st.z);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
        const k = best ? (best.target.kind === "item" ? `i:${best.target.slot}:${best.target.family}` : `s:${best.target.cat}`) : "";
        if (k !== nearKey) {
          nearKey = k;
          setNear(best);
        }
      }
      if (loadT > 0.15) {
        loadT = 0;
        let started = 0;
        for (const p of layout.placed) {
          if (started >= 3 || loading.size >= 4) break;
          if (loaded.has(p) || loading.has(p)) continue;
          if (Math.hypot(p.x - st.x, p.z - st.z) < 24) {
            loadItem(p);
            started++;
          }
        }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    selectRef.current = (t) => {
      if (t.kind === "station") {
        onStationRef.current(t.cat);
        return;
      }
      const fams = familiesBySlot(t.slot);
      const f = fams.find((x) => x.family === t.family);
      if (!f) return;
      const worn = lookRef.current[t.slot];
      if (!worn || ITEM_BY_ID.get(worn)?.family !== t.family) onEquipRef.current(t.slot, f.items[0].id);
      setPanel({ slot: t.slot, family: t.family });
    };

    return () => {
      disposed = true;
      clearTimeout(firstAvatar);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      avatarSet.current = null;
      selectRef.current = null;
      textures.forEach((t) => t.dispose());
      avatarTex?.dispose();
      avatarMat.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [layout]);

  const allFams = useMemo(() => SLOTS.flatMap((s) => familiesBySlot(s.key).map((f) => ({ slot: s.key, f }))), []);
  const panelFam = panel ? familiesBySlot(panel.slot).find((f) => f.family === panel.family) : undefined;
  const worn = panel ? look[panel.slot] : undefined;

  if (failed) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm font-bold text-amber-100">
        Seu aparelho não conseguiu abrir a loja em 3D. Use a lista de peças (botão “Lista”).
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ touchAction: "none" }}>
      <div ref={hostRef} className="absolute inset-0" />
      {/* bancos escondidos: o SVG de cada peça e o da avatar viram textura 3D */}
      <div ref={bankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 200, pointerEvents: "none", overflow: "hidden" }}>
        {allFams.map(({ slot, f }) => (
          <div key={`${slot}:${f.family}`} data-k={`${slot}:${f.family}`}>
            <PaperDoll base={base} look={{ [slot]: f.items[0].id }} only={slot} />
          </div>
        ))}
      </div>
      <div ref={avatarBankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, pointerEvents: "none", overflow: "hidden" }}>
        <PaperDoll base={base} look={look} />
      </div>

      {!ready ? <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm font-black text-purple-900">Abrindo a loja…</p> : null}

      <div ref={joyRef} aria-hidden className="pointer-events-none absolute z-[3] h-[92px] w-[92px] rounded-full border-2 border-white/70 bg-white/20 [@media(hover:hover)]:hidden" style={{ left: 22, bottom: 22, opacity: 0.35 }}>
        <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-[17px] -mt-[17px] h-[34px] w-[34px] rounded-full bg-white/80 shadow" />
      </div>
      <p className="pointer-events-none absolute left-2 top-2 hidden rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white [@media(hover:hover)]:block">WASD / setas para andar · arraste para girar · toque na peça</p>
      <p className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white [@media(hover:hover)]:hidden">Arraste à esquerda para andar · à direita para girar</p>

      {toast ? <p className="pointer-events-none absolute inset-x-6 top-12 z-[6] rounded-xl bg-purple-900/90 px-3 py-2 text-center text-xs font-bold text-white">{toast}</p> : null}

      {!quiet && near && !(panel && near.target.kind === "item" && panel.family === near.target.family) ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[5] flex justify-center">
          <button type="button" className="vh-btn pointer-events-auto !w-auto !px-5 !py-2.5 !text-sm" onClick={() => selectRef.current?.(near.target)}>
            {near.target.kind === "station" ? `✨ ${near.label}` : `🛍 Provar: ${near.label}`}
          </button>
        </div>
      ) : null}

      {!quiet && panel && panelFam ? (
        <div className="absolute right-2 top-12 z-[6] w-[168px] rounded-2xl border-2 border-white/80 bg-purple-600/95 p-2.5 shadow-xl">
          <div className="mb-1.5 flex items-start justify-between gap-1">
            <p className="text-xs font-black leading-tight text-white">
              {panelFam.base}
              <span className="block text-[10px] font-bold text-purple-100">Cor</span>
            </p>
            <button type="button" className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-xs font-black text-white" aria-label="Fechar" onClick={() => setPanel(null)}>
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {panelFam.items.map((it) => (
              <button
                key={it.id}
                type="button"
                title={it.name}
                aria-label={it.name}
                className="relative aspect-square rounded-full border-2 shadow"
                style={{ background: it.p.c, borderColor: worn === it.id ? "#ffe066" : "rgba(255,255,255,0.7)", transform: worn === it.id ? "scale(1.12)" : undefined }}
                onClick={() => onEquip(panel.slot, it.id)}
              >
                {it.p.c2 ? <i className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white/70" style={{ background: it.p.c2 }} /> : null}
              </button>
            ))}
          </div>
          {worn && ITEM_BY_ID.get(worn)?.family === panel.family ? (
            <button type="button" className="mt-2 w-full rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-purple-900" onClick={() => { onEquip(panel.slot, undefined); setPanel(null); }}>
              Tirar peça
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
