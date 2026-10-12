-- 0202 criou dm_list_all com "thread_id" ambíguo (coluna de saída x coluna da tabela): qualifica as colunas.
create or replace function public.dm_list_all(p_limit int default 100)
returns table (
  thread_id uuid, a_id uuid, a_name text, a_avatar text, b_id uuid, b_name text, b_avatar text,
  last_body text, last_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_monitor_dm() then raise exception 'Apenas a liderança.'; end if;
  return query
    select t.id, a.id, a.full_name, a.avatar_url, b.id, b.full_name, b.avatar_url, m.body, m.created_at
      from public.dm_threads t
      join public.profiles a on a.id = t.user_a
      join public.profiles b on b.id = t.user_b
      join lateral (
        select dm.body, dm.created_at from public.dm_messages dm
         where dm.thread_id = t.id and dm.deleted_at is null order by dm.created_at desc limit 1
      ) m on true
     order by m.created_at desc
     limit greatest(1, least(p_limit, 300));
end;
$$;
