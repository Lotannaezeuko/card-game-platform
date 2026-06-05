-- Migration: make cards.front_text optional
-- Front text is no longer required — a card may have an image-only or blank front face.
-- Drops the NOT NULL constraint if one exists (no-op if the column is already nullable)
-- and ensures a sensible default. Run this once against an existing database.
ALTER TABLE cards ALTER COLUMN front_text DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN front_text SET DEFAULT '';
