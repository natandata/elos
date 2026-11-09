-- Acampadentro: comprovante de pagamento da inscricao (Pix) + aprovacao pelo admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment_proofs', 'payment_proofs', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy payment_proofs_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'payment_proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy payment_proofs_select on storage.objects for select to authenticated
  using (bucket_id = 'payment_proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create table public.acampadentro_payment (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.acampadentro_payment enable row level security;
create policy acampadentro_payment_own on public.acampadentro_payment for select to authenticated using (user_id = auth.uid());
create policy acampadentro_payment_admin on public.acampadentro_payment for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.acampadentro_pay_me() returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'status', (select p.status from acampadentro_payment p where p.user_id = auth.uid()),
    'note', (select p.note from acampadentro_payment p where p.user_id = auth.uid()),
    'file_name', (select p.file_name from acampadentro_payment p where p.user_id = auth.uid()),
    'rsvp', (select a.status from acampadentro_rsvp a where a.user_id = auth.uid()),
    'applies', coalesce((select pr.role in ('cria','leader') from profiles pr where pr.id = auth.uid()), false))
$$;

create or replace function public.acampadentro_pay_submit(p_path text, p_name text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then return false; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role in ('cria','leader')) then return false; end if;
  if not exists (select 1 from acampadentro_rsvp where user_id = auth.uid() and status = 'yes') then return false; end if;
  if exists (select 1 from acampadentro_payment where user_id = auth.uid() and status = 'approved') then return false; end if;
  insert into acampadentro_payment (user_id, file_path, file_name, status, note, uploaded_at, reviewed_at)
  values (auth.uid(), p_path, left(coalesce(p_name,''), 200), 'pending', null, now(), null)
  on conflict (user_id) do update set file_path = excluded.file_path, file_name = excluded.file_name, status = 'pending', note = null, uploaded_at = now(), reviewed_at = null;
  return true;
end $$;

create or replace function public.acampadentro_pay_review(p_user uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then return; end if;
  update acampadentro_payment set status = case when p_approve then 'approved' else 'rejected' end,
    note = case when p_approve then null else nullif(left(coalesce(p_note,''), 300), '') end, reviewed_at = now()
  where user_id = p_user;
end $$;

grant execute on function public.acampadentro_pay_me() to authenticated;
grant execute on function public.acampadentro_pay_submit(text, text) to authenticated;
grant execute on function public.acampadentro_pay_review(uuid, boolean, text) to authenticated;
