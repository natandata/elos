"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PaperDoll, SLOT_VIEWBOX } from "./PaperDoll";
import { useLandscape } from "./LandscapeShell";
import { baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import type { DollBase } from "@/lib/games/dress/characters";
import type { HallPos, HallRoster } from "@/lib/games/dress/hall";
import { ITEM_BY_ID, SLOTS, familiesBySlot, type FamilyGroup, type Look, type Slot } from "@/lib/games/dress/items";

export type MallStation = "hair" | "makeup" | "skin";
export type MallZone = Slot | MallStation;
export type MallEvent = { type: "move" | "equip" | "color" | "station" | "goto" | "near"; slot?: Slot; cat?: MallStation };

type Target = { kind: "item"; slot: Slot; family: string } | { kind: "station"; cat: MallStation };
type Spot = { target: Target; x: number; z: number; label: string };

const HW = 15; // meia largura do salão
const HL = 24; // meio comprimento
const SPACING = 2.1;
const TIERS = 3;
const ZONE_LABEL: Record<Slot, string> = { tunic: "👗 Roupas", head: "👑 Cabeça", mantle: "🧣 Mantos", shoes: "👠 Calçados", hand: "🪄 Acessórios" };
const ZONES: { key: MallZone; icon: string; label: string }[] = [
  { key: "tunic", icon: "👗", label: "Roupas" },
  { key: "head", icon: "👑", label: "Cabeça" },
  { key: "mantle", icon: "🧣", label: "Mantos" },
  { key: "shoes", icon: "👠", label: "Calçados" },
  { key: "hand", icon: "🪄", label: "Acessórios" },
  { key: "makeup", icon: "💄", label: "Make" },
  { key: "hair", icon: "💇‍♀️", label: "Cabelo" },
  { key: "skin", icon: "🎨", label: "Pele" },
];
/** Câmera de cada peça: perto da parte do corpo que está sendo escolhida. */
const FOCUS: Record<Slot, { y: number; dist: number }> = { head: { y: 1.95, dist: 3.1 }, tunic: { y: 1.25, dist: 3.7 }, mantle: { y: 1.3, dist: 3.7 }, hand: { y: 1.1, dist: 3.4 }, shoes: { y: 0.45, dist: 3.1 } };

type Placed = { slot: Slot; fam: FamilyGroup; x: number; y: number; z: number; face: 1 | -1; w: number; h: number };

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

/** Letreiro dourado do salão. */
function neonSprite(text: string, w: number): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.font = "900 120px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "#ff7ac0";
  g.shadowBlur = 36;
  g.fillStyle = "#fff6c2";
  g.fillText(text, 512, 132);
  g.shadowBlur = 0;
  g.lineWidth = 6;
  g.strokeStyle = "#e9b84a";
  g.strokeText(text, 512, 132);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(w, w / 4, 1);
  return sp;
}

function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function starTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.translate(32, 32);
  g.fillStyle = "#fff";
  g.shadowColor = "#ffe9a0";
  g.shadowBlur = 10;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 26 : 7;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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

function rugTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fde3ef";
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = "#e9b84a";
  g.lineWidth = 10;
  g.strokeRect(8, 8, 240, 496);
  g.strokeStyle = "#f5a3c7";
  g.lineWidth = 4;
  g.strokeRect(22, 22, 212, 468);
  g.fillStyle = "#f5a3c7";
  for (let y = 60; y < 480; y += 60) {
    g.beginPath();
    g.arc(128, y, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = y % 120 === 0 ? "#f5a3c7" : "#e9b84a";
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
function svgToCanvas(svg: SVGSVGElement, maxW: number): Promise<HTMLCanvasElement> {
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
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg"));
    };
    img.src = url;
  });
}
const canvasTexture = (c: HTMLCanvasElement): THREE.CanvasTexture => {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/**
 * Loja gigante em 3D, em terceira pessoa, no jeito do Dress to Impress: a jogadora anda pelo salão (joystick),
 * chega nas prateleiras, toca numa peça para vestir e escolhe a cor no painel. Espelhos de maquiagem, salão de cabelo e provador no fundo.
 */
export function MallStore3D({ base, look, onEquip, onStation, onEvent, quiet = false, face = false, onPos, spectate = false, roster, positions, follow = null }: { base: DollBase; look: Look; onEquip: (slot: Slot, id: string | undefined) => void; onStation: (cat: MallStation) => void; onEvent?: (e: MallEvent) => void; quiet?: boolean; face?: boolean; onPos?: (p: { x: number; z: number; fx: 1 | -1; mv: number }) => void; spectate?: boolean; roster?: HallRoster[]; positions?: React.MutableRefObject<Record<string, HallPos>>; follow?: string | null }) {
  const { rotated, mobile, land } = useLandscape();
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
  const [menu, setMenu] = useState(false);

  const layout = useMemo(() => layoutShelves(), []);
  const lookRef = useRef(look);
  const onEquipRef = useRef(onEquip);
  const onStationRef = useRef(onStation);
  const onEventRef = useRef(onEvent);
  const rotatedRef = useRef(rotated);
  const landRef = useRef(land);
  const avatarSet = useRef<((svgs: SVGSVGElement[]) => void) | null>(null);
  const selectRef = useRef<((t: Target) => void) | null>(null);
  const goToRef = useRef<((z: MallZone) => void) | null>(null);
  const focusRef = useRef<{ y: number; dist: number } | null>(null);
  const faceRef = useRef(false);
  const onPosRef = useRef(onPos);
  const spectateRef = useRef(spectate);
  const positionsRef = useRef(positions);
  const followRef = useRef(follow);
  const peerSet = useRef<((id: string, name: string, svgs: SVGSVGElement[], key: string) => void) | null>(null);
  const peerBankRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    lookRef.current = look;
    onEquipRef.current = onEquip;
    onStationRef.current = onStation;
    onEventRef.current = onEvent;
    rotatedRef.current = rotated;
    landRef.current = land;
    onPosRef.current = onPos;
    spectateRef.current = spectate;
    positionsRef.current = positions;
    followRef.current = follow;
  });
  useEffect(() => {
    focusRef.current = panel && !quiet ? FOCUS[panel.slot] : null;
  }, [panel, quiet]);
  useEffect(() => {
    faceRef.current = face;
  }, [face]);

  const say = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });

  // a avatar do salão acompanha o look: copia o SVG do "banco" escondido sempre que ele mudar
  const lookKey = JSON.stringify([base, look]);
  useEffect(() => {
    const t = setTimeout(() => {
      const svgs = [...(avatarBankRef.current?.querySelectorAll("svg") ?? [])] as SVGSVGElement[];
      if (svgs.length) avatarSet.current?.(svgs);
    }, 30);
    return () => clearTimeout(t);
  }, [lookKey, face]);

  // outras jogadoras (modo plateia): o SVG de cada uma vira textura sempre que o look dela muda
  const rosterKey = JSON.stringify((roster ?? []).slice(0, 16).map((p) => [p.id, p.name, p.look, p.beauty]));
  useEffect(() => {
    if (!spectate) return;
    const t = setTimeout(() => {
      for (const p of (roster ?? []).slice(0, 16)) {
        const el = peerBankRef.current?.querySelector(`[data-peer="${p.id}"]`);
        const svgs = el ? ([...el.querySelectorAll("svg")] as SVGSVGElement[]) : [];
        if (svgs.length) peerSet.current?.(p.id, p.name, svgs, JSON.stringify([p.look, p.beauty]));
      }
    }, 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, spectate]);

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
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };
    const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    };

    // ---- salão
    const floorTex = track(woodTexture());
    const floor = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, HL * 2)), track(new THREE.MeshLambertMaterial({ map: floorTex }))), 0, 0, 0);
    floor.rotation.x = -Math.PI / 2;
    const wallMat = mat(0xf6e3ec);
    const trimMat = mat(0xffffff);
    const H = 10;
    add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, H)), wallMat), 0, H / 2, -HL);
    const front = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, H)), wallMat), 0, H / 2, HL);
    front.rotation.y = Math.PI;
    const lw = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HL * 2, H)), wallMat), -HW, H / 2, 0);
    lw.rotation.y = Math.PI / 2;
    const rw = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HL * 2, H)), wallMat), HW, H / 2, 0);
    rw.rotation.y = -Math.PI / 2;
    const ceil = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(HW * 2, HL * 2)), mat(0xfff7fb)), 0, H, 0);
    ceil.rotation.x = Math.PI / 2;
    for (const [w, d, x, z] of [
      [HW * 2, 0.2, 0, -HL + 0.1],
      [HW * 2, 0.2, 0, HL - 0.1],
      [0.2, HL * 2, -HW + 0.1, 0],
      [0.2, HL * 2, HW - 0.1, 0],
    ] as const) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, 0.35, d)), trimMat), x, 0.18, z);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, 0.12, d)), mat(0xe9b84a)), x, 5.7, z);
    }
    // janelas em arco no fundo + letreiro
    const winTex = track(windowTexture());
    const winMat = track(new THREE.MeshBasicMaterial({ map: winTex, transparent: true }));
    for (const x of [-9, -3, 3, 9]) add(new THREE.Mesh(geo(new THREE.PlaneGeometry(4, 8)), winMat), x, 5.6, -HL + 0.05);
    const sign = neonSprite("VISTA O HERÓI", 9);
    sign.position.set(0, 8.6, -HL + 0.4);
    scene.add(sign);
    track(sign.material);
    // colunas (somem quando ficam entre a câmera e a jogadora)
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
    // tapete, palco central e lustre
    const rugTex = track(rugTexture());
    const rug = add(new THREE.Mesh(geo(new THREE.PlaneGeometry(9, 20)), track(new THREE.MeshLambertMaterial({ map: rugTex }))), 0, 0.02, 3);
    rug.rotation.x = -Math.PI / 2;
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(3.6, 3.8, 0.6, 30)), mat(0xffffff)), 0, 0.3, -12);
    add(new THREE.Mesh(geo(new THREE.CylinderGeometry(2.8, 3, 0.4, 30)), mat(0xf8c7dc)), 0, 0.8, -12);
    colliders.push({ x: 0, z: -12, r: 3.9 });
    const bulbMat = track(new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    for (const [cx, cz] of [[0, -12], [0, 4]]) {
      const ring = add(new THREE.Mesh(geo(new THREE.TorusGeometry(1.6, 0.08, 8, 28)), mat(0xe9b84a)), cx, H - 2.1, cz);
      ring.rotation.x = Math.PI / 2;
      add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6)), mat(0xe9b84a)), cx, H - 1.05, cz);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.17, 8, 6)), bulbMat), cx + Math.cos(a) * 1.6, H - 2.1, cz + Math.sin(a) * 1.6);
      }
    }
    // plantas e bancos
    for (const [x, z] of [[-13, 18], [13, 18], [-13, -21], [13, -21], [-6, 21], [6, 21]]) {
      add(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.45, 0.35, 0.8, 10)), mat(0xf5f5f5)), x, 0.4, z);
      add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.95, 10, 8)), mat(0x3f8f4f)), x, 1.5, z);
    }
    for (const z of [-2, 10]) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.5, 2.6)), mat(0xf5b7d0)), -5.2, 0.28, z);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.5, 2.6)), mat(0xf5b7d0)), 5.2, 0.28, z);
      colliders.push({ x: -5.2, z, r: 1.3 }, { x: 5.2, z, r: 1.3 });
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
      track(sp.material);
    }

    // ---- espelho (mostra a avatar de verdade) e estações
    const mirrorCanvas = document.createElement("canvas");
    mirrorCanvas.width = mirrorCanvas.height = 256;
    const mirrorTex = track(canvasTexture(mirrorCanvas));
    const mirrorMat = track(new THREE.MeshBasicMaterial({ map: mirrorTex }));
    const drawMirror = (src: HTMLCanvasElement | null) => {
      const g = mirrorCanvas.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, "#fbeaf3");
      grad.addColorStop(1, "#e7d8f7");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      if (src) {
        const sh = src.height * 0.5;
        const dw = 200;
        const dh = (dw * sh) / src.width;
        g.drawImage(src, 0, 0, src.width, sh, 28, 256 - dh + 6, dw, dh);
      }
      g.fillStyle = "rgba(255,255,255,0.28)";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(110, 0);
      g.lineTo(0, 110);
      g.fill();
      mirrorTex.needsUpdate = true;
    };
    drawMirror(null);
    const spots: Spot[] = [];
    const stationDefs: { cat: MallStation; label: string; x: number; title: string; tint: number }[] = [
      { cat: "makeup", label: "Maquiar", x: -7.5, title: "💄 Maquiagem", tint: 0xf5b7d0 },
      { cat: "hair", label: "Cabelo", x: 0, title: "💇‍♀️ Salão de cabelo", tint: 0xd8c2f0 },
      { cat: "skin", label: "Tom de pele", x: 7.5, title: "🎨 Pele", tint: 0xffd9a8 },
    ];
    const anchors: Record<MallZone, { x: number; z: number; yaw: number }> = {
      tunic: { x: 0, z: 0, yaw: 0 },
      head: { x: 0, z: 0, yaw: 0 },
      mantle: { x: 0, z: 0, yaw: 0 },
      shoes: { x: 0, z: 0, yaw: 0 },
      hand: { x: 0, z: 0, yaw: 0 },
      makeup: { x: -7.5, z: HL - 4.6, yaw: Math.PI },
      hair: { x: 0, z: HL - 4.6, yaw: Math.PI },
      skin: { x: 7.5, z: HL - 4.6, yaw: Math.PI },
    };
    for (const s of stationDefs) {
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(4.6, 4.2, 0.3)), mat(0xffffff)), s.x, 2.4, HL - 0.5);
      add(new THREE.Mesh(geo(new THREE.PlaneGeometry(3.7, 3.4)), mirrorMat), s.x, 2.4, HL - 0.66).rotation.y = Math.PI;
      for (let i = -2; i <= 2; i++) add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.16, 8, 6)), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })), s.x + i * 0.9, 4.6, HL - 0.62);
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(2.6, 0.9, 1)), mat(s.tint)), s.x, 0.45, HL - 1.3);
      const sp = textSprite(s.title, 4.2);
      sp.position.set(s.x, 5.5, HL - 0.8);
      scene.add(sp);
      track(sp.material);
      spots.push({ target: { kind: "station", cat: s.cat }, x: s.x, z: HL - 2.6, label: s.label });
      colliders.push({ x: s.x, z: HL - 1.3, r: 1.5 });
    }

    // ---- peças nas prateleiras (texturas chegam sob demanda)
    const placeholder = track(new THREE.SpriteMaterial({ color: 0xe8d4e0, transparent: true, opacity: 0.55, depthWrite: false }));
    const itemSprites = new Map<Placed, THREE.Sprite>();
    const spriteToPlaced = new Map<THREE.Object3D, Placed>();
    const textures: THREE.Texture[] = [];
    const placedByKey = new Map<string, Placed>();
    for (const p of layout.placed) {
      const sp = new THREE.Sprite(placeholder);
      sp.scale.set(p.w * 0.8, p.h * 0.8, 1);
      sp.position.set(p.x, p.y, p.z);
      scene.add(sp);
      itemSprites.set(p, sp);
      spriteToPlaced.set(sp, p);
      placedByKey.set(`${p.slot}:${p.fam.family}`, p);
      spots.push({ target: { kind: "item", slot: p.slot, family: p.fam.family }, x: p.x + p.face * 1.2, z: p.z, label: p.fam.base });
    }
    for (const slot of ["tunic", "head", "mantle", "shoes", "hand"] as Slot[]) {
      const items = layout.placed.filter((p) => p.slot === slot);
      const zs = items.map((p) => p.z);
      const face = items[0]?.face ?? 1;
      anchors[slot] = { x: -face * (HW - 3.1), z: (Math.min(...zs) + Math.max(...zs)) / 2, yaw: face === 1 ? Math.PI / 2 - 0.42 : -Math.PI / 2 + 0.42 };
    }
    const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(glowTexture("rgba(255,224,102,0.95)", "rgba(255,224,102,0)")), transparent: true, depthWrite: false, opacity: 0 })));
    scene.add(glow);
    const loading = new Set<Placed>();
    const loaded = new Set<Placed>();
    const bank = bankRef.current;
    const loadItem = (p: Placed) => {
      if (loading.has(p) || loaded.has(p) || !bank) return;
      const el = bank.querySelector(`[data-k="${p.slot}:${p.fam.family}"] svg`) as SVGSVGElement | null;
      if (!el) return;
      loading.add(p);
      svgToCanvas(el, 160)
        .then((c) => {
          const tex = canvasTexture(c);
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
    const avatarMat = track(new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false }));
    const avatar = new THREE.Sprite(avatarMat);
    const AV_H = 2.2;
    const AV_W = (AV_H * 200) / 360;
    avatar.scale.set(AV_W, AV_H, 1);
    avatar.center.set(0.5, 0);
    scene.add(avatar);
    const shadow = new THREE.Mesh(geo(new THREE.CircleGeometry(0.5, 20)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    scene.add(shadow);
    let avatarCanvas: HTMLCanvasElement | null = null;
    let mirrorBlank = false;
    let avatarFrames: THREE.Texture[] = [];
    let avatarShown = -1;
    let avatarBusy = false;
    let avatarPending: SVGSVGElement[] | null = null;
    const setAvatar = (svgs: SVGSVGElement[]) => {
      if (avatarBusy) {
        avatarPending = svgs;
        return;
      }
      avatarBusy = true;
      // 3 quadros: parada e os dois passos; no close do rosto só a parada, em alta resolução, para a make aparecer nítida
      const list = faceRef.current ? svgs.slice(0, 1) : svgs;
      Promise.all(list.map((svg) => svgToCanvas(svg, faceRef.current ? 900 : 300)))
        .then((cs) => {
          if (disposed) return;
          const texs = cs.map((c) => canvasTexture(c));
          avatarFrames.forEach((t) => t.dispose());
          avatarFrames = texs;
          avatarShown = 0;
          avatarMat.map = texs[0];
          avatarMat.needsUpdate = true;
          avatarCanvas = cs[0];
          drawMirror(faceRef.current ? null : cs[0]);
          mirrorBlank = faceRef.current;
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
      const svgs = [...(avatarBankRef.current?.querySelectorAll("svg") ?? [])] as SVGSVGElement[];
      if (svgs.length) setAvatar(svgs);
    }, 60);

    // ---- brilhos: poeira de estrelas no salão e explosão ao vestir
    const starTex = track(starTexture());
    const DUST = 90;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * (HW * 2 - 3);
      dustPos[i * 3 + 1] = Math.random() * 8;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * (HL * 2 - 3);
    }
    const dustGeo = geo(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ size: 0.22, map: starTex, transparent: true, depthWrite: false, color: 0xfff0b8, opacity: 0.8, blending: THREE.AdditiveBlending })));
    scene.add(dust);
    const BURST = 36;
    const burstPos = new Float32Array(BURST * 3);
    const burstVel = new Float32Array(BURST * 3);
    const burstGeo = geo(new THREE.BufferGeometry());
    burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
    const burstMat = track(new THREE.PointsMaterial({ size: 0.34, map: starTex, transparent: true, depthWrite: false, color: 0xffe066, opacity: 0, blending: THREE.AdditiveBlending }));
    const burstPts = new THREE.Points(burstGeo, burstMat);
    burstPts.frustumCulled = false;
    scene.add(burstPts);
    let burstT = 99;
    let twirl = 99;

    // ---- outras jogadoras (plateia): sprites que andam até a posição que chega pelo canal
    type Remote = { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; shadow: THREE.Mesh; tag: THREE.Sprite; frames: THREE.Texture[]; shown: number; x: number; z: number; fx: number; key: string; busy: boolean; phase: number; seen: number };
    const remotes = new Map<string, Remote>();
    const ensureRemote = (id: string, name: string): Remote => {
      let rm = remotes.get(id);
      if (rm) return rm;
      const mat = new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(AV_W, AV_H, 1);
      sprite.center.set(0.5, 0);
      sprite.visible = false;
      scene.add(sprite);
      const sh = new THREE.Mesh(geo(new THREE.CircleGeometry(0.5, 16)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })));
      sh.rotation.x = -Math.PI / 2;
      sh.visible = false;
      scene.add(sh);
      const tag = textSprite(name.trim().split(/\s+/)[0] || "Jogadora", 1.5, "#5b1f78");
      tag.visible = false;
      scene.add(tag);
      track(tag.material);
      rm = { sprite, mat, shadow: sh, tag, frames: [], shown: -1, x: 0, z: 0, fx: 1, key: "", busy: false, phase: Math.random() * 3, seen: 0 };
      remotes.set(id, rm);
      return rm;
    };
    peerSet.current = (id, name, svgs, key) => {
      const rm = ensureRemote(id, name);
      if (rm.key === key || rm.busy) return;
      rm.busy = true;
      Promise.all(svgs.map((svg) => svgToCanvas(svg, 240)))
        .then((cs) => {
          if (disposed) return;
          const texs = cs.map((c) => canvasTexture(c));
          rm.frames.forEach((t) => t.dispose());
          rm.frames = texs;
          rm.key = key;
          rm.shown = 0;
          rm.mat.map = texs[0];
          rm.mat.opacity = 1;
          rm.mat.needsUpdate = true;
        })
        .catch(() => undefined)
        .finally(() => {
          rm.busy = false;
        });
    };

    // ---- controles
    const keys = new Set<string>();
    const st = { x: 0, z: HL - 9, yaw: 0, pitch: 0.32, vx: 0, vz: 0, joyX: 0, joyY: 0, t: 0, walked: 0, movedSent: false, dist: 5, camY: 1.3, pe: 0.32, vs: 0, auto: null as null | { x: number; z: number; yaw: number }, yawGoal: null as null | number, faceX: 1 };
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
    type Ptr = { x0: number; y0: number; x: number; y: number; t0: number; role: "joy" | "look" };
    const ptrs = new Map<number, Ptr>();
    const raycaster = new THREE.Raycaster();
    const setKnob = (dx: number, dy: number) => {
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const joyBase = joyRef.current;
    /** Posição do toque no referencial da tela do jogo (que pode estar girada 90° por CSS quando o celular está em pé). */
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (rotatedRef.current) return { x: e.clientY - r.top, y: r.right - e.clientX, w: r.height, h: r.width };
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético ou já solto: segue sem captura */
      }
      const p = local(e);
      const left = p.x < p.w * 0.45 && e.pointerType === "touch";
      ptrs.set(e.pointerId, { x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now(), role: left ? "joy" : "look" });
      if (left && joyBase) {
        joyBase.style.left = `${p.x - 52}px`;
        joyBase.style.top = `${p.y - 52}px`;
        joyBase.style.bottom = "auto";
        joyBase.style.opacity = "1";
      }
    };
    const onMove = (e: PointerEvent) => {
      const q = ptrs.get(e.pointerId);
      if (!q) return;
      const p = local(e);
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      q.x = p.x;
      q.y = p.y;
      if (q.role === "joy") {
        const jx = Math.max(-1, Math.min(1, (q.x - q.x0) / 52));
        const jy = Math.max(-1, Math.min(1, (q.y - q.y0) / 52));
        const len = Math.hypot(jx, jy);
        const k = len > 1 ? 1 / len : 1;
        st.joyX = jx * k;
        st.joyY = jy * k;
        setKnob(st.joyX * 34, st.joyY * 34);
      } else {
        st.yaw -= dx * 0.0065;
        st.pitch = Math.max(0.05, Math.min(0.9, st.pitch + dy * 0.004));
        st.yawGoal = null;
      }
    };
    const onUp = (e: PointerEvent) => {
      const q = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (!q) return;
      if (q.role === "joy") {
        st.joyX = st.joyY = 0;
        setKnob(0, 0);
        if (joyBase) {
          joyBase.style.opacity = "0.5";
          joyBase.style.left = "";
          joyBase.style.top = "";
          joyBase.style.bottom = "";
        }
        return;
      }
      // toque curto sem arrastar = tentar pegar a peça tocada
      if (Math.hypot(q.x - q.x0, q.y - q.y0) < 8 && performance.now() - q.t0 < 380) {
        const p = local(e);
        raycaster.setFromCamera(new THREE.Vector2((p.x / p.w) * 2 - 1, -((p.y / p.h) * 2 - 1)), camera);
        const hits = raycaster.intersectObjects([...spriteToPlaced.keys()], false);
        const hit = hits[0] ? spriteToPlaced.get(hits[0].object) : undefined;
        if (hit) {
          if (Math.hypot(hit.x - st.x, hit.z - st.z) > 7.5) sayRef.current("Chegue mais perto da prateleira para pegar a peça. Dica: o botão 🧭 leva você até lá!");
          else selectRef.current?.({ kind: "item", slot: hit.slot, family: hit.fam.family });
        }
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    let vw = 300;
    let vh = 400;
    const resize = () => {
      const w = host.clientWidth || 300;
      const h = host.clientHeight || 400;
      vw = w;
      vh = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 66 : w / h > 1.6 ? 62 : 54;
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
    let posT = 0;
    let glowItem: Placed | null = null;
    const camPos = new THREE.Vector3(0, 6, HL - 3);
    const tmp = new THREE.Vector3();
    const lerpAngle = (a: number, b: number, k: number) => {
      let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (d < -Math.PI) d += Math.PI * 2;
      return a + d * k;
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      st.t += dt;
      burstT += dt;
      twirl += dt;
      // direção desejada (no referencial da câmera)
      let ix = st.joyX;
      let iz = st.joyY;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iz -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iz += 1;
      const len = Math.hypot(ix, iz);
      if (len > 0.08 && st.auto) st.auto = null; // mexeu no controle: cancela o "ir até lá"
      if (len > 1) {
        ix /= len;
        iz /= len;
      }
      const sy = Math.sin(st.yaw);
      const cy = Math.cos(st.yaw);
      let tvx = 0;
      let tvz = 0;
      if (st.auto) {
        const dx = st.auto.x - st.x;
        const dz = st.auto.z - st.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.35) {
          if (st.yawGoal === null) st.yawGoal = st.auto.yaw;
          st.auto = null;
        } else {
          tvx = (dx / d) * 7.5;
          tvz = (dz / d) * 7.5;
          st.yawGoal = st.auto.yaw;
        }
      } else if (len > 0.05) {
        const speed = (keys.has("shift") ? 8.5 : 5.2) * Math.min(1, len);
        const wx = ix * cy + iz * sy;
        const wz = -ix * sy + iz * cy;
        const dl = Math.hypot(wx, wz) || 1;
        tvx = (wx / dl) * speed;
        tvz = (wz / dl) * speed;
      }
      st.vx += (tvx - st.vx) * Math.min(1, dt * 12);
      st.vz += (tvz - st.vz) * Math.min(1, dt * 12);
      st.x += st.vx * dt;
      st.z += st.vz * dt;
      st.walked += Math.hypot(st.vx, st.vz) * dt;
      if (!st.movedSent && st.walked > 6) {
        st.movedSent = true;
        onEventRef.current?.({ type: "move" });
      }
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
      if (st.yawGoal !== null) {
        st.yaw = lerpAngle(st.yaw, st.yawGoal, Math.min(1, dt * 3.2));
        if (Math.abs(((st.yawGoal - st.yaw + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.02) st.yawGoal = null;
      }
      const moving = Math.hypot(st.vx, st.vz);
      const mv = Math.min(1, moving / 3);
      // para que lado a avatar anda na tela (vira o desenho) e passinhos
      const lateral = st.vx * cy - st.vz * sy;
      if (Math.abs(lateral) > 0.6) st.faceX = lateral > 0 ? 1 : -1;
      const bob = Math.abs(Math.sin(st.t * 9)) * 0.12 * mv;
      const spin = twirl < 0.55 ? Math.cos((twirl / 0.55) * Math.PI) : 1;
      avatar.scale.set(AV_W * st.faceX * spin * (1 + Math.sin(st.t * 9) * 0.01 * mv), AV_H * (1 - 0.02 * Math.abs(Math.cos(st.t * 9)) * mv), 1);
      avatar.position.set(st.x, bob + (twirl < 0.55 ? Math.sin((twirl / 0.55) * Math.PI) * 0.35 : 0), st.z);
      avatarMat.rotation = Math.sin(st.t * 9) * 0.03 * mv - 0.03 * st.faceX * mv;
      if (avatarFrames.length === 3) {
        const want = mv > 0.3 ? [1, 0, 2, 0][Math.floor(st.t * 9) % 4] : 0;
        if (want !== avatarShown) {
          avatarShown = want;
          avatarMat.map = avatarFrames[want];
        }
      }
      shadow.position.set(st.x, 0.03, st.z);
      shadow.scale.setScalar(1 - bob * 1.2);

      const spec = spectateRef.current;
      avatar.visible = !spec;
      shadow.visible = !spec;
      // plateia: a câmera segue a jogadora escolhida
      if (spec && followRef.current) {
        const fp = positionsRef.current?.current[followRef.current];
        if (fp) {
          st.x += (fp.x - st.x) * Math.min(1, dt * 4);
          st.z += (fp.z - st.z) * Math.min(1, dt * 4);
          st.auto = null;
        }
      }
      // jogadora: avisa onde está (só chega alguém se houver plateia; ver Camarim)
      posT += dt;
      if (!spec && posT > (mv > 0.2 ? 0.45 : 1.6)) {
        posT = 0;
        onPosRef.current?.({ x: st.x, z: st.z, fx: st.faceX as 1 | -1, mv });
      }
      // outras jogadoras andando no salão
      if (spec) {
        const live = positionsRef.current?.current ?? {};
        const nowMs = Date.now();
        for (const [id, rm] of remotes) {
          if (!live[id]) {
            rm.sprite.visible = false;
            rm.shadow.visible = false;
            rm.tag.visible = false;
          }
        }
        for (const [id, pos] of Object.entries(live)) {
          const rm = remotes.get(id);
          if (!rm || !rm.frames.length) continue;
          if (!rm.seen) {
            rm.x = pos.x;
            rm.z = pos.z;
          }
          rm.seen = nowMs;
          rm.x += (pos.x - rm.x) * Math.min(1, dt * 6);
          rm.z += (pos.z - rm.z) * Math.min(1, dt * 6);
          const moving = nowMs - pos.t < 1800 ? pos.mv : 0;
          rm.phase += dt;
          const bobR = Math.abs(Math.sin(rm.phase * 9)) * 0.12 * moving;
          rm.fx = pos.fx;
          rm.sprite.visible = true;
          rm.shadow.visible = true;
          rm.tag.visible = true;
          rm.sprite.scale.set(AV_W * rm.fx, AV_H, 1);
          rm.sprite.position.set(rm.x, bobR, rm.z);
          rm.shadow.position.set(rm.x, 0.03, rm.z);
          rm.tag.position.set(rm.x, AV_H + 0.45, rm.z);
          if (rm.frames.length === 3) {
            const want = moving > 0.3 ? [1, 0, 2, 0][Math.floor(rm.phase * 9) % 4] : 0;
            if (want !== rm.shown) {
              rm.shown = want;
              rm.mat.map = rm.frames[want];
            }
          }
        }
      }

      // câmera: entrada de cinema, depois atrás da jogadora (ou de perto da peça escolhida)
      const intro = Math.max(0, 1 - st.t / 1.8);
      const focus = focusRef.current;
      const faceMode = faceRef.current;
      // no close do rosto o espelho fica vazio (senão aparece um segundo rosto atrás dela)
      if (faceMode !== mirrorBlank && avatarCanvas) {
        mirrorBlank = faceMode;
        drawMirror(faceMode ? null : avatarCanvas);
      }
      const wantDist = faceMode ? 2.0 : (focus ? focus.dist : 5.8) + intro * 4;
      const wantY = faceMode ? 1.84 : focus ? focus.y : 1.3;
      st.dist += (wantDist - st.dist) * Math.min(1, dt * 4);
      st.camY += (wantY - st.camY) * Math.min(1, dt * 4);
      st.pe += ((faceMode ? 0.04 : st.pitch + intro * 0.5) - st.pe) * Math.min(1, dt * 4);
      const pitch = st.pe;
      // com o painel aberto no lado direito, o rosto aparece na metade livre da tela
      const wantShift = faceMode && landRef.current ? Math.min(0.54, 460 / vw) / 2 + 0.02 : 0;
      st.vs += (wantShift - st.vs) * Math.min(1, dt * 5);
      if (Math.abs(st.vs) > 0.002) camera.setViewOffset(vw, vh, st.vs * vw, 0, vw, vh);
      else if (camera.view) camera.clearViewOffset();
      tmp.set(st.x + Math.sin(st.yaw) * st.dist * Math.cos(pitch), st.camY + 0.3 + st.dist * Math.sin(pitch), st.z + Math.cos(st.yaw) * st.dist * Math.cos(pitch));
      tmp.x = Math.max(-HW + 0.6, Math.min(HW - 0.6, tmp.x));
      tmp.z = Math.max(-HL + 0.6, Math.min(HL - 1.9, tmp.z));
      camPos.lerp(tmp, Math.min(1, dt * 10));
      camera.position.copy(camPos);
      camera.lookAt(st.x, st.camY, st.z);
      const sx = st.x - camPos.x;
      const sz = st.z - camPos.z;
      const sl = sx * sx + sz * sz || 1;
      for (const c of columns) {
        const t = Math.max(0, Math.min(1, ((c.x - camPos.x) * sx + (c.z - camPos.z) * sz) / sl));
        const hide = Math.hypot(camPos.x + sx * t - c.x, camPos.z + sz * t - c.z) < 1.5 || Math.hypot(camPos.x - c.x, camPos.z - c.z) < 2.6;
        for (const m of c.parts) m.visible = !hide;
      }

      // peça/estação mais perto + destaque dourado
      nearT += dt;
      loadT += dt;
      if (nearT > 0.1 && !spec) {
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
          glowItem = best && best.target.kind === "item" ? (placedByKey.get(`${best.target.slot}:${best.target.family}`) ?? null) : null;
          if (best && best.target.kind === "item") onEventRef.current?.({ type: "near", slot: best.target.slot });
        }
      }
      for (const [p, sp] of itemSprites) {
        if (!loaded.has(p)) continue;
        const target = glowItem === p ? 1.14 + Math.sin(st.t * 6) * 0.04 : 1;
        const cur = sp.scale.x / p.w;
        const nx = cur + (target - cur) * Math.min(1, dt * 10);
        sp.scale.set(p.w * nx, p.h * nx, 1);
      }
      if (glowItem) {
        glow.position.set(glowItem.x - glowItem.face * 0.05, glowItem.y, glowItem.z);
        glow.scale.set(glowItem.w * 1.9, glowItem.h * 1.7, 1);
        (glow.material as THREE.SpriteMaterial).opacity += (0.9 - (glow.material as THREE.SpriteMaterial).opacity) * Math.min(1, dt * 8);
      } else {
        (glow.material as THREE.SpriteMaterial).opacity += (0 - (glow.material as THREE.SpriteMaterial).opacity) * Math.min(1, dt * 8);
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
      // brilhos
      const dp = dustGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < DUST; i++) {
        let y = dp.getY(i) + dt * (0.15 + (i % 5) * 0.04);
        if (y > 8.5) y = 0.2;
        dp.setY(i, y);
        dp.setX(i, dp.getX(i) + Math.sin(st.t * 0.6 + i) * dt * 0.1);
      }
      dp.needsUpdate = true;
      if (burstT < 1.1) {
        const bp = burstGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < BURST; i++) {
          bp.setXYZ(i, bp.getX(i) + burstVel[i * 3] * dt, bp.getY(i) + burstVel[i * 3 + 1] * dt, bp.getZ(i) + burstVel[i * 3 + 2] * dt);
          burstVel[i * 3 + 1] -= dt * 2.2;
        }
        bp.needsUpdate = true;
        burstMat.opacity = Math.max(0, 1 - burstT / 1.1);
      } else burstMat.opacity = 0;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    burstRef.current = () => {
      burstT = 0;
      twirl = 0;
      for (let i = 0; i < BURST; i++) {
        const a = (i / BURST) * Math.PI * 2;
        const sp = 1.2 + Math.random() * 1.8;
        burstPos[i * 3] = st.x;
        burstPos[i * 3 + 1] = 1.2 + Math.random() * 0.8;
        burstPos[i * 3 + 2] = st.z;
        burstVel[i * 3] = Math.cos(a) * sp;
        burstVel[i * 3 + 1] = 1.2 + Math.random() * 1.6;
        burstVel[i * 3 + 2] = Math.sin(a) * sp;
      }
      (burstGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    };
    goToRef.current = (z) => {
      const a = anchors[z];
      st.auto = { x: a.x, z: a.z, yaw: a.yaw };
      st.yawGoal = a.yaw;
    };
    selectRef.current = (t) => {
      if (t.kind === "station") {
        onEventRef.current?.({ type: "station", cat: t.cat });
        onStationRef.current(t.cat);
        return;
      }
      const f = familiesBySlot(t.slot).find((x) => x.family === t.family);
      if (!f) return;
      const worn = lookRef.current[t.slot];
      if (!worn || ITEM_BY_ID.get(worn)?.family !== t.family) {
        onEquipRef.current(t.slot, f.items[0].id);
        burstRef.current?.();
        onEventRef.current?.({ type: "equip", slot: t.slot });
      }
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
      goToRef.current = null;
      burstRef.current = null;
      textures.forEach((t) => t.dispose());
      avatarFrames.forEach((t) => t.dispose());
      remotes.forEach((rm) => rm.frames.forEach((t) => t.dispose()));
      peerSet.current = null;
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [layout]);

  const allFams = useMemo(() => SLOTS.flatMap((s) => familiesBySlot(s.key).map((f) => ({ slot: s.key, f }))), []);
  const panelFams = useMemo(() => (panel ? familiesBySlot(panel.slot) : []), [panel]);
  const panelFam = panel ? panelFams.find((f) => f.family === panel.family) : undefined;
  const worn = panel ? look[panel.slot] : undefined;

  function pickVariant(slot: Slot, id: string | undefined) {
    const prev = look[slot];
    onEquip(slot, id);
    burstRef.current?.();
    if (id && prev && ITEM_BY_ID.get(prev)?.family === ITEM_BY_ID.get(id)?.family && prev !== id) onEvent?.({ type: "color", slot });
    else if (id) onEvent?.({ type: "equip", slot });
  }
  function browse(dir: 1 | -1) {
    if (!panel || panelFams.length === 0) return;
    const i = panelFams.findIndex((f) => f.family === panel.family);
    const next = panelFams[(i + dir + panelFams.length) % panelFams.length];
    setPanel({ slot: panel.slot, family: next.family });
    pickVariant(panel.slot, next.items[0].id);
  }

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
      {spectate ? (
        <div ref={peerBankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, pointerEvents: "none", overflow: "hidden" }}>
          {(roster ?? []).slice(0, 16).map((p) => {
            const pb = baseFromBeauty(cleanBeauty(p.beauty));
            const pl: Look = { ...p.look, tunic: p.look.tunic ?? "tunic_simple" };
            return (
              <div key={`${p.id}-${JSON.stringify([p.look, p.beauty])}`} data-peer={p.id}>
                <PaperDoll base={pb} look={pl} />
                <PaperDoll base={pb} look={pl} step={1} />
                <PaperDoll base={pb} look={pl} step={-1} />
              </div>
            );
          })}
        </div>
      ) : null}
      <div ref={avatarBankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, pointerEvents: "none", overflow: "hidden" }}>
        <PaperDoll base={base} look={look} />
        <PaperDoll base={base} look={look} step={1} />
        <PaperDoll base={base} look={look} step={-1} />
      </div>

      {!ready ? <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm font-black text-purple-900">Abrindo a loja…</p> : null}

      {/* joystick */}
      <div ref={joyRef} aria-hidden className={`pointer-events-none absolute z-[3] h-[104px] w-[104px] rounded-full border-2 border-white/70 bg-white/20 ${mobile ? "" : "[@media(hover:hover)]:hidden"}`} style={{ left: 22, bottom: 66, opacity: 0.5 }}>
        <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-[20px] -mt-[20px] h-[40px] w-[40px] rounded-full bg-white/85 shadow" />
      </div>
      <p className="pointer-events-none absolute bottom-16 left-2 hidden rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white [@media(hover:hover)]:block">WASD ou setas para andar · arraste para girar · toque na peça</p>

      {/* atalhos: ir até cada parte do salão */}
      <div className="absolute left-2 top-14 z-[4]" hidden={spectate}>
        <button type="button" className="vh-chip !px-3 !py-1.5 !text-xs" data-on={menu} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
          🧭 Ir para…
        </button>
        {menu ? (
          <div className="vh-panel vh-pop mt-1.5 grid grid-cols-4 gap-1.5 !p-2">
            {ZONES.map((z) => (
              <button
                key={z.key}
                type="button"
                className="flex w-14 flex-col items-center rounded-xl border border-amber-300/50 bg-white/10 px-1 py-1.5 text-[10px] font-black leading-tight text-amber-50 active:scale-95"
                onClick={() => {
                  goToRef.current?.(z.key);
                  onEvent?.({ type: "goto" });
                  setMenu(false);
                  setPanel(null);
                }}
              >
                <span className="text-xl" aria-hidden>
                  {z.icon}
                </span>
                {z.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {toast ? <p className="pointer-events-none absolute inset-x-10 top-14 z-[6] mx-auto max-w-sm rounded-xl bg-purple-900/90 px-3 py-2 text-center text-xs font-bold text-white">{toast}</p> : null}

      {!quiet && near && !(panel && near.target.kind === "item" && panel.family === near.target.family) ? (
        <div className="pointer-events-none absolute bottom-16 z-[5] flex max-w-[48%] justify-end" style={{ right: panel ? 204 : 12 }}>
          <button type="button" className="vh-btn pointer-events-auto !w-auto !px-5 !py-3 !text-sm shadow-[0_0_24px_rgba(255,224,102,0.7)]" onClick={() => selectRef.current?.(near.target)}>
            {near.target.kind === "station" ? `✨ ${near.label}` : `🛍 ${near.label}`}
          </button>
        </div>
      ) : null}

      {!quiet && panel && panelFam ? (
        <div className="absolute right-2 top-14 z-[6] w-[188px] rounded-2xl border-2 border-white/80 bg-purple-600/95 p-2.5 shadow-xl">
          <div className="mb-1.5 flex items-start justify-between gap-1">
            <p className="text-xs font-black leading-tight text-white">
              {panelFam.base}
              <span className="block text-[10px] font-bold text-purple-100">{worn ? ITEM_BY_ID.get(worn)?.name : "Escolha a cor"}</span>
            </p>
            <button type="button" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500 text-xs font-black text-white" aria-label="Fechar" onClick={() => setPanel(null)}>
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
                className="relative aspect-square rounded-full border-2 shadow active:scale-90"
                style={{ background: it.p.c, borderColor: worn === it.id ? "#ffe066" : "rgba(255,255,255,0.7)", transform: worn === it.id ? "scale(1.14)" : undefined }}
                onClick={() => pickVariant(panel.slot, it.id)}
              >
                {it.p.c2 ? <i className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white/70" style={{ background: it.p.c2 }} /> : null}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm font-black text-purple-900 active:scale-90" aria-label="Peça anterior" onClick={() => browse(-1)}>
              ◀
            </button>
            {worn && ITEM_BY_ID.get(worn)?.family === panel.family ? (
              <button
                type="button"
                className="min-w-0 flex-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-purple-900"
                onClick={() => {
                  onEquip(panel.slot, undefined);
                  setPanel(null);
                }}
              >
                Tirar peça
              </button>
            ) : (
              <span className="min-w-0 flex-1 text-center text-[10px] font-bold text-purple-100">
                {panelFams.findIndex((f) => f.family === panel.family) + 1}/{panelFams.length}
              </span>
            )}
            <button type="button" className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm font-black text-purple-900 active:scale-90" aria-label="Próxima peça" onClick={() => browse(1)}>
              ▶
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
