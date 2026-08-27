-- ELOS — o Elo tem que bater com o gênero da pessoa.
--
-- O cadastro já escolhia o Elo certo automaticamente, mas a tela de Usuários
-- deixava o admin mover alguém para um Elo do outro gênero, e trocar o gênero
-- não movia a pessoa de Elo. A regra passa a valer no banco, para qualquer
-- caminho de escrita.

-- ---------------------------------------------------------------- correção
-- Quem já está no Elo errado vai para o Elo do próprio gênero e faixa etária.
update public.profiles p
   set elo_id = public.suggest_elo(p.gender, p.age_range)
  from public.elos e
 where e.id = p.elo_id
   and p.gender is not null
   and p.gender is distinct from e.gender;

-- ---------------------------------------------------------------- regra
create or replace function public.enforce_elo_gender()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_elo_gender public.gender_t;
begin
  if new.elo_id is null or new.gender is null then
    return new;
  end if;

  select gender into v_elo_gender from public.elos where id = new.elo_id;
  if v_elo_gender is null or v_elo_gender = new.gender then
    return new;
  end if;

  -- Se foi o gênero que mudou, a pessoa muda de Elo junto: o Elo antigo
  -- simplesmente deixou de servir.
  if tg_op = 'UPDATE' and old.gender is distinct from new.gender then
    new.elo_id := public.suggest_elo(new.gender, new.age_range);
    return new;
  end if;

  -- Caso contrário alguém escolheu um Elo incompatível de propósito.
  raise exception 'Elo incompatível: % não pode entrar em um Elo %',
    coalesce(nullif(new.full_name, ''), 'a pessoa'),
    case v_elo_gender when 'male' then 'masculino' else 'feminino' end;
end $fn$;

revoke execute on function public.enforce_elo_gender() from anon, authenticated, public;

-- roda depois do guard, do autofill e da composição do nome
drop trigger if exists trg_d_elo_gender on public.profiles;
create trigger trg_d_elo_gender
  before insert or update on public.profiles
  for each row execute function public.enforce_elo_gender();
