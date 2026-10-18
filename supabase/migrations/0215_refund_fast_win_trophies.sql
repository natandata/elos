-- ELOS — devolve os troféus das vitórias rápidas (< 75 s) que ficaram com 0 por causa de uma regra que não deveria existir,
-- e avisa cada jogador prejudicado num card no próximo acesso (aviso com público "targeted": só quem está em announcement_targets).

create table if not exists public.announcement_targets (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (announcement_id, user_id)
);
alter table public.announcement_targets enable row level security;
drop policy if exists announcement_targets_read on public.announcement_targets;
create policy announcement_targets_read on public.announcement_targets for select using (user_id = auth.uid() or public.is_admin());

create temp table _refund on commit drop as
  select m.user_id, count(*)::int as n, array_agg(m.id) as ids
    from public.arena_matches m
    join public.profiles p on p.id = m.user_id
   where m.status = 'finished' and m.result = 'win' and coalesce(m.training, false) = false and m.trophy_delta = 0
     and extract(epoch from (m.finished_at - m.started_at)) < 75
     and p.role <> 'admin'
   group by m.user_id;

update public.arena_matches set trophy_delta = 30 where id in (select unnest(ids) from _refund);
update public.arena_stats s
   set trophies = s.trophies + 30 * r.n,
       best = greatest(s.best, s.trophies + 30 * r.n),
       updated_at = now()
  from _refund r where s.user_id = r.user_id;

with a as (
  insert into public.announcements (title, body, active, audience)
  values ('🏆 Erro corrigido: seus troféus voltaram!',
          'Havia um erro na Arena dos Heróis: vitórias muito rápidas não davam troféu. O erro foi corrigido e os troféus das suas vitórias rápidas já foram devolvidos.' || E'\n\n' || 'Pedimos desculpa pelo problema e obrigado por avisarem! Bora subir de arena. ⚔️',
          false, 'targeted')
  returning id
)
insert into public.announcement_targets (announcement_id, user_id)
select a.id, r.user_id from a, _refund r;
