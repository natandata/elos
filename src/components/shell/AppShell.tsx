"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/actions/session";
import { Avatar } from "@/components/Avatar";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 20 ? "+20" : count}
    </span>
  );
}

export function AppShell({
  items,
  name,
  roleLabel,
  eloName,
  avatarUrl,
  unread,
  pending = false,
  children,
}: {
  items: NavItem[];
  name: string;
  roleLabel: string;
  eloName?: string | null;
  avatarUrl?: string | null;
  unread: number;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === pathname || (href !== "/app" && pathname.startsWith(href + "/"));

  return (
    <div className="min-h-dvh">
      {/* topo */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]">
              E
            </span>
            <span className="text-lg font-black tracking-tight">ELOS</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/app/notificacoes"
              className="relative rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-sm"
              aria-label="Notificações"
            >
              🔔
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-2 py-1.5"
            >
              <Avatar url={avatarUrl} name={name} size={24} />
              <span className="hidden text-sm font-semibold sm:block">{name.split(" ")[0]}</span>
            </button>
          </div>
        </div>

        {open ? (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="card p-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar url={avatarUrl} name={name} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {roleLabel}
                    {eloName ? ` · ${eloName}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href="/app/perfil" className="btn btn-ghost flex-1 !py-2 !text-sm">
                  Perfil
                </Link>
                <form action={signOut} className="flex-1">
                  <button className="btn btn-ghost w-full !py-2 !text-sm">Sair</button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5">
        {/* menu lateral (desktop) */}
        <nav
          className={`hidden w-52 shrink-0 md:block ${
            pending ? "pointer-events-none opacity-40 grayscale" : ""
          }`}
        >
          <ul className="sticky top-20 space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive(item.href)
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                  <NavBadge count={item.badge ?? 0} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24 md:pb-6">
          {pending ? (
            <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <p className="font-bold">Conta aguardando aprovação</p>
              <p className="mt-1 text-sm">
                Sua conta de líder foi criada e já está no ar, mas ainda precisa ser liberada pela
                administração. Enquanto isso, tudo fica bloqueado — você recebe uma notificação
                assim que for aprovada.
              </p>
            </div>
          ) : null}

          <div className={pending ? "pointer-events-none select-none opacity-50 grayscale" : ""}>
            {children}
          </div>
        </main>
      </div>

      {/* menu inferior (mobile) */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--card)] md:hidden ${
          pending ? "pointer-events-none opacity-40 grayscale" : ""
        }`}
      >
        <ul className="mx-auto flex max-w-6xl">
          {items.slice(0, 5).map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  isActive(item.href) ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"
                }`}
              >
                <span className="relative text-base" aria-hidden>
                  {item.icon}
                  {(item.badge ?? 0) > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                      {(item.badge ?? 0) > 20 ? "+20" : item.badge}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
