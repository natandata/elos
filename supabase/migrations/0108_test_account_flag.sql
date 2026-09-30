-- ELOS — marca uma conta como "de teste": ações feitas por ela nunca geram
-- push pra gente de verdade (só pra outras contas de teste, se houver).
-- Sem isso, testar uma funcionalidade nova na plataforma (postar no
-- Explorar, criar evento, lançar desafio de Elo etc.) manda notificação de
-- verdade pra usuários reais — exatamente o que estava incomodando.

alter table public.profiles add column if not exists is_test_account boolean not null default false;

-- Mesmo nível de proteção de role/elo_id/approved: só admin marca/desmarca
-- (nunca via update direto do próprio dono) — sem isso, um cria/líder
-- poderia se marcar como "teste" sozinho e silenciar, sem querer ou de
-- propósito, um push importante disparado por uma ação dele (ex.: pedido de
-- ajuda pro líder).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role     := old.role;
    new.elo_id   := old.elo_id;
    new.approved := old.approved;
    new.is_test_account := old.is_test_account;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
      new.status_streak := old.status_streak;
      new.status_streak_date := old.status_streak_date;
      new.last_login_bonus_on := old.last_login_bonus_on;
      new.devotional_streak := old.devotional_streak;
      new.devotional_streak_date := old.devotional_streak_date;
      new.feed_streak := old.feed_streak;
      new.feed_streak_date := old.feed_streak_date;
    end if;
  end if;
  return new;
end;
$fn$;
