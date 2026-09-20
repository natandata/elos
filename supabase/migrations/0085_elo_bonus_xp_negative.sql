-- Permite XP bônus negativo pro Elo — "diminuir" XP do Elo é só um bônus
-- negativo: como o total já é sempre (soma dos crias + bonus_xp), permitir
-- valor negativo aqui já desconta do total automaticamente, sem precisar de
-- lógica nova em elo_rankings() nem nas telas que somam esse total.
alter table public.elos drop constraint if exists elos_bonus_xp_check;
