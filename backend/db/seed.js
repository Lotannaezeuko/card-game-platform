/**
 * seed.js — unified seed script
 *
 * Resets the database and seeds everything in one pass:
 *   1. Test users + their sample cards/decks
 *   2. Seed (system) user
 *   3. Standard 52-card playing deck  → assigned + copied to every user
 *   4. Uno deck
 *   5. Charades deck
 *   6. Animal Charades deck           → assigned + copied to every user
 *   7. World Capitals Flashcards deck
 *
 * Usage:
 *   node backend/db/seed.js
 *   npm run seed   (from the backend directory)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const db = require('./index');

const SALT_ROUNDS = 10;

// ─── Test users ───────────────────────────────────────────────────────────────

const TEST_USERS = [
  { username: 'testuser1', email: 'test1@example.com', password: 'password123' },
  { username: 'testuser2', email: 'test2@example.com', password: 'password123' },
  { username: 'admin',     email: 'admin@example.com', password: 'adminpass123' },
];

// ─── Seed (system) user ───────────────────────────────────────────────────────

const SEED_USER = {
  email: 'seed@cardplatform.com',
  username: 'SeedUser',
  password: 'SeedPass123!',
};

// ─── Standard 52-card deck ────────────────────────────────────────────────────

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

const standardCards = [];
for (const value of VALUES) {
  for (const suit of SUITS) {
    const imageCode = value.code + suit.code;
    standardCards.push({
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

// ─── Uno deck ─────────────────────────────────────────────────────────────────

const COLOURS = ['Red', 'Yellow', 'Green', 'Blue'];
const NUMBER_BACK = 'Match by colour or number. Play this card if it matches the colour or number of the top discard.';

const unoCards = [];

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

const ACTION_TYPES = [
  { name: 'Skip',     front_text: 'Skip',     back_text: 'The next player loses their turn.' },
  { name: 'Reverse',  front_text: 'Reverse',  back_text: 'Reverse the direction of play.' },
  { name: 'Draw Two', front_text: 'Draw Two', back_text: 'The next player draws two cards and loses their turn.' },
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
  back_text: 'Choose a colour. The next player draws four cards and loses their turn. Only play if you have no matching colour.',
  default_copies: 4,
  is_unique: false,
  attributes: { effect: 'change_colour', draw: 4 },
});

// ─── Deck definitions ─────────────────────────────────────────────────────────
// assignToAll: true  →  deck is assigned + cards copied to every user on seed

const DECKS = [
  {
    meta: {
      deck_name: 'Standard Playing Cards',
      description: 'A standard 52-card deck. Use this as the basis for any classic card game.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'no_duplicates',
      total_cards: 52,
      unique_cards: 52,
      is_public: true,
    },
    assignToAll: true,
    cards: standardCards,
  },
  {
    meta: {
      deck_name: 'Uno',
      description: 'The classic colour and number card game. Match cards by colour or number and be the first to empty your hand.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'allow_duplicates',
      total_cards: 108,
      unique_cards: 25,
      is_public: true,
    },
    cards: unoCards,
  },
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
      'Riding a bicycle', 'Brushing teeth', 'Swimming underwater', 'Walking a dog',
      'Baking a cake', 'Playing guitar', 'Climbing a tree', 'Sneezing repeatedly',
      'Taking a selfie', 'Wrapping a present', 'Rowing a boat', 'Building a sandcastle',
      'Ironing clothes', 'Catching a butterfly', 'Playing tennis', 'Falling asleep standing up',
      'Opening a jar', 'Flying a kite', 'Eating spaghetti', 'Riding a rollercoaster',
      'Typing very fast', 'Skipping rope', 'Putting on sunscreen', 'Shaking hands',
      'Reading a map', 'Pushing a shopping trolley', 'Balancing a book on your head',
      'Driving in traffic', 'Pouring tea', 'Surfing a wave', 'Putting up a tent',
      'Feeding a baby', 'Doing yoga', 'Parallel parking', 'Playing chess',
      'Knitting', 'Walking in high heels', 'Blowing out birthday candles',
      'Painting a wall', 'Doing the robot dance',
    ].map((prompt) => ({
      card_name: prompt,
      front_text: prompt,
      back_text: 'Act this out without speaking, making sounds, or mouthing words. Your team has 60 seconds to guess.',
      default_copies: 1,
      is_unique: true,
      attributes: {},
    })),
  },
  {
    meta: {
      deck_name: 'Animal Charades',
      description: 'Act out the animal on your card without making a sound. Can your team guess it in 60 seconds?',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'no_duplicates',
      total_cards: 50,
      unique_cards: 50,
      is_public: true,
    },
    assignToAll: true,
    cards: [
      'Elephant', 'Giraffe', 'Lion', 'Penguin', 'Kangaroo',
      'Monkey', 'Snake', 'Crocodile', 'Parrot', 'Flamingo',
      'Crab', 'Octopus', 'Shark', 'Dolphin', 'Whale',
      'Gorilla', 'Cheetah', 'Sloth', 'Koala', 'Panda',
      'Zebra', 'Peacock', 'Eagle', 'Owl', 'Frog',
      'Butterfly', 'Spider', 'Bee', 'Turtle', 'Bear',
      'Wolf', 'Fox', 'Deer', 'Bat', 'Rooster',
      'Chameleon', 'Meerkat', 'Raccoon', 'Walrus', 'Seal',
      'Camel', 'Porcupine', 'Hedgehog', 'Platypus', 'Duck',
      'Horse', 'Rabbit', 'Cat', 'Dog', 'Gorilla',
    ].filter((v, i, a) => a.indexOf(v) === i).map((animal) => ({
      card_name: animal,
      front_text: animal,
      back_text: 'Act out this animal without speaking, making sounds, or mouthing words. Your team has 60 seconds to guess.',
      default_copies: 1,
      is_unique: true,
      attributes: { category: 'animal' },
    })),
  },
  {
    meta: {
      deck_name: 'World Capitals Flashcards',
      description: 'Test your geography knowledge. The front shows the country, flip to see the capital city on the back.',
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'no_duplicates',
      total_cards: 30,
      unique_cards: 30,
      is_public: true,
    },
    assignToAll: true,
    cards: [
      ['France', 'Paris'], ['Germany', 'Berlin'], ['Japan', 'Tokyo'],
      ['Brazil', 'Brasília'], ['Australia', 'Canberra'], ['Canada', 'Ottawa'],
      ['Egypt', 'Cairo'], ['India', 'New Delhi'], ['Argentina', 'Buenos Aires'],
      ['South Africa', 'Pretoria'], ['Mexico', 'Mexico City'], ['China', 'Beijing'],
      ['Russia', 'Moscow'], ['Italy', 'Rome'], ['Spain', 'Madrid'],
      ['Nigeria', 'Abuja'], ['South Korea', 'Seoul'], ['Turkey', 'Ankara'],
      ['Saudi Arabia', 'Riyadh'], ['Netherlands', 'Amsterdam'], ['Sweden', 'Stockholm'],
      ['Norway', 'Oslo'], ['Poland', 'Warsaw'], ['Portugal', 'Lisbon'],
      ['Greece', 'Athens'], ['Pakistan', 'Islamabad'], ['Indonesia', 'Jakarta'],
      ['Thailand', 'Bangkok'], ['Kenya', 'Nairobi'], ['Colombia', 'Bogotá'],
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

async function findOrCreateCard(userId, card) {
  const existing = await db.query(
    'SELECT card_id FROM cards WHERE card_name = $1 AND created_by_user_id = $2',
    [card.card_name, userId]
  );
  if (existing.rows.length > 0) return existing.rows[0].card_id;

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
      card.front_image_url || null,
      card.back_text || null,
      card.back_image_url || null,
      card.default_copies,
      card.is_unique,
      JSON.stringify(card.attributes),
    ]
  );
  return result.rows[0].card_id;
}

async function seedDeck(userId, meta, cardDefs) {
  const existing = await db.query(
    'SELECT deck_id FROM decks WHERE deck_name = $1 AND user_id = $2',
    [meta.deck_name, userId]
  );
  if (existing.rows.length > 0) return existing.rows[0].deck_id;

  const cardEntries = [];
  for (const cardDef of cardDefs) {
    const cardId = await findOrCreateCard(userId, cardDef);
    cardEntries.push({ cardId, quantity: cardDef.default_copies });
  }

  const deckResult = await db.query(
    `INSERT INTO decks
       (user_id, deck_name, description, shuffle_behaviour, duplicate_handling,
        total_cards, unique_cards, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING deck_id`,
    [
      userId, meta.deck_name, meta.description, meta.shuffle_behaviour,
      meta.duplicate_handling, meta.total_cards, meta.unique_cards, meta.is_public,
    ]
  );
  const deckId = deckResult.rows[0].deck_id;

  for (let i = 0; i < cardEntries.length; i++) {
    await db.query(
      'INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)',
      [deckId, cardEntries[i].cardId, cardEntries[i].quantity, i + 1]
    );
  }

  return deckId;
}

async function assignDeckToAllUsers(seedUserId, deckId, allUserIds) {
  let assigned = 0;
  let cardsCopied = 0;

  for (const userId of allUserIds) {
    await db.query(
      'INSERT INTO user_decks (user_id, deck_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, deckId]
    );
    assigned++;

    await db.query(
      `INSERT INTO cards
         (created_by_user_id, card_name, front_text, front_image_url,
          back_text, back_image_url, default_copies, is_unique, attributes)
       SELECT $1, c.card_name, c.front_text, c.front_image_url,
              c.back_text, c.back_image_url, c.default_copies, c.is_unique, c.attributes
       FROM deck_cards dc
       JOIN cards c ON c.card_id = dc.card_id
       WHERE dc.deck_id = $2`,
      [userId, deckId]
    );
    cardsCopied++;
  }

  return { assigned, cardsCopied };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database…\n');

  // ── 1. Reset ────────────────────────────────────────────────────────────────
  await db.query(
    'TRUNCATE users, decks, cards, deck_cards, game_rules, games, game_players RESTART IDENTITY CASCADE'
  );
  console.log('Cleared existing data\n');

  // ── 2. Test users ───────────────────────────────────────────────────────────
  console.log('Test users:');
  const testUserIds = [];
  for (const u of TEST_USERS) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
      [u.username, u.email, hash]
    );
    testUserIds.push(result.rows[0].user_id);
    console.log(`  Created ${u.username} (user_id=${result.rows[0].user_id})`);
  }

  // ── 3. Seed (system) user ───────────────────────────────────────────────────
  console.log('\nSeed user:');
  const seedHash = await bcrypt.hash(SEED_USER.password, SALT_ROUNDS);
  const seedResult = await db.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
    [SEED_USER.username, SEED_USER.email, seedHash]
  );
  const seedUserId = seedResult.rows[0].user_id;
  console.log(`  Created ${SEED_USER.username} (user_id=${seedUserId})`);

  // ── 4. System decks ─────────────────────────────────────────────────────────
  console.log('\nSystem decks:');
  for (const { meta, cards, assignToAll } of DECKS) {
    const deckId = await seedDeck(seedUserId, meta, cards);
    const label = `"${meta.deck_name}"`;

    if (assignToAll) {
      const { assigned, cardsCopied } = await assignDeckToAllUsers(seedUserId, deckId, testUserIds);
      console.log(`  ${label} — ${cards.length} cards, assigned + copied to ${cardsCopied}/${assigned} users`);
    } else {
      console.log(`  ${label} — ${cards.length} cards (system only)`);
    }
  }

  // ── 5. Sample cards + decks for test users ──────────────────────────────────
  console.log('\nSample data for test users:');

  const sampleCards = [
    { userId: testUserIds[0], card_name: 'Fire Dragon',    front_text: 'Fire Dragon',    back_text: 'A powerful fire-breathing dragon', default_copies: 1, is_unique: true,  attributes: { attack: 8, defense: 6 } },
    { userId: testUserIds[0], card_name: 'Ice Shield',     front_text: 'Ice Shield',     back_text: 'Blocks incoming damage',           default_copies: 1, is_unique: false, attributes: { defense: 10 } },
    { userId: testUserIds[0], card_name: 'Lightning Bolt', front_text: 'Lightning Bolt', back_text: 'Deal 5 damage to any target',      default_copies: 1, is_unique: false, attributes: { damage: 5 } },
    { userId: testUserIds[1], card_name: 'Stone Golem',    front_text: 'Stone Golem',    back_text: 'Slow but sturdy defender',         default_copies: 1, is_unique: true,  attributes: { attack: 3, defense: 12 } },
    { userId: testUserIds[1], card_name: 'Healing Potion', front_text: 'Healing Potion', back_text: 'Restore 5 health',                 default_copies: 1, is_unique: false, attributes: { heal: 5 } },
  ];

  const sampleCardIds = [];
  for (const card of sampleCards) {
    const result = await db.query(
      `INSERT INTO cards (created_by_user_id, card_name, front_text, back_text, default_copies, is_unique, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING card_id`,
      [card.userId, card.card_name, card.front_text, card.back_text, card.default_copies, card.is_unique, JSON.stringify(card.attributes)]
    );
    sampleCardIds.push(result.rows[0].card_id);
  }

  const sampleDecks = [
    { userId: testUserIds[0], deck_name: 'Starter Deck', description: 'A basic deck to get started', is_public: true },
    { userId: testUserIds[0], deck_name: 'Custom Deck',  description: 'My custom card collection',   is_public: false },
    { userId: testUserIds[1], deck_name: 'Battle Deck',  description: 'Ready for battle!',           is_public: true },
  ];

  const sampleDeckIds = [];
  for (const deck of sampleDecks) {
    const result = await db.query(
      'INSERT INTO decks (user_id, deck_name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING deck_id',
      [deck.userId, deck.deck_name, deck.description, deck.is_public]
    );
    sampleDeckIds.push(result.rows[0].deck_id);
  }

  // Link sample cards to sample decks
  await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [sampleDeckIds[0], sampleCardIds[0], 2, 1]);
  await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [sampleDeckIds[0], sampleCardIds[1], 1, 2]);
  await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [sampleDeckIds[0], sampleCardIds[2], 3, 3]);
  await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [sampleDeckIds[2], sampleCardIds[3], 2, 1]);
  await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [sampleDeckIds[2], sampleCardIds[4], 4, 2]);

  console.log(`  ${sampleCards.length} sample cards, ${sampleDecks.length} sample decks`);

  // ── 6. Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('Seeding complete!\n');
  console.log('Test accounts:');
  TEST_USERS.forEach((u) => {
    console.log(`  ${u.email}  /  ${u.password}`);
  });
  console.log(`\nSeed account: ${SEED_USER.email}  /  ${SEED_USER.password}`);
  console.log('─'.repeat(50));

  process.exit(0);
}

main().catch((err) => {
  console.error('\nSeed error:', err);
  process.exit(1);
});
