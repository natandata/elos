/**
 * Envio de e-mail via Resend — server-only. Nunca importe este arquivo de um
 * componente "use client": a RESEND_API_KEY não pode chegar ao navegador.
 *
 * O remetente é configurável por variável de ambiente porque o domínio da
 * Resend ainda está em verificação (registros DNS pendentes). Enquanto isso,
 * o remetente de testes (onboarding@resend.dev) só entrega para o e-mail
 * dono da conta Resend. Assim que o domínio verificar, trocar RESEND_FROM
 * (ex.: "ELOS <notificacoes@datawithnatan.com>") libera o envio para todo
 * mundo, sem mexer em código.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.RESEND_FROM || "ELOS <onboarding@resend.dev>";
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Envio de e-mail não configurado no servidor." };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    const message: string = body?.message || `Falha no envio (HTTP ${res.status}).`;

    // Erro conhecido do modo de teste da Resend: sem domínio verificado, só
    // entrega para o e-mail dono da conta. Traduz para algo acionável.
    if (message.includes("only send testing emails")) {
      return {
        ok: false,
        error:
          "O domínio de envio ainda não foi verificado na Resend. Por enquanto, e-mails só chegam à caixa da conta Resend usada para testar.",
      };
    }
    if (message.includes("domain is not verified")) {
      return {
        ok: false,
        error: "O domínio configurado em RESEND_FROM ainda não está verificado na Resend.",
      };
    }

    return { ok: false, error: message };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao serviço de e-mail." };
  }
}
