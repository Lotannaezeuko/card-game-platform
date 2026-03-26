// Gameplay socket handlers
// These are NOT triggered by the client directly for game actions.
// The REST endpoints handle all DB writes, then call these emitters
// via req.app.get('io') to broadcast the result to the room.
//
// This file exports the emitter functions used by the controllers.

const emitGameStarted = (io, game_code, data) => {
  io.to(game_code).emit('game_started', data);
};

const emitCardDrawn = (io, game_code, data) => {
  // Broadcast to everyone except the drawing player — they already
  // have the full card from the REST response.
  // data does NOT include card details to avoid revealing other players' draws.
  io.to(game_code).emit('card_drawn', {
    user_id: data.user_id,
    username: data.username,
  });
};

const emitCardPlayed = (io, game_code, data) => {
  // data: { user_id, username, card }  — full card visible to all since it's discarded
  io.to(game_code).emit('card_played', data);
};

const emitTurnPassed = (io, game_code, data) => {
  // data: { current_player_position, turn_direction }
  io.to(game_code).emit('turn_passed', data);
};

const emitReshuffle = (io, game_code, data) => {
  // data: { count }
  io.to(game_code).emit('deck_reshuffled', data);
};

const emitScoreUpdated = (io, game_code, data) => {
  // data: { user_id, username, score }
  io.to(game_code).emit('score_updated', data);
};

const emitGameEnded = (io, game_code, data) => {
  // data: { ended_at, scores: [{ user_id, username, score, player_position }] }
  io.to(game_code).emit('game_ended', data);
};

const emitPlayerJoined = (io, game_code, data) => {
  // data: { user_id, username, player_position }
  io.to(game_code).emit('player_joined', data);
};

const emitPlayerLeft = (io, game_code, data) => {
  // data: { user_id, username }
  io.to(game_code).emit('player_left', data);
};

module.exports = {
  emitGameStarted,
  emitCardDrawn,
  emitCardPlayed,
  emitTurnPassed,
  emitReshuffle,
  emitScoreUpdated,
  emitGameEnded,
  emitPlayerJoined,
  emitPlayerLeft,
};
