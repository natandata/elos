-- Sequência de devocional de qualquer pessoa (para o perfil do Elogram).
-- Conta como "viva" se o último devocional foi hoje ou ontem (fuso de São Paulo); senão zera na tela.
create or replace function public.elogram_devotional_streak(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.devotional_streak_date >= ((now() at time zone 'America/Sao_Paulo')::date - 1)
      then coalesce(p.devotional_streak, 0)
    else 0
  end
  from public.profiles p
  where p.id = p_user and p.role <> 'admin'
$$;

revoke execute on function public.elogram_devotional_streak(uuid) from anon, public;
grant execute on function public.elogram_devotional_streak(uuid) to authenticated;
