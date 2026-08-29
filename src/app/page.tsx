import Link from "next/link";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { LiveCounters } from "@/components/auth/LiveCounters";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("login_background_images")
    .select("image_path")
    .order("position");
  const images = (data ?? []).map((r: { image_path: string }) => ({
    src: supabase.storage.from("login_bg").getPublicUrl(r.image_path).data.publicUrl,
  }));

  return (
    <ImageStreamHero images={images} className="relative min-h-dvh bg-[var(--bg)]">
      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeModeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-ink)]">
              E
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">ELOS</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Missões, acompanhamento e ranking do seu Elo.
            </p>
            <div className="mt-4">
              <LiveCounters />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)]/95 p-5 shadow-sm backdrop-blur-sm">
            <AuthPanel next={next} />
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/admin-access"
              className="text-xs font-medium text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]"
            >
              Acesso Administrativo
            </Link>
          </div>
        </div>
      </main>
    </ImageStreamHero>
  );
}
