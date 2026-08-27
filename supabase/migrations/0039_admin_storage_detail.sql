-- ELOS — visão detalhada de "o que está ocupando espaço", pra página Geral:
-- tamanho por tabela (banco) e por bucket/tipo de arquivo (storage).

create or replace function public.admin_table_sizes()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;

  select coalesce(jsonb_agg(t order by (t->>'bytes')::bigint desc), '[]'::jsonb)
    into result
    from (
      select jsonb_build_object(
               'name', c.relname,
               'bytes', pg_total_relation_size(c.oid)
             ) as t
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind = 'r'
    ) rows;

  return result;
end $fn$;

revoke execute on function public.admin_table_sizes() from anon, public;
grant  execute on function public.admin_table_sizes() to authenticated;

create or replace function public.admin_storage_detail()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Apenas admin'; end if;

  select jsonb_build_object(
    'buckets', (
      select coalesce(jsonb_agg(b order by (b->>'bytes')::bigint desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'bucket_id', bucket_id,
                   'count', count(*),
                   'bytes', sum(coalesce((metadata->>'size')::bigint, 0))
                 ) as b
            from storage.objects
           group by bucket_id
        ) rows
    ),
    'by_type', (
      select coalesce(jsonb_agg(t order by (t->>'bytes')::bigint desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
                   'bucket_id', bucket_id,
                   'mimetype', coalesce(metadata->>'mimetype', 'desconhecido'),
                   'count', count(*),
                   'bytes', sum(coalesce((metadata->>'size')::bigint, 0))
                 ) as t
            from storage.objects
           group by bucket_id, coalesce(metadata->>'mimetype', 'desconhecido')
        ) rows
    )
  ) into result;

  return result;
end $fn$;

revoke execute on function public.admin_storage_detail() from anon, public;
grant  execute on function public.admin_storage_detail() to authenticated;
