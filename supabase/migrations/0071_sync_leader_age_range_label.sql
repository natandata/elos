-- Cosmético: o age_range do líder só aparece na UI, não é usado pra roteamento
-- (o vínculo real é elo_id) — mas com o rótulo antigo ficaria mostrando uma
-- faixa que não existe mais. Sincroniza com a faixa do Elo que ele já lidera.
update public.profiles p
   set age_range = e.age_range
  from public.elos e
 where p.elo_id = e.id
   and p.role = 'leader';
