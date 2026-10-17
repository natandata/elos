-- ELOS — quem zerar a campanha da Arena (as 8 arenas com as 3 vitórias) libera as 8 cartas dos líderes
-- para usar nas batalhas e nos duelos. A posse é uma linha em arena_card_levels (mesmo mecanismo dos heróis de baú).

create or replace function public.grant_campaign_cards(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare v_done int;
begin
  select count(distinct stage) into v_done from public.arena_campaign_progress where user_id = p_user and tiers >= 3 and stage between 0 and 7;
  if v_done < 8 then return false; end if;
  insert into public.arena_card_levels (user_id, card, level, copies)
  select p_user, c, 1, 1 from unnest(array['amandinha','mbappe','nery','henrique','tiaaline','marcelinho','natanrebeca','zepa']) as c
  on conflict (user_id, card) do update set copies = greatest(public.arena_card_levels.copies, 1);
  return true;
end $fn$;
revoke execute on function public.grant_campaign_cards(uuid) from anon, authenticated, public;

create or replace function public.trg_grant_campaign_cards()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.tiers >= 3 then perform public.grant_campaign_cards(new.user_id); end if;
  return new;
end $fn$;
drop trigger if exists grant_campaign_cards_trg on public.arena_campaign_progress;
create trigger grant_campaign_cards_trg after insert or update of tiers on public.arena_campaign_progress
  for each row execute function public.trg_grant_campaign_cards();

-- quem já zerou a campanha
select public.grant_campaign_cards(u.user_id)
  from (select distinct user_id from public.arena_campaign_progress where tiers >= 3) u;

-- aviso em card (uma vez), só para quem zerou a campanha; vale também para quem zerar depois
alter table public.announcements add column if not exists audience text;
insert into public.announcements (title, body, active, audience)
values ('🏅 As cartas dos líderes são suas!',
        'Você zerou a campanha da Arena dos Heróis, então as cartas dos líderes (Amandinha, Mbappé, Nery, Henrique, Tia Aline, Marcelinho, Natan e Rebeca e Pastor Zepa) estão disponíveis para você usar nas batalhas e nos duelos do Arena de Heróis.' || E'\n\n' ||
        'É só abrir o seu baralho na Arena e escolher as cartas da seção "Cartas da campanha". Bora montar um baralho de líderes! ⚔️',
        false, 'campaign_done'); -- ativado depois que o filtro por público estiver no ar
