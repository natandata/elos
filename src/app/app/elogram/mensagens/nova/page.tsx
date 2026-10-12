import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ElogramSearch } from "@/components/elogram/ElogramSearch";

export default async function NewMessagePage() {
  const { profile } = await requireProfile();
  if (profile.role !== "leader" && profile.role !== "cria") redirect("/app/elogram/mensagens");

  return (
    <ElogramSearch
      backHref="/app/elogram/mensagens"
      hrefBase="/app/elogram/mensagens/com/"
      title="Para:"
      placeholder="Nome ou @usuário"
    />
  );
}
