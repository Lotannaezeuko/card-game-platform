const db = require('../db');
const {
  getAllDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
} = require('../controllers/deckController');

jest.mock('../db');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('getAllDecks', () => {
  it('should return public decks when is_public=true', async () => {
    const decks = [{ deck_id: 1, deck_name: 'Public Deck', is_public: true, shuffle_behaviour: 'shuffle_before_game' }];
    db.query.mockResolvedValue({ rows: decks });

    const req = { query: { is_public: 'true' }, user: { userId: 1 } };
    const res = mockRes();

    await getAllDecks(req, res);

    expect(res.json).toHaveBeenCalledWith({ decks });
    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).toContain('d.is_public = true');
  });

  it('should return user decks when is_public is not true', async () => {
    const decks = [{ deck_id: 1, deck_name: 'My Deck', user_id: 1, shuffle_behaviour: 'shuffle_before_game' }];
    db.query.mockResolvedValue({ rows: decks });

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllDecks(req, res);

    expect(res.json).toHaveBeenCalledWith({ decks });
    const queryParams = db.query.mock.calls[0][1];
    expect(queryParams).toEqual([1]);
  });

  it('should include new deck fields in query', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllDecks(req, res);

    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).toContain('shuffle_behaviour');
    expect(queryStr).toContain('duplicate_handling');
    expect(queryStr).toContain('total_cards');
    expect(queryStr).toContain('unique_cards');
  });

  it('should include user_decks library decks in the private query', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllDecks(req, res);

    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).toContain('user_decks');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllDecks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('getDeckById', () => {
  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if deck is private and user is not the owner', async () => {
    db.query.mockResolvedValue({
      rows: [{ deck_id: 1, user_id: 2, is_public: false }],
    });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. This deck is private.' });
  });

  it('should return deck with cards for owner', async () => {
    const deck = {
      deck_id: 1,
      user_id: 1,
      deck_name: 'My Deck',
      is_public: false,
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'allow_duplicates',
    };
    const cards = [{ card_id: 1, card_name: 'Fireball', front_text: 'Deal damage', quantity: 2 }];

    db.query
      .mockResolvedValueOnce({ rows: [deck] })
      .mockResolvedValueOnce({ rows: cards });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    expect(res.json).toHaveBeenCalledWith({ ...deck, cards });
  });

  it('should return public deck with cards for non-owner', async () => {
    const deck = {
      deck_id: 1,
      user_id: 2,
      deck_name: 'Public Deck',
      is_public: true,
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'allow_duplicates',
    };
    const cards = [{ card_id: 1, card_name: 'Fireball', front_text: 'Deal damage' }];

    db.query
      .mockResolvedValueOnce({ rows: [deck] })
      .mockResolvedValueOnce({ rows: cards });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    expect(res.json).toHaveBeenCalledWith({ ...deck, cards });
  });

  it('should use updated card fields in cards query', async () => {
    const deck = { deck_id: 1, user_id: 1, is_public: true };
    db.query
      .mockResolvedValueOnce({ rows: [deck] })
      .mockResolvedValueOnce({ rows: [] });

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    const cardsQueryStr = db.query.mock.calls[1][0];
    expect(cardsQueryStr).toContain('front_text');
    expect(cardsQueryStr).toContain('front_image_url');
    expect(cardsQueryStr).toContain('back_text');
    expect(cardsQueryStr).toContain('back_image_url');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getDeckById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createDeck', () => {
  it('should return 400 if deck_name is missing', async () => {
    const req = { body: {}, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck name is required' });
  });

  it('should return 400 if deck_name is empty', async () => {
    const req = { body: { deck_name: '   ' }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck name is required' });
  });

  it('should return 400 if deck_name exceeds 100 characters', async () => {
    const req = { body: { deck_name: 'a'.repeat(101) }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck name must be 100 characters or less' });
  });

  it('should create deck successfully', async () => {
    const newDeck = {
      deck_id: 1,
      deck_name: 'New Deck',
      is_public: false,
      shuffle_behaviour: 'shuffle_before_game',
      duplicate_handling: 'allow_duplicates',
      created_at: '2024-01-01',
    };
    db.query.mockResolvedValue({ rows: [newDeck] });

    const req = { body: { deck_name: 'New Deck', description: 'A test deck' }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newDeck);
  });

  it('should create deck with new fields', async () => {
    db.query.mockResolvedValue({ rows: [{ deck_id: 1 }] });

    const req = {
      body: {
        deck_name: 'New Deck',
        total_cards: 60,
        unique_cards: 20,
        shuffle_behaviour: 'no_shuffle',
        duplicate_handling: 'no_duplicates',
      },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createDeck(req, res);

    const insertParams = db.query.mock.calls[0][1];
    expect(insertParams[4]).toBe(60);
    expect(insertParams[5]).toBe(20);
    expect(insertParams[6]).toBe('no_shuffle');
    expect(insertParams[7]).toBe('no_duplicates');
  });

  it('should default is_public to false', async () => {
    db.query.mockResolvedValue({ rows: [{ deck_id: 1 }] });

    const req = { body: { deck_name: 'New Deck' }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    const insertParams = db.query.mock.calls[0][1];
    expect(insertParams[3]).toBe(false);
  });

  it('should default shuffle_behaviour and duplicate_handling', async () => {
    db.query.mockResolvedValue({ rows: [{ deck_id: 1 }] });

    const req = { body: { deck_name: 'New Deck' }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    const insertParams = db.query.mock.calls[0][1];
    expect(insertParams[6]).toBe('shuffle_before_game');
    expect(insertParams[7]).toBe('allow_duplicates');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { body: { deck_name: 'New Deck' }, user: { userId: 1 } };
    const res = mockRes();

    await createDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateDeck', () => {
  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999 }, body: { deck_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 2 }] });

    const req = { params: { deck_id: 1 }, body: { deck_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You do not own this deck.' });
  });

  it('should return 400 if deck_name is empty', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 1 }] });

    const req = { params: { deck_id: 1 }, body: { deck_name: '  ' }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck name cannot be empty' });
  });

  it('should return 400 if deck_name exceeds 100 characters', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 1 }] });

    const req = { params: { deck_id: 1 }, body: { deck_name: 'a'.repeat(101) }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck name must be 100 characters or less' });
  });

  it('should return 400 if no fields to update', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 1 }] });

    const req = { params: { deck_id: 1 }, body: {}, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No fields to update' });
  });

  it('should update deck successfully', async () => {
    const updatedDeck = { deck_id: 1, deck_name: 'Updated Deck', is_public: true };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [updatedDeck] });

    const req = { params: { deck_id: 1 }, body: { deck_name: 'Updated Deck', is_public: true }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedDeck);
  });

  it('should update new deck fields', async () => {
    const updatedDeck = {
      deck_id: 1,
      shuffle_behaviour: 'no_shuffle',
      duplicate_handling: 'no_duplicates',
      total_cards: 40,
      unique_cards: 15,
    };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [updatedDeck] });

    const req = {
      params: { deck_id: 1 },
      body: { shuffle_behaviour: 'no_shuffle', duplicate_handling: 'no_duplicates', total_cards: 40, unique_cards: 15 },
      user: { userId: 1 },
    };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedDeck);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1 }, body: { deck_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteDeck', () => {
  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user neither owns nor has deck in library', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 2 }] }) // deck owned by someone else
      .mockResolvedValueOnce({ rows: [] });               // not in user_decks either

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You do not own this deck.' });
  });

  it('should delete deck successfully when user owns it', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Deck deleted successfully' });
  });

  it('should remove assigned deck from library when user does not own it', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 2 }] })              // owned by someone else
      .mockResolvedValueOnce({ rows: [{ user_deck_id: 5 }] });        // found in user_decks

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Deck removed from your library' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
