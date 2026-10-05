-- Dificuldade escolhida por partida (quiz, versículo, quem sou eu, ordem).
-- NULL = o jogador ainda não escolheu; a escolha fica travada depois que a
-- partida é criada. Partidas anteriores a esta migração viram 'legacy'
-- (regras do Médio + sorteio antigo) pra não trocar o jogo do dia no meio.
alter table public.game_plays
  add column if not exists difficulty text
  check (difficulty in ('facil', 'medio', 'dificil', 'legacy'));

update public.game_plays
   set difficulty = case when game in ('quiz', 'verse', 'who', 'order') then 'legacy' else 'medio' end
 where difficulty is null;
