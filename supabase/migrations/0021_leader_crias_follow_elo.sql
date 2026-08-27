-- ELOS — a responsabilidade do líder é sempre "os crias do Elo em que ele
-- está agora", nunca uma lista fixa que sobrevive a uma troca de Elo/gênero.
--
-- A migration anterior (0020) já criava o vínculo automaticamente quando um
-- cria ou líder ENTRAVA num Elo, mas não limpava o vínculo antigo quando
-- alguém SAÍA do Elo (trocou gênero/idade, foi movido pelo admin, etc.) — daí
-- um líder trocado de Elo continuava com os crias do Elo anterior.
--
-- Aqui: sempre que o Elo de um líder ou cria muda (ou ele deixa de ser líder/
-- cria, ou um líder perde a aprovação), os vínculos leader_crias antigos
-- desse lado são apagados. Os triggers de 0020 (que rodam depois, no AFTER
-- INSERT OR UPDATE) recriam os vínculos certos para o novo Elo.

create or replace function public.sync_leader_crias_on_change()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  -- saiu da liderança daquele Elo: mudou de Elo, perdeu aprovação, ou não é mais líder
  if old.role = 'leader' and (
       new.role is distinct from 'leader'
       or new.elo_id is distinct from old.elo_id
       or new.approved = false
     ) then
    delete from public.leader_crias where leader_id = old.id;
  end if;

  -- deixou de ser cria daquele Elo: mudou de Elo, ou não é mais cria
  if old.role = 'cria' and (
       new.role is distinct from 'cria'
       or new.elo_id is distinct from old.elo_id
     ) then
    delete from public.leader_crias where cria_id = old.id;
  end if;

  return new;
end $fn$;

drop trigger if exists trg_bb_sync_leader_crias on public.profiles;
create trigger trg_bb_sync_leader_crias
  before update on public.profiles
  for each row execute function public.sync_leader_crias_on_change();

-- corrige agora quem já estava com vínculo errado (ex.: o líder testado que
-- trocou de gênero e ficou com os crias do Elo antigo)
delete from public.leader_crias lc
 using public.profiles l
 where l.id = lc.leader_id
   and l.role = 'leader'
   and exists (
     select 1 from public.profiles c
      where c.id = lc.cria_id
        and c.elo_id is distinct from l.elo_id
   );
