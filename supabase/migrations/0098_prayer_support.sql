-- ELOS — botão "Orei por você" nos pedidos compartilhados com o Elo: quem
-- registrou o pedido vê quantas pessoas já oraram, e cada oração avisa o
-- dono do pedido (notificação + push).

create table if not exists public.prayer_supports (
  prayer_id  uuid not null references public.prayer_requests(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);
alter table public.prayer_supports enable row level security;

-- Só leitura direta — o insert sempre passa pela RPC abaixo (que também
-- precisa notificar o dono, algo que uma policy simples não faz sozinha).
create policy prayer_supports_read on public.prayer_supports for select to authenticated using (
  exists (
    select 1 from public.prayer_requests pr
     where pr.id = prayer_supports.prayer_id
       and (
         pr.user_id = auth.uid()
         or (pr.scope = 'elo' and pr.elo_id = (select elo_id from public.profiles where id = auth.uid()))
         or public.is_admin()
       )
  )
);

create or replace function public.pray_for_request(p_prayer_id uuid)
returns table (owner_id uuid, notified boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  v_owner uuid;
  v_scope text;
  v_elo   uuid;
  v_name  text;
  v_rows  int;
begin
  select user_id, scope, elo_id into v_owner, v_scope, v_elo
    from public.prayer_requests where id = p_prayer_id;
  if v_owner is null then raise exception 'Pedido não encontrado'; end if;
  if v_scope <> 'elo' then raise exception 'Esse pedido não é compartilhado com o Elo'; end if;
  if auth.uid() is null then raise exception 'Sem permissão'; end if;
  if auth.uid() = v_owner then raise exception 'Você não pode orar pelo próprio pedido'; end if;
  if not (public.is_admin() or v_elo = (select elo_id from public.profiles where id = auth.uid())) then
    raise exception 'Sem permissão para orar por esse pedido';
  end if;

  insert into public.prayer_supports (prayer_id, user_id) values (p_prayer_id, auth.uid())
  on conflict (prayer_id, user_id) do nothing;
  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    select full_name into v_name from public.profiles where id = auth.uid();
    insert into public.notifications (user_id, title, body, link, category)
    values (
      v_owner,
      'Alguém orou pelo seu pedido 🙏',
      coalesce(nullif(v_name, ''), 'Alguém') || ' orou pelo seu pedido de oração.',
      '/app/devocional',
      'prayer'
    );
  end if;

  return query select v_owner, (v_rows > 0);
end $fn$;

revoke execute on function public.pray_for_request(uuid) from anon, public;
grant  execute on function public.pray_for_request(uuid) to authenticated;
