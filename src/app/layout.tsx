import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ELOS",
  description: "Plataforma de acompanhamento, discipulado e missões dos ELOS.",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme = "neutral";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("gender, role")
        .eq("id", user.id)
        .maybeSingle();

      if (data && data.role !== "admin" && data.gender) theme = data.gender;
    }
  } catch {
    // Sem Supabase configurado ainda: segue no tema neutro.
  }

  return (
    <html lang="pt-BR" data-theme={theme}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
