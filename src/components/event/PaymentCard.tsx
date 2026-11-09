import { getPayState } from "@/lib/event/server";
import { PaymentCardClient } from "./PaymentCardClient";

/** Tela inicial: quem marcou "Eu vou" vê como pagar a inscrição (Pix) e envia o comprovante, que o admin aprova. */
export async function PaymentCard() {
  const s = await getPayState();
  if (!s?.applies || s.rsvp !== "yes") return null;
  return <PaymentCardClient status={s.status} note={s.note} fileName={s.file_name} later={s.later_offered} payDate={s.pay_date} eventDate={s.event_date} />;
}
