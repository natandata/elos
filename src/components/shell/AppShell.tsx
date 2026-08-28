"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/actions/session";
import { Avatar } from "@/components/Avatar";
import { PresenceHeartbeat } from "./PresenceHeartbeat";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { PushPermissionBanner } from "@/components/push/PushControl";

export type NavItem = {
  /** Ausente quando o item é só um agrupador sem página própria (ex.: "Status Geral"). */
  href?: string;
  label: string;
  icon: string;
  badge?: number;
  /** Itens agrupados dentro deste (menu do admin): aparecem recolhidos por padrão. */
  children?: NavItem[];
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // fecha o menu lateral do mobile sozinho ao trocar de página
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href?: string) =>
    !!href && (href === pathname || (href !== "/app" && pathname.startsWith(href + "/")));

  const navList = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const hasChildren = !!item.children?.length;
        const groupKey = item.href ?? item.label;
        const childActive = hasChildren && item.children!.some((c) => isActive(c.href));
        const isExpanded = expanded[groupKey] ?? childActive;

        if (!hasChildren) {
          return (
            <li key={groupKey}>
              <Link
                href={item.href!}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive(item.href)
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
                <NavBadge count={item.badge ?? 0} />
              </Link>
            </li>
          );
        }

        // Item com filhos: se tiver página própria, o rótulo também é link
        // (a seta só recolhe/expande); sem página própria, o rótulo é só o
        // botão de expandir (ex.: "Status Geral", que não existe como página).
        const label = (
          <span className="flex flex-1 items-center gap-2.5 px-3 py-2.5">
            {item.label}
          </span>
        );

        return (
          <li key={groupKey}>
            <div
              className={`flex items-center gap-1 rounded-xl text-sm font-semibold transition ${
                isActive(item.href) && !childActive
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
              }`}
            >
              {item.href ? (
                <Link href={item.href} onClick={onNavigate} className="flex flex-1">
                  {label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [groupKey]: !isExpanded }))}
                  className="flex flex-1 text-left"
                >
                  {label}
                </button>
              )}
              <button
                type="button"
                aria-label={isExpanded ? `Recolher ${item.label}` : `Expandir ${item.label}`}
                onClick={() => setExpanded((prev) => ({ ...prev, [groupKey]: !isExpanded }))}
                className="px-2.5 py-2.5"
              >
                <span aria-hidden className={`inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>
            </div>

            {isExpanded ? (
              <ul className="mt-1 space-y-1 border-l border-[var(--line)] pl-3">
                {item.children!.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href!}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        isActive(child.href)
                          ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {child.label}
                      <NavBadge count={child.badge ?? 0} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-dvh">
      <PresenceHeartbeat />
      {/* topo */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-sm md:hidden"
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]">
              E
            </span>
            <span className="text-lg font-black tracking-tight">ELOS</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeModeToggle />

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-sm text-[var(--muted)] md:hidden"
              aria-label="Recarregar página"
              title="Recarregar página"
            >
              ⟳
            </button>

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
          <div className="sticky top-20">{navList()}</div>
        </nav>

        <main className="min-w-0 flex-1">
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
            {!pending ? <PushPermissionBanner /> : null}
            {children}
          </div>
        </main>
      </div>

      {/* menu lateral (mobile) — abre por cima de tudo, com rolagem própria */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-[var(--card)] p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]">
                  E
                </span>
                <span className="text-lg font-black tracking-tight">ELOS</span>
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-sm"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>
            <div className={pending ? "pointer-events-none opacity-40 grayscale" : ""}>
              {navList(() => setMenuOpen(false))}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
