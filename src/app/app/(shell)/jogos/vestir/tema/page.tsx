import { redirect } from "next/navigation";

// O jogo agora é só com as amigas (salas ao vivo): os modos solo foram desligados.
export default function Page() {
  redirect("/app/jogos/vestir");
}
