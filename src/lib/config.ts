/**
 * Configuração pública do Supabase.
 *
 * A URL e a chave anônima são públicas por definição — elas vão no bundle do
 * navegador de qualquer forma, e quem protege os dados é o Row Level Security.
 * Os valores abaixo são o fallback do projeto ELOS; qualquer ambiente pode
 * sobrescrevê-los pelas variáveis NEXT_PUBLIC_*.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xhwrgaofcwrbtbjyflyw.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_B8gI2177pyZtSOflXLoehA_Fr_oCy2w";
