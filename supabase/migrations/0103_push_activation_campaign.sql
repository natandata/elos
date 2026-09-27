-- ELOS — "campanha" liga/desliga controlada pelo admin: enquanto ativa, todo
-- usuário sem push ainda ligado vê um card pedindo pra ativar, logo depois
-- de responder a pesquisa de status diária. Linha única (id sempre true).
create table if not exists public.push_activation_campaign (
  id         boolean primary key default true check (id),
  active     boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.push_activation_campaign (id, active)
values (true, false)
on conflict (id) do nothing;

alter table public.push_activation_campaign enable row level security;

-- todo usuário autenticado precisa ler o estado (decide se mostra o card);
-- só o admin liga/desliga.
create policy push_activation_campaign_read on public.push_activation_campaign
  for select to authenticated using (true);
create policy push_activation_campaign_admin_write on public.push_activation_campaign
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
