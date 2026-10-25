import { ListPage } from "@/components/spotcria/Pages";

export default function Curtidas() {
  return (
    <ListPage
      mode="mine_liked"
      title="Músicas curtidas"
      cover={<span className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#c084fc] text-6xl shadow-xl">💜</span>}
      empty="Você ainda não curtiu nenhuma música. Toque em ⋯ e escolha Curtir."
    />
  );
}
