-- Novas faixas etárias dos Elos: 12-13, 14-15, 16-17 (masculino e feminino),
-- substituindo 12-14 / 15-16 / 17. Sem data de nascimento cadastrada, não dá
-- pra remapear a idade real de quem já estava em cada faixa antiga — por
-- decisão do admin, os crias saem do Elo (elo_id e age_range viram null) e
-- são reatribuídos manualmente na tela de Usuários/Elos.

-- 1) reaproveita os 6 elos existentes, só troca nome e faixa
update public.elos set name = 'Elo Masculino 12–13', age_range = '12-13' where gender = 'male'   and age_range = '12-14';
update public.elos set name = 'Elo Masculino 14–15', age_range = '14-15' where gender = 'male'   and age_range = '15-16';
update public.elos set name = 'Elo Masculino 16–17', age_range = '16-17' where gender = 'male'   and age_range = '17';
update public.elos set name = 'Elo Feminino 12–13',  age_range = '12-13' where gender = 'female' and age_range = '12-14';
update public.elos set name = 'Elo Feminino 14–15',  age_range = '14-15' where gender = 'female' and age_range = '15-16';
update public.elos set name = 'Elo Feminino 16–17',  age_range = '16-17' where gender = 'female' and age_range = '17';

-- 2) tira os crias do Elo e limpa a faixa etária (o líder segue no dele —
-- só a faixa etária dos crias muda de categoria, o vínculo do líder com seu
-- Elo/gênero não depende de age_range de cria nenhum)
update public.profiles set elo_id = null, age_range = null where role = 'cria';
