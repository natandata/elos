import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "ELOS",
  description: "Missões, acompanhamento e ranking do seu Elo.",
  applicationName: "ELOS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "ELOS",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  other: {
    // O Next emite só o "mobile-web-app-capable" moderno; o Safari no iOS
    // continua olhando para a versão com prefixo da Apple para abrir em tela
    // cheia depois de "Adicionar à Tela de Início".
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
