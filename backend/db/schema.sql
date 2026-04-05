-- Enum type for game status
CREATE TYPE game_status AS ENUM ('lobby', 'active', 'ended');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  deck_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  deck_name VARCHAR(100) NOT NULL,
  description TEXT,
  total_cards INTEGER,
  unique_cards INTEGER,
  shuffle_behaviour VARCHAR(50) DEFAULT 'shuffle_before_game',
  duplicate_handling VARCHAR(50) DEFAULT 'allow_duplicates',
  is_public BOOLEAN DEFAULT false,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  card_id SERIAL PRIMARY KEY,
  created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  card_name VARCHAR(100) NOT NULL,
  front_text TEXT,
  front_image_url VARCHAR(500),
  back_text TEXT,
  back_image_url VARCHAR(500),
  default_copies INTEGER DEFAULT 1,
  is_unique BOOLEAN DEFAULT false,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deck cards junction table
CREATE TABLE IF NOT EXISTS deck_cards (
  deck_card_id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(deck_id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards(card_id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  card_order INTEGER
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  game_id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(deck_id) ON DELETE SET NULL,
  host_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  game_code VARCHAR(10) UNIQUE,
  status game_status DEFAULT 'lobby',
  starting_hand_size INTEGER DEFAULT 5,
  turn_direction VARCHAR(20) DEFAULT 'clockwise',
  deal_method VARCHAR(50) DEFAULT 'full_hand_at_start',
  current_player_position INTEGER DEFAULT 0,
  game_state JSONB DEFAULT '{}',
  is_online BOOLEAN DEFAULT false,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- Game players junction table
CREATE TABLE IF NOT EXISTS game_players (
  game_player_id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  player_position INTEGER,
  score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player hands table
CREATE TABLE IF NOT EXISTS player_hands (
  hand_id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards(card_id) ON DELETE CASCADE,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session draw pile table
CREATE TABLE IF NOT EXISTS session_draw_pile (
  pile_id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards(card_id) ON DELETE CASCADE,
  pile_order INTEGER NOT NULL,
  is_drawn BOOLEAN DEFAULT false
);

-- Session discard pile table
CREATE TABLE IF NOT EXISTS session_discard_pile (
  discard_id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
  card_id INTEGER REFERENCES cards(card_id) ON DELETE CASCADE,
  discarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discarded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_games_host_user_id ON games(host_user_id);
CREATE INDEX IF NOT EXISTS idx_games_game_code ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_player_hands_game_id ON player_hands(game_id);
CREATE INDEX IF NOT EXISTS idx_player_hands_user_id ON player_hands(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_pile_game_id ON session_draw_pile(game_id);
CREATE INDEX IF NOT EXISTS idx_discard_pile_game_id ON session_discard_pile(game_id);