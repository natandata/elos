-- Cada arena da campanha precisa ser vencida 3 vezes (normal, +15%, +25%).
alter table public.arena_campaign_progress add column if not exists tiers int not null default 1 check (tiers between 1 and 3);
update public.arena_campaign_progress set tiers = 3 where tiers < 3 and xp_awarded > 0;
alter table public.arena_campaign_matches add column if not exists tier int not null default 0 check (tier between 0 and 2);
