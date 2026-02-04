require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const db = require('./index');

const SALT_ROUNDS = 10;

const seedUsers = [
  { username: 'testuser1', email: 'test1@example.com', password: 'password123' },
  { username: 'testuser2', email: 'test2@example.com', password: 'password123' },
  { username: 'admin', email: 'admin@example.com', password: 'adminpass123' },
];

const seedDecks = [
  { userId: 1, deckName: 'Starter Deck', description: 'A basic deck to get started', isPublic: true },
  { userId: 1, deckName: 'Custom Deck', description: 'My custom card collection', isPublic: false },
  { userId: 2, deckName: 'Battle Deck', description: 'Ready for battle!', isPublic: true },
];

const seedCards = [
  { userId: 1, cardName: 'Fire Dragon', cardType: 'creature', content: 'A powerful fire-breathing dragon', attributes: { attack: 8, defense: 6 } },
  { userId: 1, cardName: 'Ice Shield', cardType: 'spell', content: 'Blocks incoming damage', attributes: { defense: 10 } },
  { userId: 1, cardName: 'Lightning Bolt', cardType: 'spell', content: 'Deal 5 damage to any target', attributes: { damage: 5 } },
  { userId: 2, cardName: 'Stone Golem', cardType: 'creature', content: 'Slow but sturdy defender', attributes: { attack: 3, defense: 12 } },
  { userId: 2, cardName: 'Healing Potion', cardType: 'item', content: 'Restore 5 health', attributes: { heal: 5 } },
];

async function seed() {
  try {
    console.log('Seeding database...\n');

    // Clear existing data
    await db.query('TRUNCATE users, decks, cards, deck_cards, game_rules, games, game_players RESTART IDENTITY CASCADE');
    console.log('Cleared existing data');

    // Seed users
    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
      await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        [user.username, user.email, passwordHash]
      );
    }
    console.log(`Created ${seedUsers.length} users`);

    // Seed decks
    for (const deck of seedDecks) {
      await db.query(
        'INSERT INTO decks (user_id, deck_name, description, is_public) VALUES ($1, $2, $3, $4)',
        [deck.userId, deck.deckName, deck.description, deck.isPublic]
      );
    }
    console.log(`Created ${seedDecks.length} decks`);

    // Seed cards
    for (const card of seedCards) {
      await db.query(
        'INSERT INTO cards (created_by_user_id, card_name, card_type, content, attributes) VALUES ($1, $2, $3, $4, $5)',
        [card.userId, card.cardName, card.cardType, card.content, JSON.stringify(card.attributes)]
      );
    }
    console.log(`Created ${seedCards.length} cards`);

    // Add cards to decks
    await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [1, 1, 2, 1]);
    await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [1, 2, 1, 2]);
    await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [1, 3, 3, 3]);
    await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [3, 4, 2, 1]);
    await db.query('INSERT INTO deck_cards (deck_id, card_id, quantity, card_order) VALUES ($1, $2, $3, $4)', [3, 5, 4, 2]);
    console.log('Added cards to decks');

    console.log('\nSeeding complete!\n');
    console.log('Test accounts:');
    console.log('─'.repeat(50));
    seedUsers.forEach(u => {
      console.log(`  Email: ${u.email}`);
      console.log(`  Password: ${u.password}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
