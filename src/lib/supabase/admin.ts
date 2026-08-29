import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Cliente com a chave de serviço — ignora RLS. Só para rotinas de manutenção
 * no servidor (nunca chega ao navegador).
 *
 * É indispensável para apagar arquivo do Storage sem uma sessão de admin
 * logada: o banco não pode apagar arquivo por SQL, e as rotinas noturnas não
 * têm usuário. Devolve null se a chave não estiver configurada, para o
 * chamador poder avisar em vez de falhar em silêncio.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
