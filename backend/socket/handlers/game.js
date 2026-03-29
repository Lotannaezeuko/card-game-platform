const db = require('../../db');

const registerGameHandlers = (io, socket) => {
  // Join a game room using the game code
  // Client emits: { game_code }
  socket.on('join_game', async ({ game_code }) => {
    try {
      if (!game_code) {
        return socket.emit('error', { message: 'game_code is required' });
      }

      const gameResult = await db.query(
        'SELECT game_id, status FROM games WHERE game_code = $1',
        [game_code]
      );

      if (gameResult.rows.length === 0) {
        return socket.emit('error', { message: 'Game not found' });
      }

      const { game_id, status } = gameResult.rows[0];

      // For guests (userId is null), use IS NULL to match in SQL
      const isGuest = socket.user.isGuest === true;
      let playerCheck;

      if (isGuest) {
        playerCheck = await db.query(
          'SELECT game_player_id, player_position FROM game_players WHERE game_id = $1 AND user_id IS NULL ORDER BY joined_at DESC LIMIT 1',
          [game_id]
        );
      } else {
        playerCheck = await db.query(
          'SELECT game_player_id, player_position FROM game_players WHERE game_id = $1 AND user_id = $2',
          [game_id, socket.user.userId]
        );
      }

      if (playerCheck.rows.length === 0) {
        return socket.emit('error', { message: 'You are not a participant in this game' });
      }

      const gamePlayerId = playerCheck.rows[0].game_player_id;

      socket.join(game_code);
      socket.gameCode = game_code;
      socket.gameId = game_id;
      socket.gamePlayerId = gamePlayerId;

      await db.query(
        'UPDATE game_players SET is_connected = true WHERE game_player_id = $1',
        [gamePlayerId]
      );

      socket.emit('joined_game', {
        game_code,
        game_id,
        status,
        player_position: playerCheck.rows[0].player_position,
      });

      // Notify others in the room
      socket.to(game_code).emit('player_connected', {
        user_id: socket.user.userId,
        game_player_id: gamePlayerId,
        username: socket.user.username,
      });
    } catch (err) {
      console.error('join_game error:', err);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Leave a game room
  socket.on('leave_game', async ({ game_code }) => {
    if (!game_code) return;

    socket.leave(game_code);

    if (socket.gamePlayerId) {
      await db.query(
        'UPDATE game_players SET is_connected = false WHERE game_player_id = $1',
        [socket.gamePlayerId]
      );
    }

    socket.to(game_code).emit('player_disconnected', {
      user_id: socket.user.userId,
      game_player_id: socket.gamePlayerId,
      username: socket.user.username,
    });
  });

  // Handle disconnect — mark player as not connected in any active game they were in
  socket.on('disconnect', async () => {
    if (!socket.gameCode || !socket.gamePlayerId) return;

    await db.query(
      'UPDATE game_players SET is_connected = false WHERE game_player_id = $1',
      [socket.gamePlayerId]
    );

    socket.to(socket.gameCode).emit('player_disconnected', {
      user_id: socket.user.userId,
      game_player_id: socket.gamePlayerId,
      username: socket.user.username,
    });
  });
};

module.exports = registerGameHandlers;
