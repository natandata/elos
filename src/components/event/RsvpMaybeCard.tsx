import { getRsvpState } from "@/lib/event/server";
import { RsvpMaybeButtons } from "./RsvpMaybeButtons";

/** Na tela de início: quem respondeu "Ainda não sei" pode trocar para Sim ou Não até o prazo. */
export async function RsvpMaybeCard() {
  const state = await getRsvpState();
  if (!state?.open || state.status !== "maybe") return null;
  return <RsvpMaybeButtons name={state.name} />;
}
