/** Aviso épico da tela inicial: o Cria mais frequente da Escola Bíblica Dominical vira carta na Arena dos Heróis. */
export function EbdAnnouncement() {
  return (
    <section className="ebd-wrap relative mb-5 overflow-hidden rounded-3xl border-[3px] border-amber-300 text-white shadow-[0_10px_40px_rgba(251,191,36,0.35)]" aria-label="Aviso da Escola Bíblica Dominical">
      <style>{`
        .ebd-wrap{background:radial-gradient(120% 90% at 50% 0%,#5b2a9c 0%,#2a1457 45%,#0d0820 100%)}
        .ebd-rays{position:absolute;inset:-60%;background:repeating-conic-gradient(from 0deg,rgba(253,224,71,.16) 0 7deg,transparent 7deg 20deg);animation:ebdSpin 40s linear infinite;pointer-events:none}
        .ebd-card{position:relative;animation:ebdFloat 3.4s ease-in-out infinite;transform-origin:center}
        .ebd-card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.65) 50%,transparent 65%);background-size:250% 100%;animation:ebdShine 3.2s ease-in-out infinite;mix-blend-mode:overlay;pointer-events:none}
        .ebd-glow{animation:ebdPulse 2.4s ease-in-out infinite}
        .ebd-spark{position:absolute;color:#fde68a;animation:ebdTwinkle 2.2s ease-in-out infinite;pointer-events:none}
        @keyframes ebdSpin{to{transform:rotate(360deg)}}
        @keyframes ebdFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-8px) rotate(2deg)}}
        @keyframes ebdShine{0%{background-position:160% 0}60%,100%{background-position:-60% 0}}
        @keyframes ebdPulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
        @keyframes ebdTwinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(25deg)}}
        @media (prefers-reduced-motion:reduce){.ebd-rays,.ebd-card,.ebd-card::after,.ebd-glow,.ebd-spark{animation:none}}
      `}</style>
      <div className="ebd-rays" aria-hidden />
      {["left-[8%] top-[12%]", "right-[10%] top-[8%]", "left-[18%] bottom-[34%]", "right-[16%] bottom-[30%]", "left-[46%] top-[4%]"].map((pos, i) => (
        <span key={pos} className={`ebd-spark text-xl ${pos}`} style={{ animationDelay: `${i * 0.45}s` }} aria-hidden>
          ✦
        </span>
      ))}

      <div className="relative px-5 pb-4 pt-5 text-center">
        <p className="inline-block rounded-full bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#2a1457] shadow">⚔️ Arena dos Heróis · nova carta</p>

        {/* a carta misteriosa, no estilo das cartas da Arena */}
        <div className="relative mx-auto mt-4 flex h-56 w-40 items-center justify-center">
          <span className="ebd-glow absolute inset-[-18%] rounded-full bg-amber-300/40 blur-2xl" aria-hidden />
          <div className="ebd-card h-full w-full rounded-2xl border-[4px] border-amber-300 bg-gradient-to-b from-[#fde68a] via-[#f59e0b] to-[#92400e] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
            <div className="flex h-full w-full flex-col items-center justify-between rounded-xl bg-gradient-to-b from-[#3b1d78] via-[#2a1457] to-[#140a30] px-2 py-2 ring-2 ring-amber-200/70">
              <span className="w-full rounded-md bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#4a2a05]">Lendária</span>
              <span className="relative flex flex-1 items-center justify-center">
                <span className="absolute h-24 w-24 rounded-full bg-amber-300/25 blur-xl" aria-hidden />
                <span className="relative text-[84px] font-black leading-none text-amber-200 drop-shadow-[0_4px_0_#4a2a05]">?</span>
              </span>
              <span className="w-full">
                <span className="block text-sm font-black leading-tight text-amber-100">Cria da EBD</span>
                <span className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-black text-white/80">
                  <span className="rounded-full bg-violet-600 px-1.5 py-0.5">🍞 ?</span>
                  <span>❤️ ?</span>
                  <span>⚔️ ?</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <h2 className="mx-auto mt-5 max-w-sm text-[19px] font-black leading-snug [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
          O <span className="text-amber-300">Cria mais frequente</span> da Escola Bíblica Dominical até o fim do ano se tornará uma <span className="text-amber-300">carta</span> no jogo Arena de Heróis
        </h2>
        <p className="mt-1 text-xs font-bold text-amber-100/80">Será que vai ser você? 👀</p>
      </div>

      <div className="relative flex items-center gap-3 border-t-2 border-amber-300/60 bg-black/45 px-4 py-3 backdrop-blur-sm">
        <span className="text-3xl" aria-hidden>
          📖
        </span>
        <p className="min-w-0 text-left text-[13px] font-bold leading-snug">
          <span className="block text-[10px] font-black uppercase tracking-widest text-amber-300">Lembrete</span>A Escola Bíblica Dominical acontece <b className="text-amber-200">todo domingo às 09h</b>, na <b className="text-amber-200">sala 203</b>.
        </p>
      </div>
    </section>
  );
}
