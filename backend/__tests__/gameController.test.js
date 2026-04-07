const db = require('../db');
const {
  getAllGames,
  getGameById,
  createGame,
  updateGameState,
  endGame,
  addPlayerToGame,
  removePlayerFromGame,
} = require('../controllers/gameController');

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

describe('getAllGames', () => {
  it('should return all games for the user', async () => {
    const games = [{ game_id: 1, deck_name: 'My Deck', host_username: 'user1' }];
    db.query.mockResolvedValue({ rows: games });

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllGames(req, res);

    expect(res.json).toHaveBeenCalledWith({ games });
  });

  it('should filter active games using status enum when active=true', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { query: { active: 'true' }, user: { userId: 1 } };
    const res = mockRes();

    await getAllGames(req, res);

    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).toContain("status != 'ended'");
  });

  it('should not filter by status when active param is absent', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllGames(req, res);

    const queryStr = db.query.mock.calls[0][0];
    expect(queryStr).not.toContain("status != 'ended'");
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { query: {}, user: { userId: 1 } };
    const res = mockRes();

    await getAllGames(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getGameById', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await getGameById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 403 if user is not host or player', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_id: 1, host_user_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 3 }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getGameById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You are not a participant in this game.' });
  });

  it('should return game with players for host', async () => {
    const game = { game_id: 1, host_user_id: 1, deck_name: 'Deck', game_code: 'ABC123' };
    const players = [{ user_id: 1, username: 'host' }, { user_id: 2, username: 'player2' }];

    db.query
      .mockResolvedValueOnce({ rows: [game] })
      .mockResolvedValueOnce({ rows: players })
      .mockResolvedValueOnce({ rows: [] }); // discard top (empty)

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getGameById(req, res);

    expect(res.json).toHaveBeenCalledWith({ game, players, discard_top: null });
  });

  it('should return game with players for non-host player', async () => {
    const game = { game_id: 1, host_user_id: 2, deck_name: 'Deck', game_code: 'ABC123' };
    const players = [{ user_id: 2, username: 'host' }, { user_id: 1, username: 'me' }];

    db.query
      .mockResolvedValueOnce({ rows: [game] })
      .mockResolvedValueOnce({ rows: players })
      .mockResolvedValueOnce({ rows: [] }); // discard top (empty)

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getGameById(req, res);

    expect(res.json).toHaveBeenCalledWith({ game, players, discard_top: null });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await getGameById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('createGame', () => {
  it('should return 400 if deck_id is missing', async () => {
    const req = { body: {}, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck ID is required' });
  });

  it('should return 404 if deck not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { body: { deck_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Deck not found' });
  });

  it('should return 403 if user neither owns nor has deck in library', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 2 }] }) // owned by someone else
      .mockResolvedValueOnce({ rows: [] });               // not in user_decks

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You do not own this deck.' });
  });

  it('should allow user with deck in library to create a game', async () => {
    const game = { game_id: 1, deck_id: 1, host_user_id: 1, is_online: false, game_code: 'ABC123' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 2 }] })  // deck owned by seed user
      .mockResolvedValueOnce({ rows: [{ user_deck_id: 5 }] }) // but in user's library
      .mockResolvedValueOnce({ rows: [] })                 // game_code uniqueness check
      .mockResolvedValueOnce({ rows: [game] })             // insert game
      .mockResolvedValueOnce({});                          // insert player

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ game, message: 'Game created successfully' });
  });

  it('should create game with game_code and add host as player', async () => {
    const game = { game_id: 1, deck_id: 1, host_user_id: 1, is_online: false, game_code: 'ABC123' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // deck owned by user
      .mockResolvedValueOnce({ rows: [] })               // game_code uniqueness check
      .mockResolvedValueOnce({ rows: [game] })           // insert game
      .mockResolvedValueOnce({});                        // insert player

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ game, message: 'Game created successfully' });

    const playerInsert = db.query.mock.calls[3];
    expect(playerInsert[1]).toEqual([1, 1]);
  });

  it('should include game_code in insert params', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ game_id: 1, game_code: 'XYZ789' }] })
      .mockResolvedValueOnce({});

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    const gameInsertParams = db.query.mock.calls[2][1];
    expect(typeof gameInsertParams[2]).toBe('string');
    expect(gameInsertParams[2].length).toBe(6);
  });

  it('should default is_online to false', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ game_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    const gameInsertParams = db.query.mock.calls[2][1];
    expect(gameInsertParams[3]).toBe(false);
  });

  it('should pass is_online when provided', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ game_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = { body: { deck_id: 1, is_online: true }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    const gameInsertParams = db.query.mock.calls[2][1];
    expect(gameInsertParams[3]).toBe(true);
  });

  it('should include starting_hand_size, turn_direction, deal_method in insert', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ game_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = {
      body: { deck_id: 1, starting_hand_size: 7, turn_direction: 'counterclockwise', deal_method: 'one_at_a_time' },
      user: { userId: 1 },
    };
    const res = mockRes();

    await createGame(req, res);

    const gameInsertParams = db.query.mock.calls[2][1];
    expect(gameInsertParams[4]).toBe(7);
    expect(gameInsertParams[5]).toBe('counterclockwise');
    expect(gameInsertParams[6]).toBe('one_at_a_time');
  });

  it('should default starting_hand_size, turn_direction, deal_method', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ game_id: 1 }] })
      .mockResolvedValueOnce({});

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    const gameInsertParams = db.query.mock.calls[2][1];
    expect(gameInsertParams[4]).toBe(5);
    expect(gameInsertParams[5]).toBe('clockwise');
    expect(gameInsertParams[6]).toBe('full_hand_at_start');
  });

  it('should retry game_code generation if collision detected', async () => {
    const game = { game_id: 1, game_code: 'NEW123' };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })     // deck owned by user
      .mockResolvedValueOnce({ rows: [{ game_id: 99 }] })    // first code taken
      .mockResolvedValueOnce({ rows: [] })                   // second code free
      .mockResolvedValueOnce({ rows: [game] })               // insert game
      .mockResolvedValueOnce({});                            // insert player

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.query.mock.calls[1][0]).toContain('game_code');
    expect(db.query.mock.calls[2][0]).toContain('game_code');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { body: { deck_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await createGame(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateGameState', () => {
  it('should return 400 if game_state is missing', async () => {
    const req = { params: { game_id: 1 }, body: {}, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game state is required and must be an object' });
  });

  it('should return 400 if game_state is not an object', async () => {
    const req = { params: { game_id: 1 }, body: { game_state: 'string' }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 403 if user is not a player', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1 }, body: { game_state: { turn: 2 } }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. You are not a player in this game.' });
  });

  it('should return 404 if game not found after player check', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = { params: { game_id: 999 }, body: { game_state: { turn: 2 } }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 400 if game has already ended', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ ended_at: '2024-01-01' }] });

    const req = { params: { game_id: 1 }, body: { game_state: { turn: 2 } }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game has already ended' });
  });

  it('should update game state successfully', async () => {
    const updatedGame = { game_id: 1, game_state: { turn: 2 } };
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ ended_at: null }] })
      .mockResolvedValueOnce({ rows: [updatedGame] });

    const req = { params: { game_id: 1 }, body: { game_state: { turn: 2 } }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.json).toHaveBeenCalledWith({ game: updatedGame });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, body: { game_state: { turn: 2 } }, user: { userId: 1 } };
    const res = mockRes();

    await updateGameState(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('endGame', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await endGame(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 403 if user is not the host', async () => {
    db.query.mockResolvedValue({ rows: [{ host_user_id: 2, ended_at: null }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endGame(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Only the host can end the game.' });
  });

  it('should return 400 if game already ended', async () => {
    db.query.mockResolvedValue({ rows: [{ host_user_id: 1, ended_at: '2024-01-01' }] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endGame(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game has already ended' });
  });

  it('should end game and set status to ended', async () => {
    const endedGame = { game_id: 1, status: 'ended', ended_at: '2024-01-01T12:00:00Z' };
    db.query
      .mockResolvedValueOnce({ rows: [{ host_user_id: 1, ended_at: null }] })
      .mockResolvedValueOnce({ rows: [endedGame] });

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endGame(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Game ended successfully', game: endedGame });
    const updateQuery = db.query.mock.calls[1][0];
    expect(updateQuery).toContain("status = 'ended'");
    expect(updateQuery).toContain('ended_at = CURRENT_TIMESTAMP');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await endGame(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('addPlayerToGame', () => {
  it('should return 404 if game not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 999 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' });
  });

  it('should return 400 if game already ended', async () => {
    db.query.mockResolvedValue({ rows: [{ ended_at: '2024-01-01' }] });

    const req = { params: { game_id: 1 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Game has already ended' });
  });

  it('should return 409 if player already in game', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ ended_at: null }] })
      .mockResolvedValueOnce({ rows: [{ game_player_id: 1 }] });

    const req = { params: { game_id: 1 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player is already in this game' });
  });

  it('should add player successfully', async () => {
    const newPlayer = { game_player_id: 2, game_id: 1, user_id: 2, player_position: 2, score: 0 };
    db.query
      .mockResolvedValueOnce({ rows: [{ ended_at: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ next_position: 2 }] })
      .mockResolvedValueOnce({ rows: [newPlayer] });

    const req = { params: { game_id: 1 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ player: newPlayer, message: 'Player added to game' });
  });

  it('should add anonymous player (no user_id)', async () => {
    const newPlayer = { game_player_id: 3, game_id: 1, user_id: null, player_position: 2, score: 0 };
    db.query
      .mockResolvedValueOnce({ rows: [{ ended_at: null }] })
      .mockResolvedValueOnce({ rows: [{ next_position: 2 }] })
      .mockResolvedValueOnce({ rows: [newPlayer] });

    const req = { params: { game_id: 1 }, body: {}, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ player: newPlayer, message: 'Player added to game' });
    const insertParams = db.query.mock.calls[2][1];
    expect(insertParams[1]).toBeNull();
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1 }, body: { user_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await addPlayerToGame(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('removePlayerFromGame', () => {
  it('should return 404 if player not found in game', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { params: { game_id: 1, game_player_id: 999 }, user: { userId: 1 } };
    const res = mockRes();

    await removePlayerFromGame(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Player not found in this game' });
  });

  it('should return 403 if user is not host and not the player', async () => {
    db.query.mockResolvedValue({
      rows: [{ game_player_id: 2, user_id: 3, host_user_id: 2 }],
    });

    const req = { params: { game_id: 1, game_player_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await removePlayerFromGame(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Access denied. Only the host or the player themselves can remove a player.',
    });
  });

  it('should allow host to remove a player', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ game_player_id: 2, user_id: 3, host_user_id: 1 }],
      })
      .mockResolvedValueOnce({});

    const req = { params: { game_id: 1, game_player_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await removePlayerFromGame(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Player removed from game' });
  });

  it('should allow player to remove themselves', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ game_player_id: 2, user_id: 1, host_user_id: 2 }],
      })
      .mockResolvedValueOnce({});

    const req = { params: { game_id: 1, game_player_id: 2 }, user: { userId: 1 } };
    const res = mockRes();

    await removePlayerFromGame(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Player removed from game' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { params: { game_id: 1, game_player_id: 1 }, user: { userId: 1 } };
    const res = mockRes();

    await removePlayerFromGame(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
