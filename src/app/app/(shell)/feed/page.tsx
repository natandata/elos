import { redirect } from "next/navigation";

/** O Explorar virou Elogram: links antigos (push, favoritos) continuam funcionando. */
export default function FeedRedirect() {
  redirect("/app/elogram");
}
