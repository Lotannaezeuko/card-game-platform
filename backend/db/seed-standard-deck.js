/**
 * seed-standard-deck.js
 *
 * Additive seed script — safe to run multiple times.
 * Creates a standard 52-card playing card deck under the seed user (is_public: true).
 * Skips entirely if the deck already exists for the seed user.
 *
 * Usage:
 *   node backend/db/seed-standard-deck.js
 *   npm run seed:standard-deck   (from the backend directory)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const db = require('./index');

const SALT_ROUNDS = 10;

// ─── Seed user (same as seed-decks.js) ───────────────────────────────────────

const SEED_USER = {
  email: 'seed@cardplatform.com',
  username: 'SeedUser',
  password: 'SeedPass123!',
};

// ─── Card definitions ─────────────────────────────────────────────────────────

const SUITS = [
  { code: 'S', name: 'Spades',   symbol: '♠' },
  { code: 'H', name: 'Hearts',   symbol: '♥' },
  { code: 'D', name: 'Diamonds', symbol: '♦' },
  { code: 'C', name: 'Clubs',    symbol: '♣' },
];

const VALUES = [
  { code: 'A', name: 'Ace',   label: 'A'  },
  { code: '2', name: 'Two',   label: '2'  },
  { code: '3', name: 'Three', label: '3'  },
  { code: '4', name: 'Four',  label: '4'  },
  { code: '5', name: 'Five',  label: '5'  },
  { code: '6', name: 'Six',   label: '6'  },
  { code: '7', name: 'Seven', label: '7'  },
  { code: '8', name: 'Eight', label: '8'  },
  { code: '9', name: 'Nine',  label: '9'  },
  { code: '0', name: 'Ten',   label: '10' },
  { code: 'J', name: 'Jack',  label: 'J'  },
  { code: 'Q', name: 'Queen', label: 'Q'  },
  { code: 'K', name: 'King',  label: 'K'  },
];

const BACK_IMAGE_URL = 'https://deckofcardsapi.com/static/img/back.png';

const playingCards = [];

for (const value of VALUES) {
  for (const suit of SUITS) {
    const imageCode = value.code + suit.code;
    playingCards.push({
      card_name: `${value.name} of ${suit.name}`,
      front_text: `${value.label}${suit.symbol}`,
      front_image_url: `https://deckofcardsapi.com/static/img/${imageCode}.png`,
      back_text: null,
      back_image_url: BACK_IMAGE_URL,
      default_copies: 1,
      is_unique: true,
      attributes: { suit: suit.name, value: value.label },
    });
  }
}

// ─── Deck definition ──────────────────────────────────────────────────────────

const DECK_META = {
  deck_name: 'Standard Playing Cards',
  description: 'A standard 52-card deck. Use this as the basis for any classic card game.',
  shuffle_behaviour: 'shuffle_before_game',
  duplicate_handling: 'no_duplicates',
  total_cards: 52,
  unique_cards: 52,
  is_public: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrCreateUser() {
  const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [SEED_USER.email]);

  if (existing.rows.length > 0) {
    const userId = existing.rows[0].user_id;
    console.log(`  Seed user already exists (user_id=${userId})`);
    return userId;
  }

  const hash = await bcrypt.hash(SEED_USER.password, SALT_ROUNDS);
  const result = await db.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
    [SEED_USER.username, SEED_USER.email, hash]
  );
  const userId = result.rows[0].user_id;
  console.log(`  Created seed user (user_id=${userId})`);
  return userId;
}

async function findOrCreateCard(userId, card) {
  const existing = await db.query(
    'SELECT card_id FROM cards WHERE card_name = $1 AND created_by_user_id = $2',
    [card.card_name, userId]
  );

  if (existing.rows.length > 0) {
    return { cardId: existing.rows[0].card_id, created: false };
  }

  const result = await db.query(
    `INSERT INTO cards
       (created_by_user_id, card_name, front_text, front_image_url,
        back_text, back_image_url, default_copies, is_unique, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING card_id`,
    [
      userId,
      card.card_name,
      card.front_text,
      card.front_image_url,
      card.back_text,
      card.back_image_url,
      card.default_copies,
      card.is_unique,
      JSON.stringify(card.attributes),
    ]
  );
  return { cardId: result.rows[0].card_id, created: true };
}

async function seedStandardDeck(userId) {
  const deckLabel = `"${DECK_META.deck_name}"`;

  // Safety check — find existing deck or create it
  const existingDeck = await db.query(
    'SELECT deck_id FROM decks WHERE deck_name = $1 AND user_id = $2',
    [DECK_META.deck_name, userId]
  );

  let deckId;

  if (existingDeck.rows.length > 0) {
    deckId = existingDeck.rows[0].deck_id;
    console.log(`  Deck ${deckLabel} already exists (deck_id=${deckId}) — skipping card creation`);
  } else {
    // Find or create all 52 cards
    let cardsCreated = 0;
    let cardsReused = 0;
    const cardEntries = [];

    for (const cardDef of playingCards) {
      const { cardId, created } = await findOrCreateCard(userId, cardDef);
      if (created) cardsCreated++;
      else cardsReused++;
      cardEntries.push({ cardId, quantity: 1 });
    }

    // Create the deck
    const deckResult = await db.query(
      `INSERT INTO decks
         (user_id, deck_name, description, shuffle_behaviour, duplicate_handling,
          total_cards, unique_cards, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING deck_id`,
      [
        userId,
        DECK_META.deck_name,
        DECK_META.description,
        DECK_META.shuffle_behaviour,
        DECK_META.duplicate_handling,
        DECK_META.total_cards,
        DECK_META.unique_cards,
        DECK_META.is_public,
      ]
    );
    deckId = deckResult.rows[0].deck_id;

    // Link all 52 cards to the deck
    for (let i = 0; i < cardEntries.length; i++) {
      const { cardId, quantity } = cardEntries[i];
      await db.query(
        'INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)',
        [deckId, cardId, quantity, i + 1]
      );
    }

    console.log(`  Created deck ${deckLabel} (deck_id=${deckId})`);
    console.log(`    ${cardsCreated} cards created, ${cardsReused} reused`);
    console.log(`    ${cardEntries.length} deck_cards entries`);

    // Confirm final card count
    const countResult = await db.query(
      'SELECT COUNT(*) AS count FROM deck_cards WHERE deck_id = $1',
      [deckId]
    );
    console.log(`    Confirmed ${countResult.rows[0].count} cards in deck`);
  }

  // Backfill — assign deck and copy cards to all existing users who don't already have it
  // The seed user owns the deck so they don't need a user_decks row or card copies
  const allUsers = await db.query(
    'SELECT user_id FROM users WHERE user_id != $1',
    [userId]
  );

  let assigned = 0;
  let cardsCopied = 0;
  for (const row of allUsers.rows) {
    const insertResult = await db.query(
      'INSERT INTO user_decks (user_id, deck_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_deck_id',
      [row.user_id, deckId]
    );
    if (insertResult.rows.length > 0) assigned++;

    // Copy the 52 cards into this user's personal card library if they don't have them yet
    const alreadyHasCards = await db.query(
      `SELECT 1 FROM cards c
       JOIN deck_cards dc ON dc.card_id = c.card_id
       WHERE dc.deck_id = $1 AND c.created_by_user_id = $2
       LIMIT 1`,
      [deckId, row.user_id]
    );

    if (alreadyHasCards.rows.length === 0) {
      await db.query(
        `INSERT INTO cards
           (created_by_user_id, card_name, front_text, front_image_url,
            back_text, back_image_url, default_copies, is_unique, attributes)
         SELECT $1, c.card_name, c.front_text, c.front_image_url,
                c.back_text, c.back_image_url, c.default_copies, c.is_unique, c.attributes
         FROM deck_cards dc
         JOIN cards c ON c.card_id = dc.card_id
         WHERE dc.deck_id = $2`,
        [row.user_id, deckId]
      );
      cardsCopied++;
    }
  }

  console.log(`  Assigned to ${assigned} existing user(s) (${allUsers.rows.length - assigned} already had it)`);
  console.log(`  Copied 52 cards to ${cardsCopied} user(s)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Running standard deck seed…\n');

  try {
    console.log('User:');
    const userId = await findOrCreateUser();

    console.log('\nDeck:');
    await seedStandardDeck(userId);

    console.log('\nDone.\n');
    process.exit(0);
  } catch (err) {
    console.error('\nSeed error:', err);
    process.exit(1);
  }
}

main();
