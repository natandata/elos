"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PaperDoll } from "./PaperDoll";
import type { DollBase } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";
import { pop } from "@/lib/games/dress/sfx";
import { createClient } from "@/lib/supabase/client";

/** Convite por link: abre direto na sala (quem clicar entra sozinha). */
export function InviteButton({ code, label = "🔗 Convidar amiga por link" }: { code: string; label?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    const url = `${location.origin}/app/jogos/vestir/sala/${code}`;
    const text = `Vem jogar Vista o Herói comigo no ELOS! Sala ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Vista o Herói", text, url });
        return;
      }
    } catch {
      return; // ela fechou o menu de compartilhar
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setMsg("Link copiado! Cole na conversa com as amigas.");
    } catch {
      setMsg(url);
    }
    setTimeout(() => setMsg(null), 4000);
  }
  return (
    <div className="mt-3">
      <button type="button" className="vh-btn vh-btn-purple !text-sm" onClick={() => void go()}>
        {label}
      </button>
      {msg ? (
        <p className="mt-1 break-all text-center text-[11px] font-bold text-amber-100" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

const EMOJIS = ["👏", "🔥", "💖", "😍", "✨"];
type Float = { key: number; e: string; x: number };

/** Reações rápidas durante o desfile: aparecem flutuando na tela de todas as jogadoras. */
export function Reactions({ code, round, meId }: { code: string; round: number; meId: string }) {
  const sb = useMemo(() => createClient(), []);
  const chRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const counter = useRef(0);
  const last = useRef(0);

  const show = (e: string) => {
    const key = ++counter.current;
    setFloats((f) => [...f.slice(-24), { key, e, x: 8 + Math.random() * 84 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.key !== key)), 2600);
  };

  useEffect(() => {
    const ch = sb.channel(`dress-react:${code}:${round}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "r" }, ({ payload }) => {
      const p = payload as { id?: string; e?: string };
      if (p?.e && EMOJIS.includes(p.e) && p.id !== meId) show(p.e);
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      chRef.current = null;
      void sb.removeChannel(ch);
    };
  }, [sb, code, round, meId]);

  const send = (e: string, now: number) => {
    if (now - last.current < 450) return;
    last.current = now;
    show(e);
    pop();
    void chRef.current?.send({ type: "broadcast", event: "r", payload: { id: meId, e } });
  };

  return (
    <>
      <div className="vh-reactbar" role="group" aria-label="Reações">
        {EMOJIS.map((e) => (
          <button key={e} type="button" className="vh-react" onClick={(ev) => send(e, ev.timeStamp)} aria-label={`Reagir ${e}`}>
            {e}
          </button>
        ))}
      </div>
      <div className="vh-react-layer" aria-hidden>
        {floats.map((f) => (
          <span key={f.key} className="vh-react-float" style={{ left: `${f.x}%` }}>
            {f.e}
          </span>
        ))}
      </div>
    </>
  );
}

function svgToCanvas(svg: SVGSVGElement, w: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const vb = (svg.getAttribute("viewBox") ?? "0 0 200 360").split(/\s+/).map(Number);
    const h = Math.round(w / (vb[2] / vb[3]));
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.removeAttribute("class");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
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

export type PodiumEntry = { id: string; name: string; place: number; base: DollBase; look: Look; score: number };

/** Foto do pódio para compartilhar: monta uma imagem com as três primeiras e o tema da rodada. */
export function PodiumPhoto({ theme, entries }: { theme: string; entries: PodiumEntry[] }) {
  const bank = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function make() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const W = 1080;
      const H = 1350;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#3a1260");
      bg.addColorStop(1, "#12041f");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(255,210,63,0.12)";
      for (let i = 0; i < 40; i++) {
        g.beginPath();
        g.arc(Math.random() * W, Math.random() * H * 0.7, 2 + Math.random() * 4, 0, Math.PI * 2);
        g.fill();
      }
      g.textAlign = "center";
      g.fillStyle = "#ffd23f";
      g.font = "900 96px system-ui, sans-serif";
      g.fillText("VISTA O HERÓI", W / 2, 130);
      g.fillStyle = "#ffe9a8";
      g.font = "800 48px system-ui, sans-serif";
      g.fillText(`Tema: ${theme}`, W / 2, 200);
      const svgs = [...(bank.current?.querySelectorAll("svg") ?? [])] as SVGSVGElement[];
      const imgs = await Promise.all(svgs.map((s) => svgToCanvas(s, 400)));
      // ordem do pódio: 2º, 1º, 3º
      const order = [1, 0, 2];
      const baseY = 1130;
      const heights = [250, 340, 190];
      order.forEach((idx, col) => {
        const e = entries[idx];
        const img = imgs[idx];
        if (!e || !img) return;
        const cx = 190 + col * 350;
        const bh = heights[col];
        const step = g.createLinearGradient(0, baseY - bh, 0, baseY);
        step.addColorStop(0, idx === 0 ? "#ffd23f" : idx === 1 ? "#d7dde6" : "#d99a5b");
        step.addColorStop(1, "#8a5a12");
        g.fillStyle = step;
        g.fillRect(cx - 150, baseY - bh + 40, 300, bh - 40);
        const ih = 520;
        const iw = (ih * img.width) / img.height;
        g.drawImage(img, cx - iw / 2, baseY - bh + 40 - ih + 10, iw, ih);
        g.fillStyle = "#3a1260";
        g.font = "900 86px system-ui, sans-serif";
        g.fillText(["🥇", "🥈", "🥉"][idx], cx, baseY - bh + 150);
        g.font = "900 40px system-ui, sans-serif";
        g.fillText(e.name.split(" ")[0].slice(0, 12), cx, baseY - bh + 210);
      });
      g.fillStyle = "#ffe9a8";
      g.font = "800 40px system-ui, sans-serif";
      g.fillText("ELOS · jogue com as amigas", W / 2, 1270);
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
      if (!blob) throw new Error("png");
      const file = new File([blob], "podio-vista-o-heroi.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Pódio do Vista o Herói" });
          setBusy(false);
          return;
        } catch {
          setBusy(false);
          return;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "podio-vista-o-heroi.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setMsg("Foto salva! Agora é só postar. 📸");
    } catch {
      setMsg("Não deu para montar a foto agora.");
    }
    setBusy(false);
  }

  const top = entries.slice(0, 3);
  return (
    <div className="mt-3">
      <button type="button" className="vh-btn vh-btn-purple !text-sm" disabled={busy || top.length === 0} onClick={() => void make()}>
        {busy ? "Montando…" : "📸 Foto do pódio para compartilhar"}
      </button>
      {msg ? (
        <p className="mt-1 text-center text-[11px] font-bold text-amber-100" role="status">
          {msg}
        </p>
      ) : null}
      <div ref={bank} aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 200, height: 360, overflow: "hidden", pointerEvents: "none" }}>
        {top.map((e) => (
          <PaperDoll key={e.id} base={e.base} look={e.look} />
        ))}
      </div>
    </div>
  );
}
