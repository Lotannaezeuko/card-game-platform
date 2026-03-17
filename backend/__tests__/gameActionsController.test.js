const db = require('../db');
const {
  dealStartingHand,
  drawCard,
  playCard,
  passTurn,
  reshuffleDeck,
  updateScore,
  endSession,
} = require('../controllers/gameActionsController');

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

describe('dealStartingHand', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await dealStartingHand(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 403 if user is not a participant', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ deck_id: 1, starting_hand_size: 5, status: 'lobby', host_user_id: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await dealStartingHand(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You are not a participant in this game.' });
  });

  it('should allow host to deal even if not in game_players', async () => {
    const game = { deck_id: 1, starting_hand_size: 2, status: 'lobby', host_user_id: 1 };
    const players = [{ user_id: 2 }];
    const deckCards = [{ card_id: 10, quantity: 2 }, { card_id: 20, quantity: 2 }];

    db.query
      .mockResolvedValueOnce({ rows: [game] })
      .mockResolvedValueOnce({ rows: [] })        // player check - not in game_players
      .mockResolvedValueOnce({ rows: players })   // get players
      .mockResolvedValueOnce({ rows: deckCards }) // deck cards
      .mockResolvedValue({ rows: [] });           // all inserts

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await dealStartingHand(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Starting hand dealt successfully' });
  });

  it('should deal starting hand and set game to active', async () => {
    const game = { deck_id: 1, starting_hand_size: 2, status: 'lobby', host_user_id: 1 };
    const players = [{ user_id: 1 }, { user_id: 2 }];
    const deckCards = [{ card_id: 10, quantity: 3 }, { card_id: 20, quantity: 3 }];

    db.query
      .mockResolvedValueOnce({ rows: [game] })
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: players })
      .mockResolvedValueOnce({ rows: deckCards })
      .mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await dealStartingHand(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Starting hand dealt successfully' });

    const allQueries = db.query.mock.calls.map((c) => c[0]);
    expect(allQueries.some((q) => q.includes('player_hands'))).toBe(true);
    expect(allQueries.some((q) => q.includes('session_draw_pile'))).toBe(true);
    expect(allQueries.some((q) => q.includes("status = 'active'"))).toBe(true);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await dealStartingHand(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('drawCard', () => {
  it('should return 403 if user is not a player', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await drawCard(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You are not a player in this game.' });
  });

  it('should return 404 if draw pile is empty', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_player_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await drawCard(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No cards remaining in the draw pile' });
  });

  it('should draw a card and add it to player hand', async () => {
    const handEntry = { hand_id: 5, game_id: 1, user_id: 1, card_id: 10 };
    db.query
      .mockResolvedValueOnce({ rows: [{ game_player_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ pile_id: 3, card_id: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [handEntry] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await drawCard(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ hand_entry: handEntry });

    const updateCall = db.query.mock.calls[2];
    expect(updateCall[0]).toContain('is_drawn = true');
    expect(updateCall[1]).toContain(3);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await drawCard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('playCard', () => {
  it('should return 400 if hand_id is missing', async () => {
    const req = { params: { game_id: 1 }, body: {}, user: { userId: 1 } };
    const res = mockRes();

    await playCard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'hand_id is required' });
  });

  it('should return 404 if card not in player hand', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, body: { hand_id: 99 }, user: { userId: 1 } };
    const res = mockRes();

    await playCard(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Card not found in your hand' });
  });

  it('should play a card and add it to discard pile', async () => {
    const discardEntry = { discard_id: 1, game_id: 1, card_id: 10, discarded_by: 1 };
    db.query
      .mockResolvedValueOnce({ rows: [{ card_id: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [discardEntry] });

    const req = { params: { game_id: 1 }, body: { hand_id: 5 }, user: { userId: 1 } };
    const res = mockRes();

    await playCard(req, res);

    expect(res.json).toHaveBeenCalledWith({ discard_entry: discardEntry });

    const deleteCall = db.query.mock.calls[1];
    expect(deleteCall[0]).toContain('DELETE FROM player_hands');
    expect(deleteCall[1]).toContain(5);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, body: { hand_id: 5 }, user: { userId: 1 } };
    const res = mockRes();

    await playCard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('passTurn', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 400 if no players in the game', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ current_player_position: 1, turn_direction: 'clockwise' }] })
      .mockResolvedValueOnce({ rows: [{ player_count: '0' }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No players in this game' });
  });

  it('should advance turn clockwise', async () => {
    const updatedGame = { game_id: 1, current_player_position: 2, turn_direction: 'clockwise' };
    db.query
      .mockResolvedValueOnce({ rows: [{ current_player_position: 1, turn_direction: 'clockwise' }] })
      .mockResolvedValueOnce({ rows: [{ player_count: '3' }] })
      .mockResolvedValueOnce({ rows: [updatedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    expect(res.json).toHaveBeenCalledWith({ game: updatedGame });
    const updateParams = db.query.mock.calls[2][1];
    expect(updateParams[0]).toBe(2);
  });

  it('should wrap around clockwise at end', async () => {
    const updatedGame = { game_id: 1, current_player_position: 1, turn_direction: 'clockwise' };
    db.query
      .mockResolvedValueOnce({ rows: [{ current_player_position: 3, turn_direction: 'clockwise' }] })
      .mockResolvedValueOnce({ rows: [{ player_count: '3' }] })
      .mockResolvedValueOnce({ rows: [updatedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    const updateParams = db.query.mock.calls[2][1];
    expect(updateParams[0]).toBe(1);
  });

  it('should advance turn counterclockwise', async () => {
    const updatedGame = { game_id: 1, current_player_position: 1, turn_direction: 'counterclockwise' };
    db.query
      .mockResolvedValueOnce({ rows: [{ current_player_position: 2, turn_direction: 'counterclockwise' }] })
      .mockResolvedValueOnce({ rows: [{ player_count: '3' }] })
      .mockResolvedValueOnce({ rows: [updatedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    const updateParams = db.query.mock.calls[2][1];
    expect(updateParams[0]).toBe(1);
  });

  it('should wrap around counterclockwise at start', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ current_player_position: 1, turn_direction: 'counterclockwise' }] })
      .mockResolvedValueOnce({ rows: [{ player_count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ current_player_position: 3 }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    const updateParams = db.query.mock.calls[2][1];
    expect(updateParams[0]).toBe(3);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await passTurn(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('reshuffleDeck', () => {
  it('should return message if discard pile is empty', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await reshuffleDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Discard pile is empty, nothing to reshuffle' });
  });

  it('should reshuffle discard pile into draw pile', async () => {
    const discardCards = [{ card_id: 10 }, { card_id: 20 }, { card_id: 30 }];
    db.query
      .mockResolvedValueOnce({ rows: discardCards })
      .mockResolvedValueOnce({ rows: [{ max_order: '5' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await reshuffleDeck(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Discard pile reshuffled into draw pile',
      count: 3,
    });

    const allQueries = db.query.mock.calls.map((c) => c[0]);
    expect(allQueries.some((q) => q.includes('DELETE FROM session_discard_pile'))).toBe(true);
    expect(allQueries.some((q) => q.includes('INSERT INTO session_draw_pile'))).toBe(true);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await reshuffleDeck(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateScore', () => {
  it('should return 400 if user_id or score is missing', async () => {
    const req = { params: { game_id: 1 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await updateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'user_id and score are required' });
  });

  it('should return 400 if score is missing', async () => {
    const req = { params: { game_id: 1 }, body: { score: 10 }, user: { userId: 1 } };
    const res = mockRes();

    await updateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 if player not in game', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, body: { user_id: 99, score: 10 }, user: { userId: 1 } };
    const res = mockRes();

    await updateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player not found in this game' });
  });

  it('should update score successfully', async () => {
    const updatedPlayer = { game_player_id: 1, user_id: 2, score: 15 };
    db.query.mockResolvedValue({ rows: [updatedPlayer] });

    const req = { params: { game_id: 1 }, body: { user_id: 2, score: 15 }, user: { userId: 1 } };
    const res = mockRes();

    await updateScore(req, res);

    expect(res.json).toHaveBeenCalledWith({ player: updatedPlayer });
    const updateParams = db.query.mock.calls[0][1];
    expect(updateParams[0]).toBe(15);
    expect(updateParams[1]).toBe(1);
    expect(updateParams[2]).toBe(2);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, body: { user_id: 2, score: 10 }, user: { userId: 1 } };
    const res = mockRes();

    await updateScore(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('endSession', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 403 if user is not the host', async () => {
    db.query.mockResolvedValue({ rows: [{ host_user_id: 2, status: 'active' }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Only the host can end the session.' });
  });

  it('should return 400 if session already ended', async () => {
    db.query.mockResolvedValue({ rows: [{ host_user_id: 1, status: 'ended' }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game session has already ended' });
  });

  it('should end session by setting status to ended and recording ended_at', async () => {
    const endedGame = { game_id: 1, status: 'ended', ended_at: '2024-01-01T12:00:00Z' };
    db.query
      .mockResolvedValueOnce({ rows: [{ host_user_id: 1, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [endedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Game session ended', game: endedGame });
    const updateQuery = db.query.mock.calls[1][0];
    expect(updateQuery).toContain("status = 'ended'");
    expect(updateQuery).toContain('ended_at = CURRENT_TIMESTAMP');
  });

  it('should end session from lobby status', async () => {
    const endedGame = { game_id: 1, status: 'ended' };
    db.query
      .mockResolvedValueOnce({ rows: [{ host_user_id: 1, status: 'lobby' }] })
      .mockResolvedValueOnce({ rows: [endedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Game session ended', game: endedGame });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
