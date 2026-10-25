import { ListPage } from "@/components/spotcria/Pages";
import { CoverArt } from "@/components/spotcria/ui";

export default function Curtidas() {
  return (
    <ListPage
      mode="mine_liked"
      title="Músicas curtidas"
      cover={<CoverArt kind="liked" className="w-full shadow-xl" />}
      empty="Você ainda não curtiu nenhuma música. Toque nos três pontinhos de uma música e escolha Curtir."
    />
  );
}
