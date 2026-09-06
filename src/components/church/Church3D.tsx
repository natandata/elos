"use client";

import { useEffect, useRef, useState } from "react";

/* ── Modelo 3D da Primeira Igreja Batista de Madureira ───────────────
 * Feito só com transformações CSS (sem three.js): cada volume é uma
 * caixa de 5 faces posicionadas em `preserve-3d`, e a cena inteira gira
 * num `rotateX/rotateY` único. Isso mantém o bundle do app do mesmo
 * tamanho — uma lib de 3D custaria centenas de KB pra desenhar cinco
 * caixas paradas.
 *
 * As proporções vieram das fotos de referência da fachada (Praça do
 * Patriarca): volume principal comprido, faixa contínua de vidro escuro
 * no pavimento superior, fileira de aletas brancas no térreo, a torre
 * azul pontiaguda na esquina esquerda e o bloco anexo mais alto atrás.
 * ─────────────────────────────────────────────────────────────────── */

type Face = "front" | "back" | "left" | "right" | "top";

const TILE = "#f1f1ec";
const TILE_DARK = "#e2e2db";
const ROOF = "#cfcfc8";
const NAVY = "#1e3a6e";
const GLASS = "#243244";
const SIGN = "#6d3fbe";

function faceStyle(face: Face, w: number, h: number, d: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    overflow: "hidden",
  };
  switch (face) {
    case "front":
      return { ...base, width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: `translateZ(${d / 2}px)` };
    case "back":
      return { ...base, width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: `rotateY(180deg) translateZ(${d / 2}px)` };
    case "right":
      return { ...base, width: d, height: h, marginLeft: -d / 2, marginTop: -h / 2, transform: `rotateY(90deg) translateZ(${w / 2}px)` };
    case "left":
      return { ...base, width: d, height: h, marginLeft: -d / 2, marginTop: -h / 2, transform: `rotateY(-90deg) translateZ(${w / 2}px)` };
    case "top":
      return { ...base, width: w, height: d, marginLeft: -w / 2, marginTop: -d / 2, transform: `rotateX(90deg) translateZ(${h / 2}px)` };
  }
}

/** Sombreamento fake: cada orientação recebe um brilho fixo, o que dá
 *  volume sem precisar de luz de verdade. */
const FACE_BRIGHTNESS: Record<Face, number> = {
  front: 1,
  back: 0.88,
  left: 0.9,
  right: 0.94,
  top: 1.04,
};

function Box({
  w,
  h,
  d,
  x = 0,
  y = 0,
  z = 0,
  color = TILE,
  topColor,
  clip,
  faces = {},
}: {
  w: number;
  h: number;
  d: number;
  x?: number;
  y?: number;
  z?: number;
  color?: string;
  topColor?: string;
  clip?: string;
  faces?: Partial<Record<Face, React.ReactNode>>;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transformStyle: "preserve-3d",
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
      }}
    >
      {(["back", "left", "right", "front", "top"] as Face[]).map((f) => (
        <div
          key={f}
          style={{
            ...faceStyle(f, w, h, d),
            background: f === "top" ? (topColor ?? ROOF) : color,
            filter: `brightness(${FACE_BRIGHTNESS[f]})`,
            clipPath: f === "top" ? undefined : clip,
          }}
        >
          {faces[f]}
        </div>
      ))}
    </div>
  );
}

/** Faixa contínua de vidro escuro com montantes verticais. */
function GlassBand({ inset = 6 }: { inset?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${inset}%`,
        right: `${inset}%`,
        top: "14%",
        height: "44%",
        background: `linear-gradient(160deg, #3d4f68 0%, ${GLASS} 45%, #16202c 100%)`,
        backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1.5px, transparent 1.5px 26px), linear-gradient(160deg, #3d4f68 0%, ${GLASS} 45%, #16202c 100%)`,
        borderTop: "2px solid rgba(255,255,255,.5)",
        borderBottom: "2px solid rgba(255,255,255,.5)",
      }}
    />
  );
}

/** Janela em fita do bloco anexo (mais baixa que a nave principal). */
function SmallBand({ top }: { top: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "10%",
        right: "10%",
        top: `${top}%`,
        height: "16%",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,.22) 0 1.5px, transparent 1.5px 20px), linear-gradient(160deg, #465a75, #1d2836)",
        borderTop: "1.5px solid rgba(255,255,255,.45)",
        borderBottom: "1.5px solid rgba(255,255,255,.45)",
      }}
    />
  );
}

/** Gradil preto do muro — barras desenhadas na própria face do muro,
 *  em vez de um plano solto (que sumia dependendo do ângulo). */
function Fence({ height = "100%" }: { height?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height,
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(28,32,42,.9) 0 2px, transparent 2px 13px)",
      }}
    />
  );
}

/** Fileira de aletas brancas do térreo — o detalhe mais marcante da
 *  fachada real (lâminas verticais que afinam pra baixo). */
function Fins({ count }: { count: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "4%",
        right: "4%",
        bottom: 0,
        height: "32%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
      }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: "100%",
            background: "linear-gradient(180deg, #ffffff, #d9d9d2)",
            clipPath: "polygon(0 0, 100% 0, 62% 100%, 38% 100%)",
          }}
        />
      ))}
    </div>
  );
}

export function Church3D() {
  const [yaw, setYaw] = useState(-32);
  const [pitch, setPitch] = useState(-12);
  const [zoom, setZoom] = useState(1);
  const [spin, setSpin] = useState(true);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // giro automático quando ninguém está mexendo — a peça "vive" sozinha
  useEffect(() => {
    if (!spin) return;
    let frame = 0;
    const tick = () => {
      if (!dragging.current) setYaw((v) => (v + 0.12) % 360);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spin]);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setYaw((v) => v + dx * 0.4);
    // trava a inclinação: de cima demais o modelo vira uma planta baixa
    setPitch((v) => Math.max(-55, Math.min(4, v - dy * 0.25)));
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function reset() {
    setYaw(-32);
    setPitch(-12);
    setZoom(1);
  }

  return (
    <div>
      <div
        role="img"
        aria-label="Modelo tridimensional do prédio da Primeira Igreja Batista de Madureira: volume horizontal branco com faixa de janelas escuras, aletas verticais no térreo, torre azul pontiaguda na esquina e bloco anexo mais alto ao fundo."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-[340px] w-full cursor-grab overflow-hidden rounded-2xl border border-[var(--line)] active:cursor-grabbing sm:h-[420px]"
        style={{
          // pan-y: arrastar de lado gira o prédio, arrastar pra cima/baixo
          // continua rolando a página (não prende o dedo de quem só passa)
          touchAction: "pan-y",
          perspective: "1500px",
          background: "radial-gradient(120% 100% at 50% 0%, rgba(124,92,255,.16) 0%, transparent 60%), var(--bg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "60%",
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${0.8 * zoom})`,
          }}
        >
          {/* chão / praça */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 900,
              height: 640,
              marginLeft: -450,
              marginTop: -320,
              transform: "rotateX(90deg)",
              background:
                "radial-gradient(closest-side, rgba(150,140,130,.5), rgba(150,140,130,.14) 60%, transparent 76%)",
            }}
            aria-hidden
          />

          {/* muro baixo do perímetro, com o gradil na própria face */}
          <Box
            w={500}
            h={30}
            d={300}
            y={-15}
            color="#fbfbf8"
            topColor="#dcdcd4"
            faces={{
              front: <Fence height="46%" />,
              left: <Fence />,
              right: <Fence />,
            }}
          />

          {/* volume principal do templo */}
          <Box
            w={440}
            h={150}
            d={250}
            y={-100}
            faces={{
              front: (
                <>
                  <GlassBand />
                  <Fins count={22} />
                  <div
                    style={{
                      position: "absolute",
                      left: "26%",
                      right: "26%",
                      top: "60%",
                      height: 13,
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${SIGN}, #8b5cf6)`,
                      color: "#fff",
                      fontSize: 5,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    PRIMEIRA IGREJA BATISTA DE MADUREIRA
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: "44.5%",
                      width: "11%",
                      bottom: 0,
                      height: "26%",
                      background: "linear-gradient(180deg, #6b3f2a, #4a2a1b)",
                      borderTop: "2px solid rgba(255,255,255,.5)",
                    }}
                  />
                </>
              ),
              right: (
                <>
                  <GlassBand inset={8} />
                  <Fins count={12} />
                </>
              ),
              left: (
                <>
                  <GlassBand inset={8} />
                  <Fins count={12} />
                </>
              ),
              back: <div style={{ position: "absolute", inset: 0, background: TILE_DARK }} />,
            }}
          />

          {/* escadaria da entrada */}
          <Box w={96} h={12} d={26} y={-36} z={138} color="#f6f6f2" topColor="#e9e9e3" />

          {/* torre azul pontiaguda da esquina */}
          <Box
            w={30}
            h={205}
            d={30}
            x={-206}
            y={-127}
            z={112}
            color={NAVY}
            topColor={NAVY}
            clip="polygon(50% 0%, 100% 11%, 100% 100%, 0% 100%, 0% 11%)"
          />

          {/* bloco anexo (escola), mais alto, atrás à direita */}
          <Box
            w={165}
            h={198}
            d={175}
            x={302}
            y={-124}
            z={-38}
            color="#f6f6f3"
            topColor="#dedcd6"
            faces={{
              front: (
                <>
                  <SmallBand top={16} />
                  <SmallBand top={44} />
                  <SmallBand top={72} />
                </>
              ),
              left: (
                <>
                  <SmallBand top={16} />
                  <SmallBand top={44} />
                  <SmallBand top={72} />
                </>
              ),
              right: (
                <>
                  <SmallBand top={16} />
                  <SmallBand top={44} />
                  <SmallBand top={72} />
                </>
              ),
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSpin((v) => !v)} className="btn btn-ghost !py-1.5 !text-xs">
          {spin ? "⏸ Parar giro" : "▶ Girar sozinho"}
        </button>
        <button
          type="button"
          onClick={() => setZoom((v) => Math.min(1.8, v + 0.15))}
          aria-label="Aproximar"
          className="btn btn-ghost !px-3 !py-1.5 !text-xs"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((v) => Math.max(0.6, v - 0.15))}
          aria-label="Afastar"
          className="btn btn-ghost !px-3 !py-1.5 !text-xs"
        >
          −
        </button>
        <button type="button" onClick={reset} className="btn btn-ghost !py-1.5 !text-xs">
          Reposicionar
        </button>
        <span className="text-xs text-[var(--muted)]">Arraste de lado pra girar.</span>
      </div>
    </div>
  );
}
