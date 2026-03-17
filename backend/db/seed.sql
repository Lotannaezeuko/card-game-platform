-- =============================================================
-- seed.sql
-- Realistic test data for card-game-platform
-- All passwords are 'password123' (bcrypt, cost 10)
-- Run reset.sql first to start from a clean state
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Users
-- ---------------------------------------------------------------
INSERT INTO users (username, email, password_hash) VALUES
  ('testuser1', 'test1@example.com', '$2b$10$GPznd9hekGqTWbPAmI3p5.Q/KnnzekUjh31dplmdFry7IRVvvr8wG'),
  ('testuser2', 'test2@example.com', '$2b$10$q1p4Qm8BGO6eK.Ooz2laV.Ze6d.VLwc/h9dBSfTxCoNOQpXAz0MO2'),
  ('adminuser', 'admin@example.com', '$2b$10$7Bxd66OjRTK2WLIXIy.x9.wndzGfV4Ya7JjkIGePLkGrH2tCmwIYe');

-- ---------------------------------------------------------------
-- 2. Cards  (all created by user 1)
-- ---------------------------------------------------------------
INSERT INTO cards (created_by_user_id, card_name, front_text, front_image_url, back_text, back_image_url, default_copies, is_unique, attributes) VALUES

  -- Standard action cards with obvious purpose names
  (1, 'Draw Two',
   'The next player draws 2 cards and loses their turn.',
   NULL,
   'A classic stacking card. Can be countered by another Draw Two.',
   NULL,
   2, false,
   '{"effect": "draw", "amount": 2, "skips_turn": true}'),

  (1, 'Skip Turn',
   'The next player in the turn order is skipped entirely.',
   NULL,
   'Cannot be played on your first turn of the game.',
   NULL,
   2, false,
   '{"effect": "skip"}'),

  (1, 'Reverse Direction',
   'Reverses the current turn direction. Clockwise becomes counterclockwise and vice versa.',
   NULL,
   NULL,
   NULL,
   2, false,
   '{"effect": "reverse"}'),

  -- A unique card — only one copy allowed per game
  (1, 'Wild Card',
   'Declare any card type. The next player must play a card of that type or draw 1.',
   NULL,
   'The most powerful card in the deck. Use wisely.',
   NULL,
   1, true,
   '{"effect": "wild", "next_draw_penalty": 1}'),

  -- High default_copies — filler/resource cards meant to appear often
  (1, 'Basic Resource',
   'Gain 1 resource token. Can be played at any time on your turn.',
   NULL,
   NULL,
   NULL,
   4, false,
   '{"effect": "resource", "amount": 1}'),

  -- A card with both front and back text and a non-trivial attribute set
  (1, 'Shield Burst',
   'Negate the next attack or Draw effect targeting you this round.',
   NULL,
   'Expires at the end of your next turn if unused.',
   NULL,
   1, true,
   '{"effect": "shield", "duration": "until_end_of_next_turn", "blocks": ["draw", "attack"]}');

-- ---------------------------------------------------------------
-- 3. Decks  (both owned by user 1)
-- ---------------------------------------------------------------
INSERT INTO decks (user_id, deck_name, description, total_cards, unique_cards, shuffle_behaviour, duplicate_handling, is_public) VALUES

  (1, 'Standard Action Deck',
   'A balanced deck of action and effect cards suitable for 2–4 players.',
   40, 2, 'shuffle_before_game', 'allow_duplicates', true),

  (1, 'Competitive Draft',
   'A tighter deck with stricter duplicate rules, built for competitive play.',
   20, 4, 'shuffle_before_game', 'no_duplicates', false);

-- ---------------------------------------------------------------
-- 4. deck_cards  (links decks to cards with quantity overrides)
-- ---------------------------------------------------------------
-- Deck 1: Standard Action Deck
--   quantity intentionally overrides default_copies for Draw Two and Basic Resource
INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES
  (1, 1, 4, 1),   -- Draw Two       × 4  (default is 2, deck uses 4)
  (1, 2, 4, 2),   -- Skip Turn      × 4  (default is 2, deck uses 4)
  (1, 3, 4, 3),   -- Reverse Dir    × 4  (default is 2, deck uses 4)
  (1, 4, 1, 4),   -- Wild Card      × 1  (is_unique, must stay at 1)
  (1, 5, 8, 5),   -- Basic Resource × 8  (default is 4, deck pads to 8)
  (1, 6, 1, 6);   -- Shield Burst   × 1  (is_unique)

-- Deck 2: Competitive Draft  (smaller set, stricter)
INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES
  (2, 1, 2, 1),   -- Draw Two       × 2  (matches default_copies)
  (2, 2, 2, 2),   -- Skip Turn      × 2
  (2, 4, 1, 3),   -- Wild Card      × 1  (is_unique)
  (2, 5, 4, 4),   -- Basic Resource × 4  (matches default_copies)
  (2, 6, 1, 5);   -- Shield Burst   × 1  (is_unique)

-- ---------------------------------------------------------------
-- 5. Game  (lobby, owned by user 1, uses deck 1)
-- ---------------------------------------------------------------
INSERT INTO games (deck_id, host_user_id, game_code, status, starting_hand_size, turn_direction, deal_method, current_player_position, game_state, is_online) VALUES
  (1, 1, 'XK92F', 'lobby', 5, 'clockwise', 'full_hand_at_start', 0, '{}', true);

-- ---------------------------------------------------------------
-- 6. game_players  (user 1 active, user 2 connected but waiting)
-- ---------------------------------------------------------------
INSERT INTO game_players (game_id, user_id, player_position, score, is_active, is_connected) VALUES
  (1, 1, 1, 0, true,  true),
  (1, 2, 2, 0, false, true);
