-- ELOS — corrige regressão: a migration 0023 reescreveu handle_new_user() e
-- esqueceu de manter role/approved/first_name/last_name (que vinham da
-- migration 0013). Desde então, todo cadastro (inclusive líder!) entrava
-- como 'cria' aprovado e sem nome/sobrenome separados — só full_name.
--
-- Esta versão junta a lógica de 0013 (role/approved a partir do metadata,
-- split de nome) com a de 0023 (guardian_ack_at).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  g public.gender_t;
  a public.age_range_t;
  ack boolean;
  v_first text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  v_last  text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  v_full  text := coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name', '');
  v_role     public.user_role := 'cria';
  v_approved boolean := true;
begin
  begin g := (new.raw_user_meta_data->>'gender')::public.gender_t;
  exception when others then g := null; end;
  begin a := (new.raw_user_meta_data->>'age_range')::public.age_range_t;
  exception when others then a := null; end;
  ack := coalesce(new.raw_user_meta_data->>'guardian_ack', 'false') = 'true';

  if new.raw_user_meta_data->>'role' = 'leader' then
    v_role := 'leader';
    v_approved := false;
  end if;

  if v_first is null and v_full <> '' then
    v_first := split_part(v_full, ' ', 1);
    v_last  := case
                 when position(' ' in trim(v_full)) > 0
                   then nullif(trim(substring(v_full from position(' ' in v_full) + 1)), '')
               end;
  end if;

  insert into public.profiles
    (id, first_name, last_name, full_name, gender, age_range, role, approved, guardian_ack_at)
  values (
    new.id, v_first, v_last, v_full, g, a, v_role, v_approved,
    case when ack then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

-- ---------------------------------------------------------------- reparo
-- Perfis criados enquanto a versão quebrada esteve no ar (só full_name, sem
-- first_name/last_name) — reaplica o mesmo split que o cadastro deveria ter
-- feito. Não mexe em quem já tinha first_name preenchido por outro caminho.
update public.profiles
   set first_name = split_part(full_name, ' ', 1),
       last_name  = case
                      when position(' ' in trim(full_name)) > 0
                        then nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
                    end
 where first_name is null
   and full_name is not null
   and full_name <> '';
