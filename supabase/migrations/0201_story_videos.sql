-- Vídeos nos stories (arquivo no Cloudflare R2; aqui só o registro, o limite diário e as regras).
--
-- Regras (ajustáveis em video_settings): 15 s, 70 MB por vídeo, 3 vídeos por pessoa
-- por dia e 1 GB no total por dia (dia = fuso de Brasília). O vídeo some junto com o
-- story, em 24h (o bucket do R2 também apaga o arquivo sozinho após 1 dia).

alter table public.story_posts
  add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video')),
  add column if not exists video_key text,
  add column if not exists video_bytes bigint,
  add column if not exists video_seconds numeric(4, 1);

alter table public.story_posts
  drop constraint if exists story_posts_video_chk;
alter table public.story_posts
  add constraint story_posts_video_chk check (media_type = 'image' or (video_key is not null and video_bytes is not null));

-- Quem posta não escreve os campos do vídeo direto: só o servidor (que confere o arquivo no R2).
revoke insert, update on public.story_posts from authenticated;
grant insert (author_id, image_path, caption) on public.story_posts to authenticated;
grant update (caption) on public.story_posts to authenticated;

create table if not exists public.video_settings (
  id          boolean primary key default true check (id),
  enabled     boolean not null default true,
  daily_bytes bigint  not null default 1073741824,
  max_bytes   bigint  not null default 73400320,
  max_seconds int     not null default 15,
  max_per_user int    not null default 3
);
insert into public.video_settings (id) values (true) on conflict do nothing;
alter table public.video_settings enable row level security;

create table if not exists public.video_uploads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  object_key text not null unique,
  bytes      bigint not null check (bytes > 0),
  day        date not null,
  status     text not null default 'reserved' check (status in ('reserved', 'done', 'released')),
  created_at timestamptz not null default now()
);
create index if not exists video_uploads_day_idx on public.video_uploads (day, status);
create index if not exists video_uploads_user_day_idx on public.video_uploads (user_id, day);
alter table public.video_uploads enable row level security;
-- sem policy: ninguém lê/escreve direto; tudo passa pelas funções abaixo.

create or replace function public.video_today()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Reserva a cota ANTES do envio: o servidor só assina o upload se isto devolver uma linha.
create or replace function public.reserve_video_upload(p_bytes bigint, p_seconds numeric)
returns table (upload_id uuid, object_key text)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.video_settings%rowtype;
  today date := public.video_today();
  used bigint;
  mine int;
  new_id uuid := gen_random_uuid();
  key text;
begin
  if uid is null then raise exception 'Faça login para postar.'; end if;
  if public.my_role() not in ('leader', 'cria') then raise exception 'Só líderes e crias postam vídeo.'; end if;

  select * into s from public.video_settings where id;
  if not s.enabled then raise exception 'Vídeos estão pausados por enquanto.'; end if;
  if p_bytes is null or p_bytes < 1 then raise exception 'Vídeo inválido.'; end if;
  if p_bytes > s.max_bytes then
    raise exception 'O vídeo passa de % MB.', (s.max_bytes / 1048576);
  end if;
  if p_seconds is null or p_seconds <= 0 or p_seconds > s.max_seconds + 0.5 then
    raise exception 'O vídeo precisa ter no máximo % segundos.', s.max_seconds;
  end if;

  -- trava global curta: a conta do dia não pode ser furada por dois envios ao mesmo tempo
  perform pg_advisory_xact_lock(hashtext('video_quota'));

  -- reservas que nunca viraram vídeo (envio abandonado) devolvem a cota depois de 20 min
  update public.video_uploads set status = 'released'
   where status = 'reserved' and created_at < now() - interval '20 minutes';
  delete from public.video_uploads where day < today - 7;

  select count(*) into mine from public.video_uploads
   where user_id = uid and day = today and status in ('reserved', 'done');
  if mine >= s.max_per_user then
    raise exception 'Você já postou % vídeos hoje. Volte amanhã!', s.max_per_user;
  end if;

  select coalesce(sum(bytes), 0) into used from public.video_uploads
   where day = today and status in ('reserved', 'done');
  if used + p_bytes > s.daily_bytes then
    raise exception 'O limite de vídeos de hoje foi atingido. Volte amanhã!';
  end if;

  key := 'v/' || uid::text || '/' || new_id::text;
  insert into public.video_uploads (id, user_id, object_key, bytes, day)
  values (new_id, uid, key, p_bytes, today);

  return query select new_id, key;
end;
$$;

-- Devolve a cota quando a pessoa desiste ou o envio falha.
create or replace function public.release_video_upload(p_upload uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.video_uploads set status = 'released'
   where id = p_upload and user_id = auth.uid() and status = 'reserved';
end;
$$;

-- Só o servidor (chave de serviço) fecha o envio, com o tamanho REAL conferido no R2.
create or replace function public.finish_video_upload(p_upload uuid, p_actual_bytes bigint)
returns void language plpgsql security definer set search_path = public as $$
declare r public.video_uploads%rowtype;
begin
  select * into r from public.video_uploads where id = p_upload for update;
  if not found or r.status <> 'reserved' then raise exception 'Envio inválido.'; end if;
  if p_actual_bytes is null or p_actual_bytes < 1 or p_actual_bytes > r.bytes then
    raise exception 'O arquivo enviado não confere com o combinado.';
  end if;
  update public.video_uploads set status = 'done', bytes = p_actual_bytes where id = p_upload;
end;
$$;

-- Painel do admin: quanto da cota de hoje já foi usado.
create or replace function public.video_usage_today()
returns table (used_bytes bigint, daily_bytes bigint, videos int, enabled boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Apenas admin.'; end if;
  return query
    select coalesce(sum(u.bytes), 0)::bigint, s.daily_bytes, count(u.id)::int, s.enabled
      from public.video_settings s
      left join public.video_uploads u on u.day = public.video_today() and u.status in ('reserved', 'done')
     where s.id
     group by s.daily_bytes, s.enabled;
end;
$$;

revoke all on function public.reserve_video_upload(bigint, numeric) from public, anon;
revoke all on function public.release_video_upload(uuid) from public, anon;
revoke all on function public.finish_video_upload(uuid, bigint) from public, anon, authenticated;
revoke all on function public.video_usage_today() from public, anon;
grant execute on function public.reserve_video_upload(bigint, numeric) to authenticated;
grant execute on function public.release_video_upload(uuid) to authenticated;
grant execute on function public.finish_video_upload(uuid, bigint) to service_role;
grant execute on function public.video_usage_today() to authenticated;
