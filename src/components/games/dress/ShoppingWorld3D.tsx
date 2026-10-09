"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PaperDoll } from "./PaperDoll";
import { useLandscape } from "./LandscapeShell";
import { canvasTexture, svgToCanvas } from "./MallStore3D";
import { buildConcourse, buildStore, emojiTexture, type Interact, type Place } from "./mallScene";
import { baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import type { DollBase } from "@/lib/games/dress/characters";
import type { HallPos, HallRoster } from "@/lib/games/dress/hall";
import type { Look } from "@/lib/games/dress/items";
import { ITEM_BY_ID } from "@/lib/games/dress/items";
import { ESC_X1, FLOOR_COUNT, FLOOR_INFO, RESTAURANTS, STORES, STORE_HL, STORES as ALL_STORES, BOOTH, INFO_DESK, counterFront, doorSpawn, floorAt, floorHalfZ, floorY, offerItem, routeBetween, storeById, storeShelves, type Pt, type RareOffer } from "@/lib/games/dress/shopping";
import { ESC_SPEED, RUN, WALK, stepBody, type Body } from "@/lib/games/dress/mallPhysics";
import { step as sfxStep } from "@/lib/games/dress/sfx";

export type WorldPlace = { kind: "mall" } | { kind: "store"; id: string };
export type WorldPos = { x: number; z: number; y: number; fx: 1 | -1; mv: number; s: 0 | 1; e: string; w: string };
export type GotoTarget = { kind: "floor"; floor: number } | { kind: "booth" } | { kind: "info" } | { kind: "store"; id: string } | { kind: "restaurant"; key: string } | { kind: "exit" } | { kind: "rare"; id: number };

const AV_H = 2.2;
const AV_W = (AV_H * 200) / 360;

/**
 * O Madureira Shopping em 3D, em terceira pessoa: o corredor de 5 andares (escadas rolantes, praça de alimentação, cabine de bilhetes)
 * e o interior de cada loja, todos no mesmo mundo online. A jogadora anda, pula, senta e come.
 */
export function ShoppingWorld3D({
  base,
  look,
  place,
  placeNonce,
  roster,
  positions,
  offers,
  owned,
  onPos,
  onNear,
  onAct,
  onFloor,
  gotoRef,
  eatRef,
  leftSlot,
  leftBelow,
  say,
}: {
  base: DollBase;
  look: Look;
  place: WorldPlace;
  placeNonce: number;
  roster: HallRoster[];
  positions: React.MutableRefObject<Record<string, HallPos>>;
  offers: RareOffer[];
  owned: Set<string>;
  onPos: (p: WorldPos) => void;
  onNear: (i: Interact | null) => void;
  onAct: (i: Interact) => void;
  onFloor?: (f: number) => void;
  gotoRef: React.MutableRefObject<((t: GotoTarget) => void) | null>;
  eatRef: React.MutableRefObject<((emoji: string, sec: number) => void) | null>;
  leftSlot?: React.ReactNode;
  leftBelow?: React.ReactNode;
  say?: (m: string) => void;
}) {
  const { rotated, mobile } = useLandscape();
  const hostRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const avatarBankRef = useRef<HTMLDivElement>(null);
  const peerBankRef = useRef<HTMLDivElement>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [near, setNear] = useState<Interact | null>(null);
  const [canSit, setCanSit] = useState(false);
  const [sitting, setSitting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [floor, setFloor] = useState(0);

  const rotatedRef = useRef(rotated);
  const onPosRef = useRef(onPos);
  const onNearRef = useRef(onNear);
  const onActRef = useRef(onAct);
  const onFloorRef = useRef(onFloor);
  const positionsRef = useRef(positions);
  const offersRef = useRef(offers);
  const ownedRef = useRef(owned);
  const sayRef = useRef(say);
  const nearRef = useRef<Interact | null>(null);
  const placeRef = useRef(place);
  const setPlaceRef = useRef<((p: WorldPlace) => void) | null>(null);
  const avatarSet = useRef<((svgs: SVGSVGElement[]) => void) | null>(null);
  const peerSet = useRef<((id: string, name: string, svgs: SVGSVGElement[], key: string) => void) | null>(null);
  const jumpRef = useRef<(() => void) | null>(null);
  const sitRef = useRef<(() => void) | null>(null);
  const actRef = useRef<(() => void) | null>(null);
  const offersApply = useRef<(() => void) | null>(null);
  useEffect(() => {
    rotatedRef.current = rotated;
    onPosRef.current = onPos;
    onNearRef.current = onNear;
    onActRef.current = onAct;
    onFloorRef.current = onFloor;
    positionsRef.current = positions;
    sayRef.current = say;
    placeRef.current = place;
  });
  useEffect(() => {
    offersRef.current = offers;
    ownedRef.current = owned;
    offersApply.current?.();
  }, [offers, owned]);

  // peças desenhadas escondidas: as prateleiras da loja atual e as ofertas raras viram textura 3D
  const bankItems = useMemo(() => {
    if (place.kind !== "store") return [] as { k: string; slot: Parameters<typeof PaperDoll>[0]["only"]; id: string }[];
    const def = storeById(place.id);
    const out: { k: string; slot: Parameters<typeof PaperDoll>[0]["only"]; id: string }[] = [];
    for (const p of storeShelves(def?.slots ?? []).placed) out.push({ k: `${p.slot}:${p.item.id}`, slot: p.slot, id: p.item.id });
    for (const o of offers) {
      const it = offerItem(o.family);
      if (it) out.push({ k: `${it.slot}:${it.id}`, slot: it.slot, id: it.id });
    }
    return out;
  }, [place, offers]);

  const rosterKey = JSON.stringify(roster.map((p) => [p.id, p.look, p.beauty]));
  useEffect(() => {
    const t = setTimeout(() => {
      for (const p of roster.slice(0, 24)) {
        const el = peerBankRef.current?.querySelector(`[data-peer="${p.id}"]`);
        const svgs = el ? ([...el.querySelectorAll("svg")] as SVGSVGElement[]) : [];
        if (svgs.length) peerSet.current?.(p.id, p.name, svgs, JSON.stringify([p.look, p.beauty]));
      }
    }, 40);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  // a avatar acompanha o look
  const lookKey = JSON.stringify(look);
  useEffect(() => {
    const t = setTimeout(() => {
      const svgs = [...(avatarBankRef.current?.querySelectorAll("svg") ?? [])] as SVGSVGElement[];
      if (svgs.length) avatarSet.current?.(svgs);
    }, 40);
    return () => clearTimeout(t);
  }, [lookKey, base]);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setClearColor(0xdcecff);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block";
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xdcecff, 40, 120);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 160);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9bfe0, 1.45));
    const sun = new THREE.DirectionalLight(0xfff3e0, 0.8);
    sun.position.set(14, 30, 10);
    scene.add(sun);
    let disposed = false;
    const own: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      own.push(o);
      return o;
    };

    // ---- avatar da jogadora
    const avatarMat = track(new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false }));
    const avatar = new THREE.Sprite(avatarMat);
    avatar.scale.set(AV_W, AV_H, 1);
    avatar.center.set(0.5, 0);
    scene.add(avatar);
    const legsMat = track(new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false }));
    const legs = new THREE.Sprite(legsMat);
    legs.center.set(0.5, 0);
    legs.visible = false;
    scene.add(legs);
    const shadow = new THREE.Mesh(track(new THREE.CircleGeometry(0.5, 20)), track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })));
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
    const foodMat = track(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    const food = new THREE.Sprite(foodMat);
    food.visible = false;
    scene.add(food);
    let avatarFrames: THREE.Texture[] = [];
    let avatarShown = -1;
    let avatarBusy = false;
    let avatarPending: SVGSVGElement[] | null = null;
    let avatarTries = 0;
    let avatarCanvas: HTMLCanvasElement | null = null;
    let sitOn = false;
    let sitTex: { src: THREE.Texture; up: THREE.Texture; lo: THREE.Texture } | null = null;
    const setAvatar = (svgs: SVGSVGElement[]) => {
      if (avatarBusy) {
        avatarPending = svgs;
        return;
      }
      avatarBusy = true;
      Promise.allSettled(svgs.map((svg) => svgToCanvas(svg, 300)))
        .then((res) => {
          if (disposed) return;
          const idle = res[0];
          if (idle.status !== "fulfilled") throw new Error("avatar");
          const cs = res.map((x) => (x.status === "fulfilled" ? x.value : idle.value));
          const texs = cs.map((c) => canvasTexture(c));
          avatarFrames.forEach((t) => t.dispose());
          avatarFrames = texs;
          avatarShown = -1;
          avatarCanvas = cs[0];
          current?.setMirror(avatarCanvas);
          setReady(true);
        })
        .catch(() => {
          if (!disposed && avatarFrames.length === 0 && avatarTries++ < 6) setTimeout(() => !disposed && setAvatar(svgs), 700);
        })
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

    // ---- outras jogadoras
    type Remote = { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; legs: THREE.Sprite; shadow: THREE.Mesh; tag: THREE.Sprite; food: THREE.Sprite; frames: THREE.Texture[]; shown: number; x: number; y: number; z: number; fx: number; key: string; busy: boolean; phase: number };
    const remotes = new Map<string, Remote>();
    const nameTag = (text: string): THREE.Sprite => {
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
      g.fillStyle = "#5b1f78";
      g.font = "900 52px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 256, 66);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.set(1.5, 0.375, 1);
      return sp;
    };
    const ensureRemote = (id: string, name: string): Remote => {
      let rm = remotes.get(id);
      if (rm) return rm;
      const mat = new THREE.SpriteMaterial({ transparent: true, color: 0xffffff, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(AV_W, AV_H, 1);
      sprite.center.set(0.5, 0);
      sprite.visible = false;
      scene.add(sprite);
      const lg = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      lg.center.set(0.5, 0);
      lg.visible = false;
      scene.add(lg);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
      sh.rotation.x = -Math.PI / 2;
      sh.visible = false;
      scene.add(sh);
      const tag = nameTag(name.trim().split(/\s+/)[0] || "Jogadora");
      tag.visible = false;
      scene.add(tag);
      const fd = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      fd.scale.set(0.7, 0.7, 1);
      fd.visible = false;
      scene.add(fd);
      rm = { sprite, mat, legs: lg, shadow: sh, tag, food: fd, frames: [], shown: -1, x: 0, y: 0, z: 0, fx: 1, key: "", busy: false, phase: Math.random() * 3 };
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
          rm.shown = -1;
          rm.mat.map = texs[0];
          rm.mat.opacity = 1;
          rm.mat.needsUpdate = true;
        })
        .catch(() => undefined)
        .finally(() => {
          rm.busy = false;
        });
    };

    // ---- estado da jogadora
    const keys = new Set<string>();
    const st = {
      b: { x: 0, z: 16, y: 0, vx: 0, vz: 0, vy: 0, grounded: true } as Body,
      yaw: 0,
      pitch: 0.32,
      joyX: 0,
      joyY: 0,
      t: 0,
      dist: 6.2,
      ey: 0,
      faceX: 1,
      back: false,
      jump: false,
      sit: null as null | { x: number; z: number; y: number; dir: 1 | -1 },
      path: [] as Pt[],
      eat: null as null | { emoji: string; t: number; dur: number },
      floor: 0,
      posT: 0,
      stuck: 0,
      prog: 0,
      px: 0,
      pz: 0,
    };
    if (process.env.NODE_ENV !== "production") (window as unknown as { __shop?: unknown }).__shop = st;

    // ---- lugares
    let current: Place | null = null;
    let mallPlace: Place | null = null;
    const loadingQ: ReturnType<typeof setTimeout>[] = [];
    const mkPlace = (p: WorldPlace): Place => {
      if (p.kind === "mall") {
        mallPlace ??= buildConcourse();
        return mallPlace;
      }
      const def = storeById(p.id) ?? STORES[0];
      return buildStore(def, { offers: offersRef.current, owned: ownedRef.current });
    };
    const setPlace = (p: WorldPlace, prevStore?: string) => {
      if (current) {
        scene.remove(current.group);
        if (current !== mallPlace) current.dispose();
      }
      loadingQ.forEach(clearTimeout);
      current = mkPlace(p);
      scene.add(current.group);
      renderer.setClearColor(current.clear);
      const fog = scene.fog as THREE.Fog;
      fog.color.set(current.fog[0]);
      fog.near = current.fog[1];
      fog.far = current.fog[2];
      let sp = current.spawn;
      if (p.kind === "mall" && prevStore) {
        const def = storeById(prevStore);
        if (def) {
          const d = doorSpawn(def);
          sp = { x: d.x, z: d.z, y: floorY(def.floor), yaw: def.side < 0 ? 0 : Math.PI };
        }
      }
      Object.assign(st.b, { x: sp.x, z: sp.z, y: sp.y, vx: 0, vz: 0, vy: 0, grounded: true });
      st.yaw = sp.yaw;
      st.ey = sp.y;
      st.sit = null;
      st.path = [];
      setSitting(false);
      setMenu(false);
      current.setOwned(ownedRef.current);
      if (avatarCanvas) current.setMirror(avatarCanvas);
      nearKey = "";
      nearRef.current = null;
      setNear(null);
      onNearRef.current(null);
      scheduleLoads();
    };
    setPlaceRef.current = (p) => setPlace(p, placeRef.current.kind === "store" ? undefined : lastStore);
    let lastStore: string | undefined;
    let prevKind: "mall" | "store" = "mall";
    const switchTo = (p: WorldPlace) => {
      const leaving = prevKind === "store" ? lastStore : undefined;
      if (p.kind === "store") lastStore = p.id;
      setPlace(p, p.kind === "mall" ? leaving : undefined);
      prevKind = p.kind;
    };
    setPlaceRef.current = switchTo;

    // textura das peças das prateleiras (sob demanda)
    const scheduleLoads = () => {
      loadingQ.forEach(clearTimeout);
      loadingQ.length = 0;
    };
    const textures: THREE.Texture[] = [];
    const loadNear = () => {
      if (!current || !current.items.length) return;
      const bank = bankRef.current;
      if (!bank) return;
      let started = 0;
      const cands = current.items.filter((it) => !it.loaded && !it.loading).sort((a, b) => Math.hypot(a.x - st.b.x, a.z - st.b.z) - Math.hypot(b.x - st.b.x, b.z - st.b.z));
      for (const it of cands) {
        if (started >= 6) break;
        if (Math.hypot(it.x - st.b.x, it.z - st.b.z) > 34) break;
        const el = bank.querySelector(`[data-k="${it.slot}:${it.itemId}"] svg`) as SVGSVGElement | null;
        if (!el) continue;
        it.loading = true;
        started++;
        svgToCanvas(el, 160)
          .then((c) => {
            const tex = canvasTexture(c);
            textures.push(tex);
            if (disposed || current?.items.indexOf(it) === -1 || current === null) {
              tex.dispose();
              return;
            }
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
            textures.push(mat as unknown as THREE.Texture);
            it.sprite.material = mat;
            it.sprite.scale.set(it.w, it.h, 1);
            it.loaded = true;
          })
          .catch(() => undefined)
          .finally(() => {
            it.loading = false;
          });
      }
    };
    offersApply.current = () => {
      current?.setOffers(offersRef.current);
      current?.setOwned(ownedRef.current);
    };

    // ---- controles
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        if (down) keys.add(k);
        else keys.delete(k);
        e.preventDefault();
      } else if (down && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (k === " " || k === "spacebar") {
          jumpRef.current?.();
          e.preventDefault();
        } else if (k === "e" || k === "f" || k === "enter") {
          if (nearRef.current) actRef.current?.();
          else sitRef.current?.();
        }
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
    const joyBase = joyRef.current;
    const setKnob = (dx: number, dy: number) => {
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (rotatedRef.current) return { x: e.clientY - r.top, y: r.right - e.clientX, w: r.height, h: r.width };
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onDown = (e: PointerEvent) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro sintético */
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
        const kk = len > 1 ? 1 / len : 1;
        st.joyX = jx * kk;
        st.joyY = jy * kk;
        setKnob(st.joyX * 34, st.joyY * 34);
      } else {
        st.yaw -= dx * 0.0065;
        st.pitch = Math.max(0.05, Math.min(0.9, st.pitch + dy * 0.004));
      }
    };
    const onUp = (e: PointerEvent) => {
      const q = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (q && q.role === "look" && Math.hypot(q.x - q.x0, q.y - q.y0) < 8 && performance.now() - q.t0 < 380 && current) {
        // toque curto numa peça da prateleira: abre a peça
        const p = local(e);
        raycaster.setFromCamera(new THREE.Vector2((p.x / p.w) * 2 - 1, -((p.y / p.h) * 2 - 1)), camera);
        const hits = raycaster.intersectObjects(current.items.map((i) => i.sprite), false);
        const hit = hits[0] ? current.items.find((i) => i.sprite === hits[0].object) : undefined;
        if (hit) {
          if (Math.hypot(hit.x - st.b.x, hit.z - st.b.z) > 9) sayRef.current?.("Chegue mais perto da prateleira para ver a peça.");
          else if (hit.key.startsWith("rare:")) {
            const r = current.interacts.find((i) => i.kind === "rare" && `rare:${i.offerId}` === hit.key);
            if (r) onActRef.current(r);
          } else {
            const it = current.interacts.find((i) => i.kind === "item" && i.itemId === hit.itemId && Math.abs(i.z - hit.z) < 0.3);
            if (it) onActRef.current(it);
          }
        }
      }
      if (!q || q.role !== "joy") return;
      st.joyX = st.joyY = 0;
      setKnob(0, 0);
      if (joyBase) {
        joyBase.style.opacity = "0.5";
        joyBase.style.left = "";
        joyBase.style.top = "";
        joyBase.style.bottom = "";
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const standUp = () => {
      st.sit = null;
      st.b.vy = 3.2;
      st.b.grounded = false;
      setSitting(false);
    };
    jumpRef.current = () => {
      if (st.sit) return standUp();
      st.jump = true;
    };
    sitRef.current = () => {
      if (st.sit) return standUp();
      if (!current) return;
      let best: Place["seats"][number] | null = null;
      let bd = 2.4;
      for (const s of current.seats) {
        if (Math.abs(s.y - st.b.y) > 1.2) continue;
        const d = Math.hypot(s.x - st.b.x, s.z - st.b.z);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (!best) {
        sayRef.current?.("Chegue perto de um banco, sofá ou cadeira para sentar.");
        return;
      }
      st.sit = best;
      st.path = [];
      st.b.vx = st.b.vz = st.b.vy = 0;
      setSitting(true);
      setCanSit(false);
    };
    actRef.current = () => {
      const n = nearRef.current;
      if (n) onActRef.current(n);
    };
    eatRef.current = (emoji, sec) => {
      st.eat = { emoji, t: 0, dur: sec };
      foodMat.map = emojiTexture(emoji);
      foodMat.needsUpdate = true;
    };
    gotoRef.current = (t) => {
      if (!current) return;
      st.stuck = 0;
      const here = { x: st.b.x, z: st.b.z };
      const f0 = floorAt(st.b.y);
      if (current.key !== "mall") {
        if (t.kind === "exit") st.path = [{ x: 0, z: STORE_HL - 3 }];
        else if (t.kind === "rare") {
          const it = current.interacts.find((i) => i.kind === "rare" && i.offerId === t.id);
          if (it) st.path = [{ x: it.x, z: it.z }];
        }
        return;
      }
      let f1 = f0;
      let to: Pt = here;
      if (t.kind === "floor") {
        f1 = t.floor;
        to = t.floor === 4 ? { x: 0, z: 28 } : { x: 0, z: 14 };
      } else if (t.kind === "booth") {
        f1 = 0;
        to = BOOTH.front;
      } else if (t.kind === "info") {
        f1 = 0;
        to = INFO_DESK.front;
      } else if (t.kind === "store") {
        const def = storeById(t.id);
        if (!def) return;
        f1 = def.floor;
        to = { x: def.x, z: def.side * (floorHalfZ(def.floor) - 4.2) };
      } else if (t.kind === "restaurant") {
        const r = RESTAURANTS.find((q) => q.key === t.key);
        if (!r) return;
        f1 = 4;
        // entra pelo corredor entre as mesas (x = centro + 5) e chega de frente ao balcão
        st.path = [...routeBetween(f0, 4, here, { x: r.cx + 5, z: r.side * 10.5 }), { x: r.cx + 5, z: r.side * 35 }, counterFront(r)];
        return;
      } else if (t.kind === "exit") {
        f1 = 0;
        to = { x: 0, z: floorHalfZ(0) - 3 };
      }
      st.path = routeBetween(f0, f1, here, to);
    };

    // ---- laço
    let last = performance.now();
    let nearKey = "";
    let nearT = 0;
    let loadT = 0;
    let canSitNow = false;
    let eatBite = 0;
    const camPos = new THREE.Vector3(0, 6, 22);
    if (process.env.NODE_ENV !== "production") (st as unknown as { cam: THREE.Vector3 }).cam = camPos;
    const tmp = new THREE.Vector3();
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
    void vw;
    void vh;
    switchTo(placeRef.current);

    // os desenhos (sprites) ficam um pouco mais perto da câmera para não sumirem atrás de mesas e balcões baixos
    const nudge = (x: number, z: number): { x: number; z: number } => {
      const dx = x - camPos.x;
      const dz = z - camPos.z;
      const l = Math.hypot(dx, dz) || 1;
      return { x: x - (dx / l) * 0.55, z: z - (dz / l) * 0.55 };
    };
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      st.t += dt;
      const pl = current;
      if (!pl) return;
      pl.update(st.t, dt);
      const cy = Math.cos(st.yaw);
      const sy = Math.sin(st.yaw);
      let ix = st.joyX;
      let iz = st.joyY;
      if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("w") || keys.has("arrowup")) iz -= 1;
      if (keys.has("s") || keys.has("arrowdown")) iz += 1;
      const len = Math.hypot(ix, iz);
      if (len > 0.08 && st.path.length) st.path = [];
      if (len > 1) {
        ix /= len;
        iz /= len;
      }
      if (st.sit && len > 0.3) standUp();

      const b = st.b;
      if (st.sit) {
        const k = Math.min(1, dt * 9);
        b.x += (st.sit.x - b.x) * k;
        b.z += (st.sit.z - b.z) * k;
        b.y += (st.sit.y - b.y) * k;
        b.vx = b.vz = b.vy = 0;
        st.faceX = st.sit.dir === 1 ? -1 : 1;
      } else {
        let wx = 0;
        let wz = 0;
        if (st.path.length) {
          const tg = st.path[0];
          const dx = tg.x - b.x;
          const dz = tg.z - b.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.8) {
            st.path.shift();
            st.stuck = 0;
          } else {
            wx = (dx / d) * 7;
            wz = (dz / d) * 7;
            // encostou numa mesa ou coluna e não anda: desvia para o lado até passar
            st.prog += dt;
            if (st.prog > 0.5) {
              const moved = Math.hypot(b.x - st.px, b.z - st.pz);
              st.stuck = moved < 0.9 ? st.stuck + 1 : 0;
              st.px = b.x;
              st.pz = b.z;
              st.prog = 0;
            }
            if (st.stuck > 0) {
              const side = st.stuck % 4 < 2 ? 1 : -1;
              wx += (-dz / d) * 7 * side;
              wz += (dx / d) * 7 * side;
            }
          }
        } else if (len > 0.05) {
          const speed = (keys.has("shift") ? RUN : WALK) * Math.min(1, len);
          const px = ix * cy + iz * sy;
          const pz = -ix * sy + iz * cy;
          const dl = Math.hypot(px, pz) || 1;
          wx = (px / dl) * speed;
          wz = (pz / dl) * speed;
        }
        const jump = st.jump;
        st.jump = false;
        if (jump && b.grounded) sfxStep();
        stepBody(pl.world, b, { x: wx, z: wz }, dt, jump);
        if (b.y < pl.world.fallY) {
          Object.assign(b, { x: pl.spawn.x, z: pl.spawn.z, y: pl.spawn.y, vx: 0, vz: 0, vy: 0, grounded: true });
        }
      }

      // andar atual
      const fl = pl.key === "mall" ? floorAt(b.y) : 0;
      if (fl !== st.floor) {
        st.floor = fl;
        setFloor(fl);
        onFloorRef.current?.(fl);
      }

      const moving = Math.hypot(b.vx, b.vz);
      const mv = Math.min(1, moving / 3);
      const lateral = b.vx * cy - b.vz * sy;
      if (Math.abs(lateral) > 0.6) st.faceX = lateral > 0 ? 1 : -1;
      const bob = Math.abs(Math.sin(st.t * 9)) * 0.12 * mv;
      avatar.scale.set(AV_W * st.faceX * (1 + Math.sin(st.t * 9) * 0.01 * mv), AV_H * (1 - 0.02 * Math.abs(Math.cos(st.t * 9)) * mv), 1);
      const np = nudge(b.x, b.z);
      avatar.position.set(np.x, b.y + bob, np.z);
      avatarMat.rotation = Math.sin(st.t * 9) * 0.03 * mv - 0.03 * st.faceX * mv;
      const away = -(b.vx * sy + b.vz * cy);
      if (away > 1.1 && away > Math.abs(lateral) * 0.8) st.back = true;
      else if (away < 0.3 || Math.abs(lateral) > away * 1.5) st.back = moving < 0.3 ? st.back : false;
      const carried = pl.key === "mall" && moving > 0 && mv < 0.3;
      void carried;

      if (sitOn !== !!st.sit) {
        sitOn = !!st.sit;
        avatarShown = -1;
        legs.visible = sitOn;
        if (!sitOn) {
          avatarMat.rotation = 0;
          legsMat.rotation = 0;
        }
      }
      let eatLift = 0;
      if (st.sit && avatarFrames.length) {
        const src = avatarFrames[avatarFrames.length >= 6 && st.back ? 3 : 0];
        if (!sitTex || sitTex.src !== src) {
          sitTex?.up.dispose();
          sitTex?.lo.dispose();
          const up = src.clone();
          up.needsUpdate = true;
          up.repeat.set(1, 0.5);
          up.offset.set(0, 0.5);
          const lo = src.clone();
          lo.needsUpdate = true;
          lo.repeat.set(1, 0.28);
          lo.offset.set(0, 0);
          sitTex = { src, up, lo };
        }
        const d = st.sit.dir;
        avatarMat.map = sitTex.up;
        avatar.scale.set(AV_W * st.faceX, AV_H * 0.5 * (1 + Math.sin(st.t * 2) * 0.012), 1);
        avatar.position.set(np.x + d * 0.14, b.y + 0.02, np.z);
        avatarMat.rotation = Math.sin(st.t * 1.4) * 0.015;
        legsMat.map = sitTex.lo;
        legs.scale.set(AV_W * 0.86 * st.faceX, AV_H * 0.28 * 0.86, 1);
        legs.position.set(np.x + d * 0.6, b.y - 0.51, np.z);
        legsMat.rotation = Math.sin(st.t * 2.2) * 0.1;
      } else if (avatarFrames.length >= 3) {
        const off = avatarFrames.length >= 6 && st.back ? 3 : 0;
        const walk = mv > 0.3;
        const want = off + (walk ? [1, 0, 2, 0][Math.floor(st.t * 9) % 4] : 0);
        if (want !== avatarShown) {
          avatarShown = want;
          avatarMat.map = avatarFrames[want];
          if (walk && want - off !== 0) sfxStep();
        }
      }
      avatar.visible = avatarFrames.length > 0;
      shadow.position.set(b.x, b.y + 0.03, b.z);
      shadow.scale.setScalar(Math.max(0.4, 1 - bob * 1.2));

      // comendo: a comida sobe até a boca, dá uma mordida e desce
      if (st.eat) {
        st.eat.t += dt;
        const ph = (st.eat.t % 1.5) / 1.5;
        const lift = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;
        const sitH = st.sit ? 0.5 : 1;
        const hand = st.sit ? 0.95 : 1.05;
        const mouth = (st.sit ? 1.15 : 1.75) * 1;
        eatLift = lift;
        food.visible = true;
        const left = 1 - 0.55 * Math.min(1, st.eat.t / st.eat.dur);
        food.scale.set(0.75 * left, 0.75 * left, 1);
        avatarMat.rotation += lift * 0.06 * st.faceX;
        food.position.set(np.x + st.faceX * 0.33, b.y + hand + (mouth - hand) * lift, np.z - 0.05);
        void sitH;
        if (lift > 0.92 && st.t - eatBite > 0.7) {
          eatBite = st.t;
          sfxStep();
        }
        avatar.position.y += lift * 0.04;
        if (st.eat.t >= st.eat.dur) {
          st.eat = null;
          food.visible = false;
        }
      } else food.visible = false;
      void eatLift;

      // peça/porta/balcão mais perto (para o botão de ação)
      nearT += dt;
      if (nearT > 0.1) {
        nearT = 0;
        let best: Interact | null = null;
        let bs = 1e9;
        for (const it of pl.interacts) {
          if (Math.abs(it.y - b.y) > 2.5) continue;
          const nx = Math.abs(it.x - b.x) / it.rx;
          const nz = Math.abs(it.z - b.z) / it.rz;
          if (nx > 1 || nz > 1) continue;
          const sc = nx * nx + nz * nz + (it.kind === "item" ? Math.abs(it.ay - (b.y + 1.5)) * 0.02 : 0);
          if (sc < bs) {
            bs = sc;
            best = it;
          }
        }
        const kk = best ? `${best.kind}:${"itemId" in best ? best.itemId : "offerId" in best ? best.offerId : "store" in best ? best.store : "place" in best ? best.place : ""}` : "";
        if (kk !== nearKey) {
          nearKey = kk;
          nearRef.current = best;
          setNear(best);
          onNearRef.current(best);
        }
        const sitNear = !st.sit && b.grounded && pl.seats.some((q) => Math.abs(q.y - b.y) < 1.2 && Math.hypot(q.x - b.x, q.z - b.z) < 2.4);
        if (sitNear !== canSitNow) {
          canSitNow = sitNear;
          setCanSit(sitNear);
        }
      }
      loadT += dt;
      if (loadT > 0.15) {
        loadT = 0;
        loadNear();
      }
      // destaque da peça mais perto
      if (pl.items.length) {
        const n = nearRef.current;
        for (const it of pl.items) {
          if (!it.loaded) continue;
          const sel = n && n.kind === "item" && n.itemId === it.itemId && Math.abs(it.z - n.z) < 0.5;
          const target = sel ? 1.14 + Math.sin(st.t * 6) * 0.04 : 1;
          const cur = it.sprite.scale.x / it.w;
          const nx = cur + (target - cur) * Math.min(1, dt * 10);
          it.sprite.scale.set(it.w * nx, it.h * nx, 1);
        }
      }

      // posição para os outros
      st.posT += dt;
      const airborne = !b.grounded && !st.sit;
      if (st.posT > (airborne ? 0.25 : mv > 0.2 ? 0.45 : 1.8)) {
        st.posT = 0;
        onPosRef.current({ x: b.x, z: b.z, y: +b.y.toFixed(2), fx: st.faceX as 1 | -1, mv, s: st.sit ? 1 : 0, e: st.eat?.emoji ?? "", w: pl.key });
      }

      // outras jogadoras
      const live = positionsRef.current.current;
      const nowMs = Date.now();
      for (const [id, rm] of remotes) {
        const pos = live[id];
        if (!pos || pos.w !== pl.key || nowMs - pos.t > 20000) {
          rm.sprite.visible = rm.shadow.visible = rm.tag.visible = rm.legs.visible = rm.food.visible = false;
        }
      }
      for (const [id, pos] of Object.entries(live)) {
        const rm = remotes.get(id);
        if (!rm || !rm.frames.length || pos.w !== pl.key || nowMs - pos.t > 20000) continue;
        if (!rm.sprite.visible && rm.x === 0 && rm.z === 0) {
          rm.x = pos.x;
          rm.z = pos.z;
          rm.y = pos.y ?? 0;
        }
        rm.x += (pos.x - rm.x) * Math.min(1, dt * 6);
        rm.z += (pos.z - rm.z) * Math.min(1, dt * 6);
        rm.y += ((pos.y ?? 0) - rm.y) * Math.min(1, dt * 10);
        const movingR = nowMs - pos.t < 1800 ? pos.mv : 0;
        rm.phase += dt;
        const bobR = Math.abs(Math.sin(rm.phase * 9)) * 0.12 * movingR;
        rm.fx = pos.fx;
        rm.sprite.visible = rm.shadow.visible = rm.tag.visible = true;
        const sitR = pos.s === 1;
        rm.sprite.scale.set(AV_W * rm.fx, AV_H * (sitR ? 0.78 : 1), 1);
        const rp = nudge(rm.x, rm.z);
        rm.sprite.position.set(rp.x, rm.y + (sitR ? 0.3 : 0) + bobR, rp.z);
        rm.shadow.position.set(rm.x, rm.y + 0.03, rm.z);
        rm.tag.position.set(rm.x, rm.y + (sitR ? 0.3 + AV_H * 0.78 : AV_H) + 0.45, rm.z);
        if (rm.frames.length === 3) {
          const want = movingR > 0.3 && !sitR ? [1, 0, 2, 0][Math.floor(rm.phase * 9) % 4] : 0;
          if (want !== rm.shown) {
            rm.shown = want;
            rm.mat.map = rm.frames[want];
          }
        }
        if (pos.e) {
          rm.food.visible = true;
          (rm.food.material as THREE.SpriteMaterial).map = emojiTexture(pos.e);
          (rm.food.material as THREE.SpriteMaterial).needsUpdate = true;
          const ph = ((nowMs / 1000) % 1.5) / 1.5;
          const lift = ph < 0.5 ? ph / 0.5 : 1 - (ph - 0.5) / 0.5;
          rm.food.position.set(rp.x + rm.fx * 0.33, rm.y + (sitR ? 0.95 : 1.05) + ((sitR ? 1.15 : 1.75) - (sitR ? 0.95 : 1.05)) * lift, rp.z - 0.05);
        } else rm.food.visible = false;
      }

      // câmera atrás da jogadora
      st.ey += (b.y - st.ey) * Math.min(1, dt * 6);
      const pitch = st.pitch;
      st.dist += (6.2 - st.dist) * Math.min(1, dt * 4);
      const cyBase = st.ey + 1.3;
      tmp.set(b.x + Math.sin(st.yaw) * st.dist * Math.cos(pitch), cyBase + 0.3 + st.dist * Math.sin(pitch), b.z + Math.cos(st.yaw) * st.dist * Math.cos(pitch));
      const lim = pl.world.limit(b.y);
      tmp.x = Math.max(-lim.hx - 0.4, Math.min(lim.hx + 0.4, tmp.x));
      tmp.z = Math.max(-lim.hz - 0.4, Math.min(lim.hz + 0.4, tmp.z));
      if (pl.key === "mall") tmp.y = Math.min(tmp.y, floorY(floorAt(b.y)) + 7.4);
      else tmp.y = Math.min(tmp.y, 7.6);
      // colunas/balcões altos entre a câmera e a jogadora: a câmera chega mais perto em vez de atravessar
      for (const c of pl.world.posts) {
        if (c.height < 3 || Math.abs(c.base - st.ey) > 4) continue;
        const dx = tmp.x - b.x;
        const dz = tmp.z - b.z;
        const l2 = dx * dx + dz * dz || 1;
        const t = ((c.x - b.x) * dx + (c.z - b.z) * dz) / l2;
        if (t <= 0 || t > 1.3) continue;
        const px = b.x + dx * t - c.x;
        const pz = b.z + dz * t - c.z;
        const rr = c.r + 0.5;
        if (Math.hypot(px, pz) > rr) continue;
        const back = Math.sqrt(Math.max(0, rr * rr - px * px - pz * pz)) / Math.sqrt(l2);
        const tIn = Math.max(0.3, t - back - 0.06);
        if (tIn < 1) {
          tmp.x = b.x + dx * tIn;
          tmp.z = b.z + dz * tIn;
          tmp.y = cyBase + 0.3 + (tmp.y - cyBase - 0.3) * tIn;
        }
      }
      camPos.lerp(tmp, Math.min(1, dt * 10));
      camera.position.copy(camPos);
      camera.lookAt(b.x, cyBase, b.z);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      clearTimeout(firstAvatar);
      cancelAnimationFrame(raf);
      loadingQ.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      avatarSet.current = null;
      peerSet.current = null;
      setPlaceRef.current = null;
      jumpRef.current = null;
      sitRef.current = null;
      actRef.current = null;
      eatRef.current = null;
      gotoRef.current = null;
      offersApply.current = null;
      current?.dispose();
      if (mallPlace && mallPlace !== current) mallPlace.dispose();
      textures.forEach((t) => t.dispose?.());
      avatarFrames.forEach((t) => t.dispose());
      sitTex?.up.dispose();
      sitTex?.lo.dispose();
      remotes.forEach((rm) => rm.frames.forEach((t) => t.dispose()));
      own.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // troca de lugar (entrar/sair de loja)
  const placeKey = place.kind === "store" ? `s:${place.id}` : "mall";
  useEffect(() => {
    setPlaceRef.current?.(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey, placeNonce]);

  if (failed) {
    return <div className="grid h-full place-items-center p-6 text-center text-sm font-bold text-amber-100">Seu aparelho não conseguiu abrir o shopping em 3D.</div>;
  }

  const destinations: { label: string; t: GotoTarget }[] =
    place.kind === "mall"
      ? [
          ...FLOOR_INFO.map((f, i) => ({ label: `${i === 4 ? "🍽" : "🛗"} ${f.name} · ${f.sub}`, t: { kind: "floor", floor: i } as GotoTarget })),
          { label: "🎫 Cabine de bilhetes", t: { kind: "booth" } },
          { label: "ℹ️ Informações (raras do dia)", t: { kind: "info" } },
          ...ALL_STORES.map((s) => ({ label: `${s.emoji} ${s.name} (${s.floor === 0 ? "térreo" : `${s.floor}º`})`, t: { kind: "store", id: s.id } as GotoTarget })),
          ...RESTAURANTS.map((r) => ({ label: `${r.emoji} ${r.name}`, t: { kind: "restaurant", key: r.key } as GotoTarget })),
          { label: "🚪 Saída", t: { kind: "exit" } },
        ]
      : [
          { label: "🚪 Saída da loja", t: { kind: "exit" } },
          ...offers.filter((o) => (storeById(place.id)?.slots ?? []).includes(offerItem(o.family)?.slot as never)).map((o) => ({ label: `🔥 ${offerItem(o.family)?.name ?? "Peça rara"}`, t: { kind: "rare", id: o.id } as GotoTarget })),
        ];

  void ESC_X1;
  void ESC_SPEED;
  void FLOOR_COUNT;
  void ITEM_BY_ID;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ touchAction: "none" }}>
      <div ref={hostRef} className="absolute inset-0" />
      {/* peças e avatares desenhados em SVG, escondidos: viram textura 3D */}
      <div ref={bankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 200, pointerEvents: "none", overflow: "hidden" }}>
        {bankItems.map((b, i) => (
          <div key={`${b.k}-${i}`} data-k={b.k}>
            <PaperDoll base={base} look={{ [b.slot as string]: b.id }} only={b.slot} />
          </div>
        ))}
      </div>
      <div ref={peerBankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, pointerEvents: "none", overflow: "hidden" }}>
        {roster.slice(0, 24).map((p) => {
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
      <div ref={avatarBankRef} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, pointerEvents: "none", overflow: "hidden" }}>
        <PaperDoll base={base} look={look} />
        <PaperDoll base={base} look={look} step={1} />
        <PaperDoll base={base} look={look} step={-1} />
        <PaperDoll base={base} look={look} back />
        <PaperDoll base={base} look={look} step={1} back />
        <PaperDoll base={base} look={look} step={-1} back />
      </div>

      {!ready ? <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm font-black text-purple-900">Abrindo o shopping…</p> : null}

      {/* joystick */}
      <div
        ref={joyRef}
        aria-hidden
        className={`pointer-events-none absolute z-[3] h-[104px] w-[104px] rounded-full border-2 border-white/70 bg-white/20 ${mobile ? "" : "[@media(hover:hover)]:hidden"} ${menu ? "invisible" : ""}`}
        style={{ left: 22, bottom: 82, opacity: 0.5 }}
      >
        <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-[20px] -mt-[20px] h-[40px] w-[40px] rounded-full bg-white/85 shadow" />
      </div>
      <p className={`pointer-events-none absolute bottom-[4.9rem] left-2 hidden rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white [@media(hover:hover)]:block ${menu ? "invisible" : ""}`}>
        WASD/setas andam · espaço pula · E interage ou senta · arraste para girar
      </p>

      {/* pular e sentar */}
      <div className={`absolute bottom-[5.2rem] left-[8.6rem] z-[4] flex flex-row items-end gap-2 [@media(hover:hover)]:bottom-[7.2rem] [@media(hover:hover)]:left-2 ${menu ? "invisible" : ""}`}>
        {canSit || sitting ? (
          <button type="button" className="vh-btn vh-btn-purple !w-auto !px-3 !py-2 !text-xs shadow-[0_0_18px_rgba(255,224,102,0.6)]" onClick={() => sitRef.current?.()}>
            {sitting ? "🧍 Levantar" : "🪑 Sentar"}
          </button>
        ) : null}
        <button type="button" className="vh-iconbtn !h-11 !w-11 !text-lg" aria-label="Pular" title="Pular (espaço)" onClick={() => jumpRef.current?.()}>
          ⤒
        </button>
      </div>

      {/* coluna da esquerda: andar, ir para…, avisos */}
      <div className="vh-slot absolute left-2 top-[3.9rem] z-[4] flex max-h-[calc(100%-9rem)] max-w-[calc(100%-1rem)] flex-col items-start gap-1.5 overflow-y-auto">
        <div className="flex flex-row items-start gap-2">
          <button type="button" className="vh-chip shrink-0 !px-3 !py-1.5 !text-xs" data-on={menu} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            🧭 Ir para…
          </button>
          {place.kind === "mall" ? (
            <span className="vh-chip shrink-0 !px-3 !py-1.5 !text-xs" data-on>
              {floor === 4 ? "🍽" : "🛍"} {FLOOR_INFO[floor]?.name}
            </span>
          ) : null}
          {leftSlot}
        </div>
        {menu ? (
          <div className="vh-panel vh-pop flex max-h-[min(15rem,60vh)] w-[min(17rem,92vw)] flex-col gap-1 overflow-y-auto !p-2">
            {destinations.map((d) => (
              <button
                key={d.label}
                type="button"
                className="rounded-xl border border-amber-300/50 bg-white/10 px-2.5 py-1.5 text-left text-[11px] font-black leading-tight text-amber-50 active:scale-95"
                onClick={() => {
                  gotoRef.current?.(d.t);
                  setMenu(false);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}
        {leftBelow}
      </div>

      {near ? (
        <div className="pointer-events-none absolute bottom-16 right-3 z-[5] flex max-w-[52%] justify-end">
          <button type="button" className="vh-btn pointer-events-auto !w-auto !px-5 !py-3 !text-sm shadow-[0_0_24px_rgba(255,224,102,0.7)]" onClick={() => actRef.current?.()}>
            {near.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}
