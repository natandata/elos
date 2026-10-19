-- ELOS — Sala de Jogos travada até o cria ler a Bíblia por 5 minutos no dia (dia = Brasília, vira à meia-noite).
-- O tempo é contado AQUI no banco, a partir dos "pings" da tela da Bíblia: um ping rápido demais não rende mais que
-- o tempo real que passou, e um intervalo grande (aba fechada, parada) não rende nada. Só vale para role = cria.

create table if not exists public.bible_reading_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  seconds int not null default 0,
  last_ping timestamptz,
  unlocked_at timestamptz,
  primary key (user_id, day)
);
alter table public.bible_reading_daily enable row level security;

drop policy if exists bible_reading_select on public.bible_reading_daily;
create policy bible_reading_select on public.bible_reading_daily for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- sem política de insert/update/delete: só a função abaixo escreve.

create or replace function public.record_bible_reading()
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_need constant int := 300;
  v_role text;
  v_row public.bible_reading_daily;
  v_gap numeric;
  v_add int := 0;
  v_total int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'cria' then
    return jsonb_build_object('seconds', v_need, 'required', v_need, 'unlocked', true);
  end if;

  insert into public.bible_reading_daily (user_id, day) values (auth.uid(), v_day) on conflict do nothing;
  select * into v_row from public.bible_reading_daily where user_id = auth.uid() and day = v_day for update;

  if v_row.unlocked_at is not null then
    return jsonb_build_object('seconds', v_row.seconds, 'required', v_need, 'unlocked', true);
  end if;

  if v_row.last_ping is not null then
    v_gap := extract(epoch from (now() - v_row.last_ping));
    -- ping normal (a tela manda um a cada ~15 s): rende o tempo real, no máximo 20 s; intervalo longo não rende
    if v_gap >= 1 and v_gap <= 40 then v_add := round(least(v_gap, 20))::int; end if;
  end if;
  v_total := v_row.seconds + v_add;

  update public.bible_reading_daily
     set seconds = v_total,
         last_ping = now(),
         unlocked_at = case when v_total >= v_need then now() else null end
   where user_id = auth.uid() and day = v_day;

  return jsonb_build_object('seconds', v_total, 'required', v_need, 'unlocked', v_total >= v_need);
end $fn$;
revoke execute on function public.record_bible_reading() from anon, public;
grant execute on function public.record_bible_reading() to authenticated;
