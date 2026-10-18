"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Collider, buildLanes, loadMap, pts, type MapData } from "@/lib/missao/map";
import { PASS, SUGGESTIONS, judge, type Verdict } from "@/lib/missao/gospel";
import { buildCity } from "./city";
import { buildExtras } from "./extras";
import { buildChurchInterior, type Interior } from "./interior";
import { Crowd, PeopleKit, YES, lerpAngle, play, type Actor, type Npc } from "./people";

// Missão Madureira: 3 minutos para evangelizar o máximo de pessoas pelas ruas de Madureira.
// Spawn na frente da Primeira Igreja Batista de Madureira. Cada pessoa: referência + ideia (nota ≥ 70% = +1).

export const ROUND_SECS = 180;

export type MissaoResult = { saved: number; tries: number; avg: number; refs: string[] };

const LANDMARK_NAMES: Record<string, string> = {
  igreja: "PIB de Madureira",
  estacao: "Estação de Madureira",
  viaduto: "Viaduto Negrão de Lima",
  mercadao: "Mercadão de Madureira",
  parque: "Parque Madureira",
};

type Talk = { npc: Npc; verdict: Verdict | null; ref: string; idea: string };

export function MissaoGame({ avatar, onEnd, onExit }: { avatar: number; onEnd: (r: MissaoResult) => void; onExit: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<{ step: string; p: number } | null>({ step: "Carregando o mapa de Madureira…", p: 0 });
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState({ left: ROUND_SECS, saved: 0, near: null as string | null, place: "", inChurch: true, started: false, flying: false, alt: 0 });
  const [talk, setTalk] = useState<Talk | null>(null);
  const [over, setOver] = useState(false);
  const [touch] = useState(() => typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches);
  const api = useRef<{ startTalk: () => void; submit: (ref: string, idea: string) => Verdict | null; closeTalk: () => void; run: (on: boolean) => void; fly: () => void } | null>(null);
  const talkRef = useRef<Talk | null>(null);
  useEffect(() => {
    talkRef.current = talk;
  }, [talk]);
  const [running, setRunning] = useState(false);
  const vert = useRef({ up: false, down: false });
  const stick = useRef({ x: 0, y: 0, id: -1, ox: 0, oy: 0 });
  const [stickUi, setStickUi] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const host = wrap.current;
    if (!host) return;
    let disposed = false;
    const low = touch && (navigator as unknown as { deviceMemory?: number }).deviceMemory !== undefined && ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !low;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd6e4ee, 90, 520);
    const camera = new THREE.PerspectiveCamera(58, host.clientWidth / host.clientHeight, 0.1, 1600);

    let map: MapData | null = null;
    let col: Collider | null = null;
    let crowd: Crowd | null = null;
    let player: Actor | null = null;
    let city: ReturnType<typeof buildCity> | null = null;
    let extras: ReturnType<typeof buildExtras> | null = null;
    let interior: Interior | null = null;
    const intActors: Actor[] = [];
    // a missão começa dentro do templo; o relógio só corre depois que o jogador sai pela porta do fundo
    let inChurch = true;
    let started = false;
    // voo: toque duplo no espaço; espaço sobe, shift desce; ao tocar o chão volta a andar
    let flying = false;
    let fy = 0;
    let lastSpace = 0;
    const toggleFly = () => {
      if (flying || inChurch || talkRef.current || ended || !player) return;
      flying = true;
      fy = 0.4;
    };
    const keys = new Set<string>();
    let camYaw = 0;
    let camPitch = 0.32;
    let camDist = 5.2;
    let px = 0;
    let pz = 0;
    let pyaw = 0;
    let run = false;
    let left = ROUND_SECS;
    let saved = 0;
    let tries = 0;
    let scoreSum = 0;
    const usedRefs: string[] = [];
    let ended = false;
    let near: Npc | null = null;
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let miniImg: HTMLCanvasElement | null = null;
    let miniScale = 0.5;

    // marcadores: balão sobre quem dá para abordar, coroa dourada sobre quem aceitou
    const markTex = (emoji: string, bg: string) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const c = cv.getContext("2d")!;
      c.fillStyle = bg;
      c.beginPath();
      c.arc(64, 64, 54, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = "#ffffff";
      c.stroke();
      c.font = "64px system-ui, 'Segoe UI Emoji', 'Apple Color Emoji'";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(emoji, 64, 70);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const talkMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex("💬", "#2563eb"), depthTest: false }));
    talkMark.scale.set(0.6, 0.6, 1);
    talkMark.renderOrder = 10;
    talkMark.visible = false;
    scene.add(talkMark);
    const savedTex = markTex("✝️", "#eab308");
    const savedMarks = new Map<number, THREE.Sprite>();

    const resize = () => {
      if (!host) return;
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    addEventListener("resize", resize);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (down) keys.add(k);
      else keys.delete(k);
      if (down && k === "e" && near && !talkRef.current) startTalk();
      if (k === "shift") run = down;
      if (k === " ") {
        e.preventDefault();
        if (down && !e.repeat) {
          const t2 = performance.now();
          if (t2 - lastSpace < 330) toggleFly();
          lastSpace = t2;
        }
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    addEventListener("keydown", kd);
    addEventListener("keyup", ku);

    // arrastar gira a câmera (mouse ou o lado direito da tela no celular)
    let drag: { id: number; x: number; y: number } | null = null;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      if (talkRef.current) return;
      if (e.pointerType === "touch" && e.clientX < host.clientWidth * 0.45) {
        stick.current = { x: 0, y: 0, id: e.pointerId, ox: e.clientX, oy: e.clientY };
        setStickUi({ ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
        el.setPointerCapture(e.pointerId);
        return;
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (stick.current.id === e.pointerId) {
        const dx = e.clientX - stick.current.ox;
        const dy = e.clientY - stick.current.oy;
        const L = Math.hypot(dx, dy);
        const R = 55;
        const k = L > R ? R / L : 1;
        stick.current.x = (dx * k) / R;
        stick.current.y = (dy * k) / R;
        setStickUi({ ox: stick.current.ox, oy: stick.current.oy, x: dx * k, y: dy * k });
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      camYaw -= dx * 0.006;
      camPitch = Math.max(0.05, Math.min(1.45, camPitch + dy * 0.004));
    };
    const onUp = (e: PointerEvent) => {
      if (stick.current.id === e.pointerId) {
        stick.current = { x: 0, y: 0, id: -1, ox: 0, oy: 0 };
        setStickUi(null);
      }
      if (drag?.id === e.pointerId) drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      camDist = Math.max(2.6, Math.min(10, camDist + e.deltaY * 0.004));
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });

    const startTalk = () => {
      if (!near || ended) return;
      near.state = "talk";
      setTalk({ npc: near, verdict: null, ref: "", idea: "" });
    };
    const submit = (ref: string, idea: string): Verdict | null => {
      const t = talkRef.current;
      if (!t || ended) return null;
      const v = judge(ref, idea, usedRefs);
      tries++;
      scoreSum += v.score;
      if (v.ref) usedRefs.push(v.ref);
      if (v.ok) {
        t.npc.saved = true;
        t.npc.state = "saved";
        t.npc.timer = 3.5;
        saved++;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: savedTex, depthTest: false }));
        sp.scale.set(0.55, 0.55, 1);
        sp.renderOrder = 10;
        scene.add(sp);
        savedMarks.set(t.npc.id, sp);
      } else {
        t.npc.fails++;
      }
      return v;
    };
    const closeTalk = () => {
      const t = talkRef.current;
      if (t && t.npc.state === "talk") {
        t.npc.state = "walk";
        t.npc.timer = 8;
      }
      setTalk(null);
    };
    api.current = { startTalk, submit, closeTalk, run: (on) => (run = on), fly: toggleFly };

    const finish = () => {
      if (ended) return;
      ended = true;
      setOver(true);
      setTimeout(() => onEnd({ saved, tries, avg: tries ? Math.round(scoreSum / tries) : 0, refs: usedRefs.slice() }), 1800);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt, now);
    };
    const tick = (dt: number, now: number) => {
      if (!map || !col || !player || !crowd || !city) return;

      // relógio (corre também durante a conversa)
      if (!ended && started) {
        left -= dt;
        if (left <= 0) {
          left = 0;
          finish();
        }
      }

      // movimento
      let ix = 0;
      let iz = 0;
      if (!talkRef.current && !ended) {
        if (keys.has("w") || keys.has("arrowup")) iz += 1;
        if (keys.has("s") || keys.has("arrowdown")) iz -= 1;
        if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
        if (keys.has("d") || keys.has("arrowright")) ix += 1;
        ix += stick.current.x;
        iz -= stick.current.y;
      }
      const mag = Math.min(1, Math.hypot(ix, iz));
      if (mag > 0.08) {
        // frente = para onde a câmera olha; direita na tela = (-cos, sin)
        const fx = Math.sin(camYaw);
        const fz = Math.cos(camYaw);
        const rx = -Math.cos(camYaw);
        const rz = Math.sin(camYaw);
        let mx = fx * iz + rx * ix;
        let mz = fz * iz + rz * ix;
        const L = Math.hypot(mx, mz) || 1;
        mx /= L;
        mz /= L;
        const sp = flying ? 18 * (touch ? Math.max(0.4, mag) : 1) : (run ? 5.4 : 2.3) * (touch ? Math.max(0.4, mag) : 1);
        const nx = px + mx * sp * dt;
        const nz = pz + mz * sp * dt;
        // acima dos prédios (35 m) não há colisão; abaixo disso as paredes continuam valendo
        if (flying && fy > 36) [px, pz] = [Math.min(col.x1 - 1, Math.max(col.x0 + 1, nx)), Math.min(col.z1 - 1, Math.max(col.z0 + 1, nz))];
        else [px, pz] = inChurch && interior ? interior.resolve(nx, nz, 0.32) : col.resolve(nx, nz, 0.32);
        pyaw = lerpAngle(pyaw, Math.atan2(mx, mz), 0.2);
        play(player, flying ? "Run" : run ? "Run" : "Walk", 0.2, flying ? 1.4 : run ? 1 : Math.max(0.6, mag));
      } else {
        play(player, "Idle");
      }
      if (flying) {
        const up = keys.has(" ") || vert.current.up;
        const down = keys.has("shift") || vert.current.down;
        if (up && !talkRef.current) fy = Math.min(650, fy + (fy > 60 ? 28 : 12) * dt);
        if (down) fy -= (fy > 60 ? 28 : 12) * dt;
        if (fy <= 0) {
          fy = 0;
          flying = false;
        }
      }
      player.root.position.set(px, 0.15 + fy, pz);
      player.root.rotation.y = pyaw;
      player.mixer.update(dt);

      // porta do templo: saindo começa a rodada; entrando de novo volta ao salão
      if (interior && city.door) {
        const dr = city.door;
        if (inChurch && interior.atDoor(px, pz) && !ended) {
          inChurch = false;
          started = true;
          px = dr.x + dr.nx * 3;
          pz = dr.z + dr.nz * 3;
          pyaw = Math.atan2(dr.nx, dr.nz);
          camYaw = pyaw;
          setHud((h) => ({ ...h, inChurch: false, started: true }));
        } else if (!inChurch && Math.hypot(px - dr.x, pz - dr.z) < 1.0 && !talkRef.current) {
          inChurch = true;
          px = interior.entry.x;
          pz = interior.entry.z;
          pyaw = interior.entry.yaw;
          camYaw = interior.entry.yaw;
          setHud((h) => ({ ...h, inChurch: true }));
        }
      }
      if (inChurch) for (const a of intActors) a.mixer.update(dt);

      // pedestres
      if (!inChurch) crowd.update(dt, px, pz);
      near = null;
      let nd = 2.7;
      for (const n of inChurch || fy > 1.5 ? [] : crowd.npcs) {
        if (n.saved || n.fails >= 2 || n.state === "saved") continue;
        const d = Math.hypot(n.x - px, n.z - pz);
        if (d < nd) {
          nd = d;
          near = n;
        }
      }
      if (near && !talkRef.current && !ended) {
        talkMark.visible = true;
        talkMark.position.set(near.x, 2.25, near.z);
      } else talkMark.visible = false;
      for (const n of crowd.npcs) {
        const m = savedMarks.get(n.id);
        if (m) m.position.set(n.x, 2.2 + Math.sin(now / 300 + n.id) * 0.05, n.z);
      }

      // câmera atrás do jogador (não entra nos prédios)
      const tx = px;
      const tz = pz;
      const ty = 1.55 + fy;
      const back = Math.cos(camPitch) * camDist;
      let cx = tx - Math.sin(camYaw) * back;
      let cz = tz - Math.cos(camYaw) * back;
      if (inChurch && interior) [cx, cz] = interior.clampCam(cx, cz);
      else if (fy < 36) {
        const hit = col.firstHit(tx, tz, cx, cz);
        if (hit < 1) {
          cx = tx + (cx - tx) * Math.max(0.25, hit);
          cz = tz + (cz - tz) * Math.max(0.25, hit);
        }
      }
      const camY = ty + Math.sin(camPitch) * camDist;
      camera.position.set(cx, inChurch ? Math.min(9, camY) : camY, cz);
      camera.lookAt(tx, ty, tz);

      // sol e céu acompanham
      city.sun.position.set(px - 55, 75, pz + 40);
      city.sun.target.position.set(px, 0, pz);
      city.sky.position.copy(camera.position);

      if (scene.fog instanceof THREE.Fog) scene.fog.far = 520 + fy * 3;
      renderer.render(scene, camera);

      // HUD e minimapa (10x por segundo)
      hudT += dt;
      if (hudT > 0.1) {
        hudT = 0;
        let place = "";
        let bd = 1e9;
        for (const [k, [lx, lz]] of Object.entries(map.landmarks)) {
          const d = Math.hypot(lx - px, lz - pz);
          if (d < bd) {
            bd = d;
            place = d < 120 ? `Perto: ${LANDMARK_NAMES[k] ?? k}` : "";
          }
        }
        setHud({ left: Math.ceil(left), saved, near: near && !talkRef.current ? near.name : null, place: inChurch ? "" : place, inChurch, started, flying, alt: Math.round(fy) });
        drawMini();
      }
    };

    const drawMini = () => {
      const cv = mini.current;
      if (!cv || !miniImg || !map || !crowd) return;
      const c = cv.getContext("2d");
      if (!c) return;
      const W = cv.width;
      const [X0, Z0] = map.bounds;
      if (inChurch) {
        c.clearRect(0, 0, W, W);
        c.fillStyle = "rgba(15,23,42,0.85)";
        c.beginPath();
        c.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff";
        c.font = "bold 14px system-ui";
        c.textAlign = "center";
        c.fillText("Templo", W / 2, W / 2 + 5);
        return;
      }
      c.save();
      c.clearRect(0, 0, W, W);
      c.beginPath();
      c.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = "#3d3f44";
      c.fillRect(0, 0, W, W);
      c.translate(W / 2, W / 2);
      c.rotate(camYaw - Math.PI);
      const k = 1.1; // px por metro no minimapa
      c.scale(k / miniScale, k / miniScale);
      c.drawImage(miniImg, -(px - X0) * miniScale, -(pz - Z0) * miniScale);
      c.restore();
      c.save();
      c.translate(W / 2, W / 2);
      c.rotate(camYaw - Math.PI);
      for (const n of crowd.npcs) {
        const dx = (n.x - px) * k;
        const dz = (n.z - pz) * k;
        if (dx * dx + dz * dz > (W / 2 - 6) ** 2) continue;
        c.fillStyle = n.saved ? "#facc15" : n.fails >= 2 ? "#9ca3af" : "#ffffff";
        c.beginPath();
        c.arc(dx, dz, n.saved ? 3.5 : 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      // jogador (seta no centro, aponta para onde anda)
      c.save();
      c.translate(W / 2, W / 2);
      c.rotate(camYaw - pyaw);
      c.fillStyle = "#38bdf8";
      c.strokeStyle = "#fff";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(6, 7);
      c.lineTo(0, 3);
      c.lineTo(-6, 7);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
      c.strokeStyle = "rgba(255,255,255,0.85)";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
      c.stroke();
      // norte
      const nAng = camYaw - Math.PI;
      const nx = W / 2 + Math.sin(-nAng) * (W / 2 - 12) * -1;
      const ny = W / 2 - Math.cos(-nAng) * (W / 2 - 12);
      c.fillStyle = "#111";
      c.beginPath();
      c.arc(nx, ny, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fff";
      c.font = "bold 11px system-ui";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("N", nx, ny + 1);
    };

    const buildMini = (m: MapData) => {
      const [X0, Z0, X1, Z1] = m.bounds;
      miniScale = 1.4;
      const cv = document.createElement("canvas");
      cv.width = Math.ceil((X1 - X0) * miniScale);
      cv.height = Math.ceil((Z1 - Z0) * miniScale);
      const c = cv.getContext("2d")!;
      c.fillStyle = "#55585e";
      c.fillRect(0, 0, cv.width, cv.height);
      const poly = (f: number[], fill: string) => {
        c.fillStyle = fill;
        c.beginPath();
        for (let i = 0; i < f.length; i += 2) {
          const x = (f[i] - X0) * miniScale;
          const y = (f[i + 1] - Z0) * miniScale;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.closePath();
        c.fill();
      };
      for (const b of m.blocks) poly(b, "#a9a59c");
      for (const p of [...m.parks, ...m.grass]) poly(p, "#5f9a45");
      for (const b of m.bld) if (b.k === 0 || b.k === 1) poly(b.p, b.m === "church" ? "#f87171" : b.m === "mercadao" ? "#a855f7" : "#d7ccb6");
      c.strokeStyle = "#7a4a2a";
      c.lineWidth = 3 * miniScale;
      for (const r of m.rails) {
        const p = pts(r.c);
        c.beginPath();
        p.forEach(([x, z], i) => (i ? c.lineTo((x - X0) * miniScale, (z - Z0) * miniScale) : c.moveTo((x - X0) * miniScale, (z - Z0) * miniScale)));
        c.stroke();
      }
      c.strokeStyle = "#fbbf24";
      for (const r of m.roads.filter((x) => x.b)) {
        c.lineWidth = r.w * miniScale;
        const p = pts(r.c);
        c.beginPath();
        p.forEach(([x, z], i) => (i ? c.lineTo((x - X0) * miniScale, (z - Z0) * miniScale) : c.moveTo((x - X0) * miniScale, (z - Z0) * miniScale)));
        c.stroke();
      }
      miniImg = cv;
    };

    (async () => {
      try {
        map = await loadMap();
        if (disposed) return;
        setLoading({ step: "Montando as ruas e os prédios…", p: 0.25 });
        await new Promise((r) => setTimeout(r, 30));
        col = new Collider(map);
        city = buildCity(map, col, { low });
        scene.add(city.group);
        extras = buildExtras(map, col, { low });
        scene.add(extras.group);
        interior = buildChurchInterior({ low });
        scene.add(interior.group);
        buildMini(map);
        setLoading({ step: "Chamando o povo de Madureira…", p: 0.55 });
        const kit = new PeopleKit();
        await kit.load((p) => setLoading({ step: "Chamando o povo de Madureira…", p: 0.55 + p * 0.4 }));
        if (disposed) return;
        player = kit.make(avatar, 7, !low);
        scene.add(player.root);
        // começa dentro do templo, de frente para a porta dos fundos
        px = interior.spawn.x;
        pz = interior.spawn.z;
        pyaw = interior.spawn.yaw;
        camYaw = interior.spawn.yaw;
        const lanes = buildLanes(map, col);
        crowd = new Crowd(kit, lanes, col, scene, !low);
        crowd.spawn(low ? 34 : 60, map.spawn.x, map.spawn.z, Date.now() % 100000);
        // louvor no palco e congregação em pé entre os bancos
        interior.people.forEach((sp, i) => {
          const a = kit.make(sp.model, 900 + i * 7, false);
          a.root.position.set(sp.x, sp.y, sp.z);
          a.root.rotation.y = sp.yaw;
          play(a, sp.stage || i % 3 === 0 ? "Clapping" : "Idle");
          a.mixer.setTime(i * 0.37);
          scene.add(a.root);
          intActors.push(a);
        });
        setLoading(null);
        if (process.env.NODE_ENV !== "production") (window as unknown as { __missao: unknown }).__missao = { get p() { return { px, pz, camYaw }; }, tp: (x: number, z: number) => ((px = x), (pz = z)), cam: (y: number, p: number, d: number) => ((camYaw = y), (camPitch = p), (camDist = d)), crowd, map, renderer, scene, camera, interior, city, go: (inside: boolean) => { inChurch = inside; started = true; if (inside && interior) { px = interior.entry.x; pz = interior.entry.z; pyaw = interior.entry.yaw; camYaw = interior.entry.yaw; } }, tick: (dt: number) => tick(dt, performance.now()), keys };
        last = performance.now();
        loop();
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar Madureira. Verifique a internet e tente de novo.");
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("keydown", kd);
      removeEventListener("keyup", ku);
      crowd?.dispose();
      city?.dispose();
      extras?.dispose();
      interior?.dispose();
      for (const a of intActors) a.mixer.stopAllAction();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = Math.floor(hud.left / 60);
  const ss = String(hud.left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[70] select-none overflow-hidden bg-black font-sans text-white" style={{ touchAction: "none" }}>
      <div ref={wrap} className="absolute inset-0" />

      {loading ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c1220]">
          <p className="mb-1 text-2xl font-black tracking-tight">Missão Madureira</p>
          <p className="mb-5 text-sm text-white/70">{loading.step}</p>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.round(loading.p * 100)}%` }} />
          </div>
          {error ? (
            <>
              <p className="mt-5 max-w-xs text-center text-sm text-rose-300">{error}</p>
              <button type="button" onClick={onExit} className="mt-3 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                Voltar
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* HUD */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-start gap-3">
        <div className="rounded-2xl bg-black/55 px-3 py-2 shadow-lg ring-1 ring-white/15 backdrop-blur">
          <p className={`text-2xl font-black tabular-nums leading-none ${hud.left <= 30 ? "text-rose-300" : ""}`}>
            {mm}:{ss}
          </p>
          <p className="mt-1 text-xs font-bold text-amber-300">✝️ {hud.saved} evangelizado{hud.saved === 1 ? "" : "s"}</p>
          {hud.flying ? <p className="mt-1 text-xs font-bold text-sky-300">✈️ Voando · {hud.alt} m</p> : null}
        </div>
      </div>
      {hud.inChurch && !hud.started && !loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-black/60 px-4 py-3 text-center text-sm font-bold ring-1 ring-white/20 backdrop-blur">
            <p className="text-amber-300">“Ide, portanto, fazei discípulos de todas as nações.” (Mt 28:19)</p>
            <p className="mt-1 text-white/90">Atravesse a porta do fundo do templo para sair pelas ruas de Madureira. O relógio só começa quando você sair.</p>
          </div>
        </div>
      ) : null}
      <canvas ref={mini} width={150} height={150} className={`pointer-events-none absolute z-10 ${touch ? "right-3 top-3 h-[110px] w-[110px]" : "bottom-4 left-4 h-[150px] w-[150px]"}`} />
      {hud.place ? <p className={`pointer-events-none absolute z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-bold ${touch ? "right-3 top-[124px]" : "bottom-[172px] left-4"}`}>{hud.place}</p> : null}
      <button type="button" onClick={onExit} className={`absolute z-10 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 ${touch ? "left-3 top-[86px]" : "right-3 top-3"}`}>
        Sair
      </button>

      {hud.near && !talk && !over ? (
        <button type="button" onClick={() => api.current?.startTalk()} className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-blue-600 px-5 py-3 text-base font-black shadow-xl ring-2 ring-white/70 active:scale-95">
          💬 Falar de Jesus com {hud.near} {touch ? "" : <span className="ml-1 rounded bg-white/25 px-1.5 text-xs">E</span>}
        </button>
      ) : null}

      {touch && !talk ? (
        <>
          <button
            type="button"
            onPointerDown={() => {
              setRunning((r) => {
                api.current?.run(!r);
                return !r;
              });
            }}
            className={`absolute bottom-6 right-6 z-10 h-16 w-16 rounded-full text-sm font-black ring-2 ring-white/60 ${running ? "bg-amber-500" : "bg-black/45"}`}
          >
            {running ? "Andar" : "Correr"}
          </button>
          {!hud.inChurch ? (
            <>
              <button type="button" onPointerDown={() => api.current?.fly()} className={`absolute bottom-28 right-6 z-10 h-14 w-14 rounded-full text-xs font-black ring-2 ring-white/60 ${hud.flying ? "bg-sky-500" : "bg-black/45"}`}>
                ✈️ Voar
              </button>
              {hud.flying ? (
                <>
                  <button type="button" onPointerDown={() => (vert.current.up = true)} onPointerUp={() => (vert.current.up = false)} onPointerLeave={() => (vert.current.up = false)} onPointerCancel={() => (vert.current.up = false)} className="absolute bottom-44 right-6 z-10 h-14 w-14 rounded-full bg-black/45 text-xl font-black ring-2 ring-white/60">
                    ▲
                  </button>
                  <button type="button" onPointerDown={() => (vert.current.down = true)} onPointerUp={() => (vert.current.down = false)} onPointerLeave={() => (vert.current.down = false)} onPointerCancel={() => (vert.current.down = false)} className="absolute bottom-44 right-24 z-10 h-14 w-14 rounded-full bg-black/45 text-xl font-black ring-2 ring-white/60">
                    ▼
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          {stickUi ? (
            <div className="pointer-events-none absolute z-10 h-28 w-28 rounded-full bg-white/10 ring-2 ring-white/30" style={{ left: stickUi.ox - 56, top: stickUi.oy - 56 }}>
              <div className="absolute h-12 w-12 rounded-full bg-white/50" style={{ left: 32 + stickUi.x, top: 32 + stickUi.y }} />
            </div>
          ) : (
            <p className="pointer-events-none absolute bottom-6 left-6 z-10 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">Arraste à esquerda para andar · à direita para olhar</p>
          )}
        </>
      ) : !touch && !loading ? (
        <p className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">WASD andar · Shift correr · Espaço ×2 voar · arraste para olhar · E falar</p>
      ) : null}

      {talk ? <TalkPanel talk={talk} onSubmit={(r, i) => api.current?.submit(r, i) ?? null} onClose={() => api.current?.closeTalk()} onVerdict={(v) => setTalk((t) => (t ? { ...t, verdict: v } : t))} /> : null}

      {over ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <p className="text-4xl font-black">⏰ Tempo!</p>
        </div>
      ) : null}
    </div>
  );
}

function TalkPanel({ talk, onSubmit, onClose, onVerdict }: { talk: Talk; onSubmit: (ref: string, idea: string) => Verdict | null; onClose: () => void; onVerdict: (v: Verdict | null) => void }) {
  const [ref, setRef] = useState("");
  const [idea, setIdea] = useState("");
  const v = talk.verdict;
  const yes = YES[talk.npc.id % YES.length];
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-lg rounded-3xl bg-[#0f172a]/95 p-4 shadow-2xl ring-1 ring-white/15">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl">🙂</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">{talk.npc.name}</p>
            <p className="text-sm text-white/85">“{v ? (v.ok ? yes : talk.npc.mood.no) : talk.npc.mood.hi}”</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-2.5 py-1 text-sm font-black" aria-label="Fechar">
            ✕
          </button>
        </div>

        {v ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-bold text-white/70">
              <span>{v.ref ?? "Referência não reconhecida"}</span>
              <span>precisa de {PASS}%</span>
            </div>
            <div className="mt-1 h-4 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${v.ok ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${v.score}%` }} />
            </div>
            <p className={`mt-1 text-2xl font-black ${v.ok ? "text-emerald-300" : "text-amber-300"}`}>
              {v.score}% {v.ok ? "· +1 evangelizado! ✝️" : "· não foi dessa vez"}
            </p>
            {v.hit.length ? <p className="mt-1 text-xs text-white/70">Você falou de: {v.hit.join(", ")}.</p> : null}
            {v.tips.map((t) => (
              <p key={t} className="mt-1 text-xs font-semibold text-sky-300">
                💡 {t}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              {!v.ok && talk.npc.fails < 2 ? (
                <button type="button" onClick={() => onVerdict(null)} className="flex-1 rounded-full bg-blue-600 py-2.5 text-sm font-black">
                  Tentar de novo
                </button>
              ) : null}
              <button type="button" onClick={onClose} className="flex-1 rounded-full bg-white/15 py-2.5 text-sm font-black">
                {v.ok ? "Próxima pessoa" : "Seguir"}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const r = onSubmit(ref, idea);
              if (r) onVerdict(r);
            }}
          >
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Referência (ex.: João 3:16)" className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-blue-400" autoFocus />
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.slice(0, 5).map((s) => (
                <button key={s} type="button" onClick={() => setRef(s)} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/80">
                  {s}
                </button>
              ))}
            </div>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="A ideia com as suas palavras (ex.: Deus te ama tanto que mandou Jesus morrer por você; quem crê nele tem vida eterna)" rows={3} className="w-full resize-none rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-blue-400" />
            <button type="submit" disabled={!ref.trim() || !idea.trim()} className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-black text-black disabled:opacity-40">
              Falar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

