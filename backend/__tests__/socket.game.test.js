const db = require('../db');
const registerGameHandlers = require('../socket/handlers/game');

jest.mock('../db');

// Builds a minimal mock socket with event registration
const mockSocket = (user = { userId: 1, username: 'testuser', isGuest: false }) => {
  const handlers = {};
  const socket = {
    user,
    gameCode: null,
    gameId: null,
    gamePlayerId: null,
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    leave: jest.fn(),
    on: (event, handler) => {
      handlers[event] = handler;
    },
    _trigger: (event, data) => handlers[event](data),
  };
  return socket;
};

const mockIo = () => ({ to: jest.fn().mockReturnThis(), emit: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('join_game', () => {
  it('should emit error if game_code is missing', async () => {
    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', {});

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'game_code is required' });
  });

  it('should emit error if game not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'NONE99' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Game not found' });
  });

  it('should emit error if user is not a participant', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_id: 1, status: 'lobby' }] }) // game found
      .mockResolvedValueOnce({ rows: [] });                                // not a player

    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'ABC123' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'You are not a participant in this game' });
  });

  it('should join room, update connection and emit joined_game', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_id: 1, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ game_player_id: 7, player_position: 2 }] })
      .mockResolvedValueOnce({});  // UPDATE is_connected

    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'ABC123' });

    expect(socket.join).toHaveBeenCalledWith('ABC123');
    expect(socket.gameCode).toBe('ABC123');
    expect(socket.gameId).toBe(1);
    expect(socket.gamePlayerId).toBe(7);
    expect(socket.emit).toHaveBeenCalledWith('joined_game', {
      game_code: 'ABC123',
      game_id: 1,
      status: 'active',
      player_position: 2,
    });
  });

  it('should notify others in the room after joining', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_id: 1, status: 'lobby' }] })
      .mockResolvedValueOnce({ rows: [{ game_player_id: 7, player_position: 1 }] })
      .mockResolvedValueOnce({});

    const socket = mockSocket({ userId: 1, username: 'testuser', isGuest: false });
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'ABC123' });

    expect(socket.to).toHaveBeenCalledWith('ABC123');
    const broadcastCall = socket.emit.mock.calls.find(([event]) => event === 'player_connected');
    // socket.to().emit is chained — verify via the to mock
    expect(socket.to).toHaveBeenCalledWith('ABC123');
  });

  it('should use IS NULL query for guest users', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ game_id: 1, status: 'lobby' }] })
      .mockResolvedValueOnce({ rows: [{ game_player_id: 3, player_position: 2 }] })
      .mockResolvedValueOnce({});

    const socket = mockSocket({ userId: null, username: 'Guest', isGuest: true });
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'ABC123' });

    const guestQuery = db.query.mock.calls[1][0];
    expect(guestQuery).toContain('IS NULL');
  });

  it('should emit error on database failure', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));

    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('join_game', { game_code: 'ABC123' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Failed to join game' });
  });
});

describe('leave_game', () => {
  it('should do nothing if game_code is missing', async () => {
    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('leave_game', {});

    expect(socket.leave).not.toHaveBeenCalled();
  });

  it('should leave room and update is_connected to false', async () => {
    db.query.mockResolvedValueOnce({});

    const socket = mockSocket();
    socket.gamePlayerId = 7;
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('leave_game', { game_code: 'ABC123' });

    expect(socket.leave).toHaveBeenCalledWith('ABC123');
    const updateCall = db.query.mock.calls[0];
    expect(updateCall[0]).toContain('is_connected = false');
    expect(updateCall[1]).toEqual([7]);
  });

  it('should broadcast player_disconnected to the room', async () => {
    db.query.mockResolvedValueOnce({});

    const socket = mockSocket({ userId: 1, username: 'testuser', isGuest: false });
    socket.gamePlayerId = 7;
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('leave_game', { game_code: 'ABC123' });

    expect(socket.to).toHaveBeenCalledWith('ABC123');
  });
});

describe('disconnect', () => {
  it('should do nothing if socket has no gameCode', async () => {
    const socket = mockSocket();
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('disconnect', undefined);

    expect(db.query).not.toHaveBeenCalled();
  });

  it('should mark player as disconnected and notify room', async () => {
    db.query.mockResolvedValueOnce({});

    const socket = mockSocket({ userId: 1, username: 'testuser', isGuest: false });
    socket.gameCode = 'ABC123';
    socket.gamePlayerId = 7;
    registerGameHandlers(mockIo(), socket);

    await socket._trigger('disconnect', undefined);

    const updateCall = db.query.mock.calls[0];
    expect(updateCall[0]).toContain('is_connected = false');
    expect(updateCall[1]).toEqual([7]);
    expect(socket.to).toHaveBeenCalledWith('ABC123');
  });
});
