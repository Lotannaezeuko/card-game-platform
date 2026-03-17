-- =============================================================
-- reset.sql
-- Truncates all tables and restarts their sequences so that
-- seed.sql can be rerun cleanly during development.
-- Does NOT drop tables or the game_status enum type.
-- =============================================================

-- Tables are listed in reverse dependency order so that foreign
-- key constraints are never violated during truncation.
-- CASCADE is included as a safety net for any remaining references.

TRUNCATE
  session_discard_pile,
  session_draw_pile,
  player_hands,
  game_players,
  games,
  deck_cards,
  cards,
  decks,
  users
RESTART IDENTITY CASCADE;
