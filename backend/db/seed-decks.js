/**
 * seed-decks.js
 *
 * Additive seed script — safe to run multiple times.
 * Each deck is skipped if it already exists for the seed user.
 * Each card is found-or-created so existing card data is never duplicated.
 *
 * Usage:
 *   node backend/db/seed-decks.js
 *   npm run seed:decks   (from the backend directory)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const db = require('./index');

const SALT_ROUNDS = 10;

// ─── Seed user ────────────────────────────────────────────────────────────────

const SEED_USER = {
  email: 'seed@cardplatform.com',
  username: 'SeedUser',
  password: 'SeedPass123!',
};

// ─── Uno card definitions ─────────────────────────────────────────────────────

const COLOURS = ['Red', 'Yellow', 'Green', 'Blue'];

const NUMBER_BACK =
  'Match by colour or number. Play this card if it matches the colour or number of the top discard.';

const unoCards = [];

// 0 cards — one per colour (default_copies = 1)
for (const colour of COLOURS) {
  unoCards.push({
    card_name: `${colour} 0`,
    front_text: '0',
    back_text: NUMBER_BACK,
    default_copies: 1,
    is_unique: false,
    attributes: {},
  });
}

// 1–9 cards — two per colour (default_copies = 2)
for (const colour of COLOURS) {
  for (let n = 1; n <= 9; n++) {
    unoCards.push({
      card_name: `${colour} ${n}`,
      front_text: String(n),
      back_text: NUMBER_BACK,
      default_copies: 2,
      is_unique: false,
      attributes: {},
    });
  }
}

// Action cards — two per colour (default_copies = 2)
const ACTION_TYPES = [
  {
    name: 'Skip',
    front_text: 'Skip',
    back_text: 'The next player loses their turn.',
  },
  {
    name: 'Reverse',
    front_text: 'Reverse',
    back_text: 'Reverse the direction of play.',
  },
  {
    name: 'Draw Two',
    front_text: 'Draw Two',
    back_text: 'The next player draws two cards and loses their turn.',
  },
];

for (const colour of COLOURS) {
  for (const action of ACTION_TYPES) {
    unoCards.push({
      card_name: `${colour} ${action.name}`,
      front_text: action.front_text,
      back_text: action.back_text,
      default_copies: 2,
      is_unique: false,
      attributes: {},
    });
  }
}

// Wild cards
unoCards.push({
  card_name: 'Wild',
  front_text: 'Wild',
  back_text: 'Choose any colour to continue play.',
  default_copies: 4,
  is_unique: false,
  attributes: { effect: 'change_colour' },
});

unoCards.push({
  card_name: 'Wild Draw Four',
  front_text: 'Wild Draw Four',
  back_text:
    'Choose a colour. The next player draws four cards and loses their turn. Only play if you have no matching colour.',
  default_copies: 4,
  is_unique: false,
  attributes: { effect: 'change_colour', draw: 4 },
});

// ─── Deck definitions ─────────────────────────────────────────────────────────

const DECKS = [
  {
    meta: {
      deck_name: 'Uno',
      description:
        'The classic colour and number card game. Match cards by colour or number and be the first to empty your hand.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'allow_duplicates',
      total_cards: 108,
      unique_cards: 25,
      is_public: true,
    },
    cards: unoCards,
  },
  // ─── Deck 2: Charades ───────────────────────────────────────────────────────
  {
    meta: {
      deck_name: 'Charades',
      description: 'Act it out without speaking. Draw a card and act out what is on it.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'no_duplicates',
      total_cards: 40,
      unique_cards: 40,
      is_public: true,
    },
    cards: [
      'Riding a bicycle',
      'Brushing teeth',
      'Swimming underwater',
      'Walking a dog',
      'Baking a cake',
      'Playing guitar',
      'Climbing a tree',
      'Sneezing repeatedly',
      'Taking a selfie',
      'Wrapping a present',
      'Rowing a boat',
      'Building a sandcastle',
      'Ironing clothes',
      'Catching a butterfly',
      'Playing tennis',
      'Falling asleep standing up',
      'Opening a jar',
      'Flying a kite',
      'Eating spaghetti',
      'Riding a rollercoaster',
      'Typing very fast',
      'Skipping rope',
      'Putting on sunscreen',
      'Shaking hands',
      'Reading a map',
      'Pushing a shopping trolley',
      'Balancing a book on your head',
      'Driving in traffic',
      'Pouring tea',
      'Surfing a wave',
      'Putting up a tent',
      'Feeding a baby',
      'Doing yoga',
      'Parallel parking',
      'Playing chess',
      'Knitting',
      'Walking in high heels',
      'Blowing out birthday candles',
      'Painting a wall',
      'Doing the robot dance',
    ].map((prompt) => ({
      card_name: prompt,
      front_text: prompt,
      back_text:
        'Act this out without speaking, making sounds, or mouthing words. Your team has 60 seconds to guess.',
      default_copies: 1,
      is_unique: true,
      attributes: {},
    })),
  },

  // ─── Deck 3: World Capitals Flashcards ──────────────────────────────────────
  {
    meta: {
      deck_name: 'World Capitals Flashcards',
      description:
        'Test your geography knowledge. The front shows the country, flip to see the capital city on the back.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'no_duplicates',
      total_cards: 30,
      unique_cards: 30,
      is_public: true,
    },
    cards: [
      ['France', 'Paris'],
      ['Germany', 'Berlin'],
      ['Japan', 'Tokyo'],
      ['Brazil', 'Brasília'],
      ['Australia', 'Canberra'],
      ['Canada', 'Ottawa'],
      ['Egypt', 'Cairo'],
      ['India', 'New Delhi'],
      ['Argentina', 'Buenos Aires'],
      ['South Africa', 'Pretoria'],
      ['Mexico', 'Mexico City'],
      ['China', 'Beijing'],
      ['Russia', 'Moscow'],
      ['Italy', 'Rome'],
      ['Spain', 'Madrid'],
      ['Nigeria', 'Abuja'],
      ['South Korea', 'Seoul'],
      ['Turkey', 'Ankara'],
      ['Saudi Arabia', 'Riyadh'],
      ['Netherlands', 'Amsterdam'],
      ['Sweden', 'Stockholm'],
      ['Norway', 'Oslo'],
      ['Poland', 'Warsaw'],
      ['Portugal', 'Lisbon'],
      ['Greece', 'Athens'],
      ['Pakistan', 'Islamabad'],
      ['Indonesia', 'Jakarta'],
      ['Thailand', 'Bangkok'],
      ['Kenya', 'Nairobi'],
      ['Colombia', 'Bogotá'],
    ].map(([country, capital]) => ({
      card_name: `Capital of ${country}`,
      front_text: `What is the capital of ${country}?`,
      back_text: capital,
      default_copies: 1,
      is_unique: true,
      attributes: {},
    })),
  },
];

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
       (created_by_user_id, card_name, front_text, back_text, default_copies, is_unique, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING card_id`,
    [
      userId,
      card.card_name,
      card.front_text,
      card.back_text,
      card.default_copies,
      card.is_unique,
      JSON.stringify(card.attributes),
    ]
  );
  return { cardId: result.rows[0].card_id, created: true };
}

async function seedDeck(userId, deckMeta, cardDefs) {
  const deckLabel = `"${deckMeta.deck_name}"`;

  const existingDeck = await db.query(
    'SELECT deck_id FROM decks WHERE deck_name = $1 AND user_id = $2',
    [deckMeta.deck_name, userId]
  );

  if (existingDeck.rows.length > 0) {
    console.log(`  Deck ${deckLabel} already exists — skipping`);
    return;
  }

  // Find or create all cards
  let cardsCreated = 0;
  let cardsReused = 0;
  const cardEntries = [];

  for (const cardDef of cardDefs) {
    const { cardId, created } = await findOrCreateCard(userId, cardDef);
    if (created) cardsCreated++;
    else cardsReused++;
    cardEntries.push({ cardId, quantity: cardDef.default_copies });
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
      deckMeta.deck_name,
      deckMeta.description,
      deckMeta.shuffle_behaviour,
      deckMeta.duplicate_handling,
      deckMeta.total_cards,
      deckMeta.unique_cards,
      deckMeta.is_public,
    ]
  );
  const deckId = deckResult.rows[0].deck_id;

  // Link cards to deck
  for (let i = 0; i < cardEntries.length; i++) {
    const { cardId, quantity } = cardEntries[i];
    await db.query(
      'INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)',
      [deckId, cardId, quantity, i + 1]
    );
  }

  console.log(`  Created deck ${deckLabel} (deck_id=${deckId})`);
  console.log(
    `    ${cardEntries.length} card types — ${cardsCreated} created, ${cardsReused} reused`
  );
  console.log(`    ${cardEntries.length} deck_cards entries`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Running deck seed…\n');

  try {
    console.log('User:');
    const userId = await findOrCreateUser();

    console.log('\nDecks:');
    for (const { meta, cards } of DECKS) {
      await seedDeck(userId, meta, cards);
    }

    console.log('\nDone.\n');
    console.log('Seed account:');
    console.log('─'.repeat(40));
    console.log(`  Email:    ${SEED_USER.email}`);
    console.log(`  Username: ${SEED_USER.username}`);
    console.log(`  Password: ${SEED_USER.password}`);
    console.log('─'.repeat(40));

    process.exit(0);
  } catch (err) {
    console.error('\nSeed error:', err);
    process.exit(1);
  }
}

main();
