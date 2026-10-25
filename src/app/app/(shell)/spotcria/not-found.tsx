import Link from "next/link";

export default function SpotCriaNotFound() {
  return (
    <div className="px-6 py-20 text-center">
      <p className="text-5xl" aria-hidden>
        🎧
      </p>
      <h1 className="mt-4 text-xl font-black">Essa tela não existe</h1>
      <p className="mt-1 text-sm text-[#a7a7a7]">O link pode estar errado ou a lista não está mais disponível.</p>
      <Link href="/app/spotcria" className="mt-5 inline-block rounded-full bg-[#a855f7] px-6 py-3 text-sm font-black text-white">
        Voltar ao Spot Cria
      </Link>
    </div>
  );
}
