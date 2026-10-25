import { ListPage } from "@/components/spotcria/Pages";
import { CoverArt } from "@/components/spotcria/ui";

export default function Minhas() {
  return (
    <ListPage
      mode="added_by_me"
      title="Adicionadas por mim"
      subtitle="{n} música(s) que você colocou na biblioteca"
      cover={<CoverArt kind="mine" className="w-full shadow-xl" />}
      empty="Você ainda não adicionou músicas. Toque em “Criar” e escolha Adicionar música."
    />
  );
}
