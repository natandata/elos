import { ListPage } from "@/components/spotcria/Pages";

export default function Minhas() {
  return (
    <ListPage
      mode="added_by_me"
      title="Adicionadas por mim"
      subtitle="{n} música(s) que você colocou na biblioteca"
      cover={<span className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-[#7e22ce] to-[#f0abfc] text-6xl shadow-xl">📤</span>}
      empty="Você ainda não adicionou músicas. Toque em “Criar” e escolha Adicionar música."
    />
  );
}
