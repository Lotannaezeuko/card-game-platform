const db = require('../db');
const {
  getAllCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  addCardToDeck,
  removeCardFromDeck,
} = require('../controllers/cardController');

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

describe('getAllCards', () => {
  it('should return cards with default pagination', async () => {
    const cards = [{ card_id: 1, card_name: 'Fireball' }];
    db.query
      .mockResolvedValueOnce({ rows: cards })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const req = { query: {} };
    const res = mockRes();

    await getAllCards(req, res);

    expect(res.json).toHaveBeenCalledWith({
      cards,
      pagination: { total: 1, limit: 50, offset: 0 },
    });
  });

  it('should respect limit and offset query params', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = { query: { limit: '10', offset: '20' } };
    const res = mockRes();

    await getAllCards(req, res);

    expect(res.json).toHaveBeenCalledWith({
      cards: [],
      pagination: { total: 0, limit: 10, offset: 20 },
    });
  });

  it('should cap limit at 100', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = { query: { limit: '500' } };
    const res = mockRes();

    await getAllCards(req, res);

    expect(res.json).toHaveBeenCalledWith({
      cards: [],
      pagination: { total: 0, limit: 100, offset: 0 },
    });
  });

  it('should filter by card_type', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = { query: { card_type: 'spell' } };
    const res = mockRes();

    await getAllCards(req, res);

    expect(db.query).toHaveBeenCalledTimes(2);
    const firstCallParams = db.query.mock.calls[0][1];
    expect(firstCallParams).toContain('spell');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { query: {} };
    const res = mockRes();

    await getAllCards(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('getCardById', () => {
  it('should return a card by id', async () => {
    const card = { card_id: 1, card_name: 'Fireball', card_type: 'spell' };
    db.query.mockResolvedValue({ rows: [card] });

    const req = { params: { card_id: 1 } };
    const res = mockRes();

    await getCardById(req, res);

    expect(res.json).toHaveBeenCalledWith(card);
  });

  it('should return 404 if card not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { card_id: 999 } };
    const res = mockRes();

    await getCardById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { card_id: 1 } };
    const res = mockRes();

    await getCardById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createCard', () => {
  it('should return 400 if card_name is missing', async () => {
    const req = { body: { card_type: 'spell', content: 'Deal damage' }, user: { userId: 1 } };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card name is required' });
  });

  it('should return 400 if card_name is empty string', async () => {
    const req = { body: { card_name: '  ', card_type: 'spell', content: 'Deal damage' }, user: { userId: 1 } };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card name is required' });
  });

  it('should return 400 if card_type is missing', async () => {
    const req = { body: { card_name: 'Fireball', content: 'Deal damage' }, user: { userId: 1 } };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card type is required' });
  });

  it('should return 400 if content is missing', async () => {
    const req = { body: { card_name: 'Fireball', card_type: 'spell' }, user: { userId: 1 } };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card content is required' });
  });

  it('should create a card successfully', async () => {
    const newCard = { card_id: 1, card_name: 'Fireball', card_type: 'spell', content: 'Deal damage', created_at: '2024-01-01' };
    db.query.mockResolvedValue({ rows: [newCard] });

    const req = {
      body: { card_name: 'Fireball', card_type: 'spell', content: 'Deal damage', attributes: { damage: 10 } },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newCard);
  });

  it('should create a card with default empty attributes', async () => {
    const newCard = { card_id: 1, card_name: 'Fireball', card_type: 'spell' };
    db.query.mockResolvedValue({ rows: [newCard] });

    const req = {
      body: { card_name: 'Fireball', card_type: 'spell', content: 'Deal damage' },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createCard(req, res);

    const insertParams = db.query.mock.calls[0][1];
    expect(insertParams[5]).toBe('{}');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = {
      body: { card_name: 'Fireball', card_type: 'spell', content: 'Deal damage' },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createCard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateCard', () => {
  it('should return 404 if card not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { card_id: 999 }, body: { card_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('should return 403 if user is not the creator', async () => {
    db.query.mockResolvedValue({ rows: [{ created_by_user_id: 2 }] });

    const req = { params: { card_id: 1 }, body: { card_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You are not the card creator.' });
  });

  it('should return 400 if card_name is empty', async () => {
    db.query.mockResolvedValue({ rows: [{ created_by_user_id: 1 }] });

    const req = { params: { card_id: 1 }, body: { card_name: '  ' }, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card name cannot be empty' });
  });

  it('should return 400 if no fields to update', async () => {
    db.query.mockResolvedValue({ rows: [{ created_by_user_id: 1 }] });

    const req = { params: { card_id: 1 }, body: {}, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No fields to update' });
  });

  it('should update card successfully', async () => {
    const updatedCard = { card_id: 1, card_name: 'Updated Fireball', card_type: 'spell' };
    db.query
      .mockResolvedValueOnce({ rows: [{ created_by_user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [updatedCard] });

    const req = { params: { card_id: 1 }, body: { card_name: 'Updated Fireball' }, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedCard);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { card_id: 1 }, body: { card_name: 'Updated' }, user: { userId: 1 } };
    const res = mockRes();

    await updateCard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('deleteCard', () => {
  it('should return 404 if card not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { card_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteCard(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 if user is not the creator', async () => {
    db.query.mockResolvedValue({ rows: [{ created_by_user_id: 2 }] });

    const req = { params: { card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteCard(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 409 if card is used in a deck', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ created_by_user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ deck_id: 1 }] });

    const req = { params: { card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteCard(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cannot delete card. It is currently used in one or more decks.',
    });
  });

  it('should delete card successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ created_by_user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] }) // no deck usage
      .mockResolvedValueOnce({}); // delete

    const req = { params: { card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteCard(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Card deleted successfully' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await deleteCard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('addCardToDeck', () => {
  it('should return 400 if card_id is missing', async () => {
    const req = { params: { deck_id: 1 }, body: { quantity: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card ID is required' });
  });

  it('should return 400 if quantity is less than 1', async () => {
    const req = { params: { deck_id: 1 }, body: { card_id: 1, quantity: 0 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Quantity must be greater than 0' });
  });

  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999 }, body: { card_id: 1, quantity: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 2 }] });

    const req = { params: { deck_id: 1 }, body: { card_id: 1, quantity: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 404 if card not found', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck exists
      .mockResolvedValueOnce({ rows: [] }); // card not found

    const req = { params: { deck_id: 1 }, body: { card_id: 999, quantity: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found' });
  });

  it('should insert new card into deck', async () => {
    const newEntry = { deck_card_id: 1, deck_id: 1, card_id: 1, quantity: 2, card_order: 1 };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck exists
      .mockResolvedValueOnce({ rows: [{ card_id: 1 }] }) // card exists
      .mockResolvedValueOnce({ rows: [] }) // not already in deck
      .mockResolvedValueOnce({ rows: [{ next_order: 1 }] }) // max order
      .mockResolvedValueOnce({ rows: [newEntry] }); // insert

    const req = { params: { deck_id: 1 }, body: { card_id: 1, quantity: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newEntry);
  });

  it('should update quantity if card already in deck', async () => {
    const updatedEntry = { deck_card_id: 1, deck_id: 1, card_id: 1, quantity: 3, card_order: 1 };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck exists
      .mockResolvedValueOnce({ rows: [{ card_id: 1 }] }) // card exists
      .mockResolvedValueOnce({ rows: [{ deck_card_id: 1, quantity: 2 }] }) // already in deck
      .mockResolvedValueOnce({ rows: [updatedEntry] }); // update

    const req = { params: { deck_id: 1 }, body: { card_id: 1, quantity: 3 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updatedEntry);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1 }, body: { card_id: 1, quantity: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await addCardToDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('removeCardFromDeck', () => {
  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { deck_id: 999, card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await removeCardFromDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user does not own the deck', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 2 }] });

    const req = { params: { deck_id: 1, card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await removeCardFromDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 404 if card not in deck', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck exists
      .mockResolvedValueOnce({ rows: [] }); // card not in deck

    const req = { params: { deck_id: 1, card_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await removeCardFromDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found in this deck' });
  });

  it('should remove card from deck successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck exists
      .mockResolvedValueOnce({ rows: [{ deck_card_id: 1 }] }); // deleted

    const req = { params: { deck_id: 1, card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await removeCardFromDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Card removed from deck successfully' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { deck_id: 1, card_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await removeCardFromDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
