-- Migration 001: Add user_decks library table
-- Run this against an existing database that was created before this table existed.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).

CREATE TABLE IF NOT EXISTS user_decks (
  user_deck_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  deck_id INTEGER REFERENCES decks(deck_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_user_decks_user_id ON user_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decks_deck_id ON user_decks(deck_id);
