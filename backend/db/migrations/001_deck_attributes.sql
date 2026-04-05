-- Migration: add attributes JSONB column to decks table
-- Run this once against an existing database.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';
