import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeftIcon, ComposeIcon } from "@/components/feed/icons";
import { DmList, type DmListItem } from "@/components/elogram/DmList";

export default async function ElogramMessagesPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // admin só lê (a tela de conversas dele é a da liderança)
  const canSend = profile.role === "leader" || profile.role === "cria";
  const { data } = canSend ? await supabase.rpc("dm_list") : { data: [] };
  const items = (data ?? []) as DmListItem[];
  const monitor = profile.role === "admin" || profile.role === "leader";

  return (
    <div>
      <header className="flex items-center gap-2 px-3 pb-3 pt-3">
        <Link href="/app/elogram" aria-label="Voltar" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
          <ChevronLeftIcon />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{profile.username || profile.full_name}</h1>
        {canSend ? (
          <Link href="/app/elogram/mensagens/nova" aria-label="Nova mensagem" className="rounded-lg p-1.5">
            <ComposeIcon size={27} />
          </Link>
        ) : null}
      </header>

      {canSend ? (
        <DmList items={items} myId={profile.id} monitorLink={monitor} />
      ) : (
        <div className="px-6 py-10 text-center text-sm text-[var(--muted)]">
          <p>Você pode ler as conversas do Elogram.</p>
          <Link href="/app/elogram/mensagens/todas" className="btn btn-primary mt-4 inline-block">
            Ver todas as conversas
          </Link>
        </div>
      )}
    </div>
  );
}
