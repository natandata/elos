-- Shopping Elos: 2 ofertas raras por dia (10 peças => cada peça volta de 5 em 5 dias, como a tela avisa).
create or replace function public._mall_ensure_today()
returns date language plpgsql security definer set search_path to 'public' as $fn$
declare v_day date := (now() at time zone 'America/Sao_Paulo')::date; v_pool jsonb := public._mall_pool(); v_base integer; i integer; v_entry jsonb; v_start timestamptz;
begin
  if exists (select 1 from public.mall_rare_drops where day = v_day) then return v_day; end if;
  v_base := (v_day - date '2026-01-01') * 2;
  v_start := (v_day::timestamp) at time zone 'America/Sao_Paulo';
  for i in 0..1 loop
    v_entry := v_pool -> ((v_base + i) % jsonb_array_length(v_pool));
    insert into public.mall_rare_drops (day, family, price, stock, starts_at, ends_at)
    values (v_day, v_entry->>0, (v_entry->>1)::int, 3, v_start, v_start + interval '24 hours')
    on conflict (day, family) do nothing;
  end loop;
  return v_day;
end $fn$;
delete from public.mall_rare_drops d where d.day >= (now() at time zone 'America/Sao_Paulo')::date and not exists (select 1 from public.mall_rare_buys b where b.drop_id = d.id);
