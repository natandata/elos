-- Loja: a data de abertura do item segue a data de acesso do jogo (game_settings.open_at); sincroniza o que o admin já tinha ajustado.
update public.store_items si set release_at = gs.open_at from public.game_settings gs where gs.game = si.game_key and gs.open_at is not null and si.status = 'scheduled';
