import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

// Auto-hospedada pelo Next (sem requisição externa em runtime, sem piscar
// fonte). Geométrica e arredondada — mais "jovem" que a system font, sem
// perder legibilidade em tela pequena.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-app",
  display: "swap",
});

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

// A cor do tema (data-theme) depende de quem está logado — nunca pode virar
// HTML estático compartilhado entre contas diferentes.
export const dynamic = "force-dynamic";

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

      // líder homem tem cor própria (vermelho); líder mulher mantém o rosa,
      // igual às crias — só o líder homem sai do amarelo padrão masculino
      if (data?.role === "leader" && data.gender === "male") theme = "leader";
      else if (data && data.role !== "admin" && data.gender) theme = data.gender;
    }
  } catch {
    // Sem Supabase configurado ainda: segue no tema neutro.
  }

  return (
    <html lang="pt-BR" data-theme={theme} className={jakarta.variable}>
      <head>
        {/* Aplica claro/escuro antes da primeira pintura — sem isso, a tela
            pisca no tema errado por uma fração de segundo a cada carga. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var m = localStorage.getItem('elos-theme-mode');
              if (!m) m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              document.documentElement.dataset.mode = m;
            }catch(e){}
            // Safari/PWA às vezes preserva uma rolagem horizontal "presa" de
            // antes do overflow-x:hidden entrar — força de volta pro início
            // a cada carregamento, senão a tela fica cortada de um lado.
            try{
              var resetX = function(){
                // não mexe se a pessoa deu pinch-zoom (o deslocamento é dela)
                if ((window.visualViewport && window.visualViewport.scale > 1.01)) return;
                document.documentElement.scrollLeft = 0;
                document.body.scrollLeft = 0;
              };
              resetX();
              window.addEventListener('pageshow', resetX);
            }catch(e){}
            })();`,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
