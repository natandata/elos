"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email.server";
import { ROLE_LABEL, type Role } from "@/lib/types";

/**
 * Dispara o e-mail de boas-vindas na primeira vez que o usuário confirma a
 * conta (chamado a partir de /auth/callback). Idempotente via
 * welcome_email_sent_at — logins seguintes não reenviam.
 */
export async function sendWelcomeEmailIfNeeded(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, role, email_opt_in, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return;
  if (profile.welcome_email_sent_at) return;
  if (!profile.email_opt_in) {
    // Não manda e-mail, mas marca como "resolvido" pra não checar de novo a cada login.
    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId);
    return;
  }

  // admin_get_user_email só funciona pra admin chamando sobre outra pessoa;
  // aqui é o próprio usuário logo após confirmar a conta, então pega direto.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) return;

  const roleLabel = ROLE_LABEL[profile.role as Role];
  const firstName = profile.first_name || "";

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#7c3aed;color:#fff;font-weight:800;font-size:20px;padding:20px 24px;border-radius:12px 12px 0 0">
        ELOS
      </div>
      <div style="border:1px solid #e6e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px">
        <p style="line-height:1.6;color:#14142b;margin:0">
          Bem-vindo(a) ao ELOS${firstName ? `, ${firstName}` : ""}!
        </p>
        <p style="line-height:1.6;color:#14142b;margin-top:12px">
          Sua conta de <strong>${roleLabel}</strong> foi criada. No app você acompanha missões,
          ranking do seu Elo, agenda e pode falar com seu grupo pelo chat.
        </p>
        <p style="margin-top:24px;padding-top:16px;border-top:1px solid #e6e8f0;color:#6b7280;font-size:12px">
          Você pode desligar e-mails como este a qualquer momento em Perfil, dentro do app.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: "Bem-vindo(a) ao ELOS",
    html,
  });

  if (result.ok) {
    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId);
  }
}
