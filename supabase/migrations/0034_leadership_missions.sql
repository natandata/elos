-- ELOS — "Missões da Liderança": admin cria missões atribuídas direto a
-- líderes (não a crias). Reaproveita missions/mission_assignments como já
-- são (a coluna cria_id é só "profile atribuído", já funciona pra qualquer
-- role) — só precisa de uma coluna pra distinguir a audiência na UI e no
-- filtro das telas.
alter table public.missions
  add column if not exists audience text not null default 'crias'
    check (audience in ('crias', 'leaders'));

create index if not exists missions_audience_idx on public.missions(audience);
