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
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  card_id SERIAL PRIMARY KEY,
  created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  card_name VARCHAR(100) NOT NULL,
  card_type VARCHAR(50),
  content TEXT,
  image_url VARCHAR(500),
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

-- Game rules table
CREATE TABLE IF NOT EXISTS game_rules (
  rule_id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(deck_id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50),
  rule_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  game_id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(deck_id) ON DELETE SET NULL,
  host_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
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
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_games_host_user_id ON games(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
