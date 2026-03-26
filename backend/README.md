# Card Game Platform — Backend API

A REST API and real-time Socket.IO server for building and running turn-based card games. Supports card and deck creation, game lobbies, turn management, and live game state broadcasting — built with Node.js, Express, PostgreSQL, and Socket.IO.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Password hashing | bcrypt |
| DB client | node-postgres (pg) |
| Real-time | Socket.IO |
| Dev server | nodemon |
| Tests | Jest |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Install

```bash
npm install
```

### Environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://<your-pg-user>@localhost:5432/card_game_db
JWT_SECRET=your_secret_here
PORT=3001
```

### Database setup

Create the database once:

```bash
createdb card_game_db
psql card_game_db -f db/schema.sql
```

Seed with test data:

```bash
npm run seed
```

Reset and reseed (wipes all rows, restarts sequences):

```bash
npm run db:fresh
```

### Run

```bash
npm run dev    # development with auto-reload
npm start      # production
npm test       # run all tests
```

---

## Authentication

All routes except `POST /api/auth/register` and `POST /api/auth/login` require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned from the login and register endpoints. They do not expire automatically — use `POST /api/auth/refresh` to get a new one.

---

## Database Schema

### Users
Stores registered accounts. Passwords are stored as bcrypt hashes.

### Cards
Cards are the building blocks of the platform. Each card has a front face (`front_text`, `front_image_url`) and an optional back face (`back_text`, `back_image_url`). `default_copies` sets how many copies are included when a card is added to a deck. `is_unique` flags one-of-a-kind cards. `attributes` is a freeform JSONB field for game-specific effects (e.g. `{ "effect": "draw", "amount": 2 }`).

### Decks
A collection of cards owned by a user. `total_cards` and `unique_cards` are informational metadata. `shuffle_behaviour` (`shuffle_before_game`, `no_shuffle`) and `duplicate_handling` (`allow_duplicates`, `no_duplicates`) control how the deck behaves at game start.

### Deck Cards
Junction table linking decks to cards with a `quantity` override (overrides `default_copies` for that deck) and `card_order`.

### Games
A game session. `game_code` is a short alphanumeric code for joining. `status` is a PostgreSQL enum: `lobby`, `active`, or `ended`. `current_player_position` tracks whose turn it is, matching `player_position` in `game_players`. `game_state` is a freeform JSONB field for any extra state your game logic needs.

### Game Players
Links users to a game with their `player_position`, `score`, `is_active`, and `is_connected` flags.

### Player Hands
Cards currently held by a player in a game. Populated when the game deals or when a player draws.

### Session Draw Pile
The ordered draw deck for an active game session. `pile_order` determines draw sequence. `is_drawn` is set to `true` when a card is drawn so the order is preserved.

### Session Discard Pile
Cards that have been played. Can be reshuffled back into the draw pile by the host.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user. Returns token + user object. |
| POST | `/api/auth/login` | No | Log in. Returns token + user object. |
| GET | `/api/auth/me` | Yes | Returns the current user's profile. |
| PUT | `/api/auth/password` | Yes | Change password. Requires `currentPassword` and `newPassword`. |
| POST | `/api/auth/refresh` | Yes | Returns a fresh token. |

---

### Cards — `/api/cards`

Any authenticated user can create cards. Only the creator can update or delete them. A card cannot be deleted while it is in a deck.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cards` | Yes | List all cards. Supports `?limit`, `?offset`, `?created_by` query params. |
| GET | `/api/cards/:card_id` | Yes | Get a single card by ID including creator details. |
| POST | `/api/cards` | Yes | Create a card. `card_name` and `front_text` are required. |
| PUT | `/api/cards/:card_id` | Yes | Partial update. Creator only. |
| DELETE | `/api/cards/:card_id` | Yes | Delete a card. Creator only. Blocked if card is in any deck. |

**Card fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `card_name` | string | Yes | Max 100 characters |
| `front_text` | string | Yes | Main card text shown to player |
| `front_image_url` | string | No | Max 500 characters |
| `back_text` | string | No | Rules or flavour text on the reverse |
| `back_image_url` | string | No | Max 500 characters |
| `default_copies` | integer | No | Defaults to 1 |
| `is_unique` | boolean | No | Defaults to false |
| `attributes` | object | No | Freeform JSONB for game effects |

---

### Decks — `/api/decks`

Only the deck owner can update, delete, or modify the card list. Public decks (`is_public: true`) are readable by any authenticated user.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/decks` | Yes | List decks. Returns own decks plus public decks. Supports `?is_public=true`. |
| GET | `/api/decks/:deck_id` | Yes | Get a deck with its full card list. Private decks are owner-only. |
| POST | `/api/decks` | Yes | Create a deck. `deck_name` is required. |
| PUT | `/api/decks/:deck_id` | Yes | Partial update. Owner only. |
| DELETE | `/api/decks/:deck_id` | Yes | Delete a deck. Owner only. |
| POST | `/api/decks/:deck_id/cards` | Yes | Add a card to a deck. If the card already exists, quantity is updated. |
| DELETE | `/api/decks/:deck_id/cards/:card_id` | Yes | Remove a card from a deck. Owner only. |

**Deck fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `deck_name` | string | Yes | Max 100 characters |
| `description` | string | No | |
| `is_public` | boolean | No | Defaults to false |
| `total_cards` | integer | No | Informational metadata |
| `unique_cards` | integer | No | Informational metadata |
| `shuffle_behaviour` | string | No | `shuffle_before_game` (default) or `no_shuffle` |
| `duplicate_handling` | string | No | `allow_duplicates` (default) or `no_duplicates` |

**Add card to deck body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `card_id` | integer | Yes | Must be an existing card |
| `quantity` | integer | Yes | Must be greater than 0 |

---

### Games — `/api/games`

A game must be created before players join. The creator is automatically the host. Only participants in a game can read it.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/games` | Yes | List games the current user is part of. Supports `?active=true`. |
| GET | `/api/games/:game_id` | Yes | Get game details and player list. Participants only. |
| POST | `/api/games` | Yes | Create a game. `deck_id` is required. Host must own the deck. Generates a unique `game_code`. |
| PUT | `/api/games/:game_id/state` | Yes | Update the freeform `game_state` JSONB field. Any player. |
| PUT | `/api/games/:game_id/end` | Yes | Mark the game as ended (alternative to session/end). |
| POST | `/api/games/:game_id/players` | Yes | Add a player to the game. Pass `user_id` for a registered user or omit for a local player. |
| DELETE | `/api/games/:game_id/players/:game_player_id` | Yes | Remove a player. Host or the player themselves only. |

**Create game fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `deck_id` | integer | Yes | Host must own the deck |
| `is_online` | boolean | No | Defaults to false |
| `starting_hand_size` | integer | No | Defaults to 5 |
| `turn_direction` | string | No | `clockwise` (default) or `counterclockwise` |
| `deal_method` | string | No | `full_hand_at_start` (default) |

---

### Game Actions — `/api/games/:game_id/...`

These endpoints drive active gameplay. Turn-restricted actions (draw, play, pass) will return `403 It is not your turn` if called by the wrong player. Host-restricted actions (reshuffle, update score, end session) return `403` for non-host callers.

Run these in order for a complete game session:

| Step | Method | Endpoint | Auth | Who | Description |
|---|---|---|---|---|---|
| 1 | GET | `/api/games/:game_id/hand` | Yes | Any player | Get your current hand with full card details and `hand_id` values. |
| 2 | POST | `/api/games/:game_id/deal` | Yes | Any player | Deal starting hands to all players and move the rest into the draw pile. Sets status to `active`. |
| 3 | POST | `/api/games/:game_id/draw` | Yes | Current player | Draw the next card from the draw pile into your hand. Turn-restricted. |
| 4 | POST | `/api/games/:game_id/play` | Yes | Current player | Play a card from your hand to the discard pile. Requires `hand_id` in body. Turn-restricted. |
| 5 | POST | `/api/games/:game_id/pass` | Yes | Current player | Advance `current_player_position` to the next player. Wraps around. Turn-restricted. |
| 6 | POST | `/api/games/:game_id/reshuffle` | Yes | Host only | Shuffle all cards from the discard pile back into the draw pile with new random order. |
| 7 | PUT | `/api/games/:game_id/score` | Yes | Host only | Set a player's score. Requires `user_id` and `score` in body. |
| 8 | GET | `/api/games/:game_id/scores` | Yes | Any participant | Get all players ranked by score. Works on both active and ended games. |
| 9 | PUT | `/api/games/:game_id/session/end` | Yes | Host only | Set status to `ended` and record `ended_at` timestamp. |

**Play card body**

```json
{ "hand_id": 11 }
```

**Update score body**

```json
{ "user_id": 1, "score": 10 }
```

---

## Socket.IO

The server runs REST and WebSocket traffic on the same port. Socket.IO handles all real-time events — the REST endpoints do the database work and then broadcast the result to every connected player in the game room.

### Connection

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<jwt>' },      // same token from login/register
  transports: ['websocket'],
});
```

If the token is missing or invalid the connection is refused before it opens.

### Joining a room

Each game uses its `game_code` as the room name. A player must call `join_game` after connecting before they will receive any game events.

```js
socket.emit('join_game', { game_code: 'XK92F' });
```

The server checks that the user is an actual participant in that game. If not, an `error` event is returned and they are not added to the room.

### Events sent by the client

| Event | Payload | Description |
|---|---|---|
| `join_game` | `{ game_code }` | Join a game room. Must be called after connecting. |
| `leave_game` | `{ game_code }` | Leave a game room gracefully. |

All game actions (draw, play, pass, etc.) are still triggered via REST. The socket is receive-only for gameplay — you call the REST endpoint and the socket event arrives for everyone else.

### Events broadcast by the server

These are emitted to everyone currently in the game room.

| Event | Triggered by | Payload |
|---|---|---|
| `joined_game` | `join_game` emit (own socket only) | `{ game_code, game_id, status, player_position }` |
| `player_connected` | `join_game` emit | `{ user_id, username }` |
| `player_disconnected` | `leave_game` emit or browser tab close | `{ user_id, username }` |
| `player_joined` | `POST /games/:id/players` | `{ user_id, username, player_position }` |
| `player_left` | `DELETE /games/:id/players/:id` | `{ user_id, username }` |
| `game_started` | `POST /games/:id/deal` | `{ starting_hand_size, player_count }` |
| `card_drawn` | `POST /games/:id/draw` | `{ user_id, username }` — no card details to keep hands private |
| `card_played` | `POST /games/:id/play` | `{ user_id, username, card: { card_id, card_name, front_text, front_image_url, attributes } }` |
| `turn_passed` | `POST /games/:id/pass` | `{ current_player_position, turn_direction }` |
| `deck_reshuffled` | `POST /games/:id/reshuffle` | `{ count }` |
| `score_updated` | `PUT /games/:id/score` | `{ user_id, username, score }` |
| `game_ended` | `PUT /games/:id/session/end` | `{ ended_at, scores: [{ user_id, username, score, player_position }] }` |
| `error` | Any failed socket operation | `{ message }` |

### Listening to events

```js
socket.on('card_played', ({ user_id, username, card }) => {
  console.log(`${username} played ${card.card_name}`);
});

socket.on('turn_passed', ({ current_player_position }) => {
  // update whose turn indicator is shown in the UI
});

socket.on('game_ended', ({ scores }) => {
  // show final scoreboard
});
```

### Testing

Open `socket-test.html` (at the project root, one level above this folder) in two browser tabs — one per player. Connect each tab with its own JWT, join the same game code, then fire REST calls from Postman and watch events appear in real time across both tabs.

---

## Seed Data

Running `npm run seed` (or `npm run db:fresh`) inserts:

| Table | Rows | Notes |
|---|---|---|
| users | 3 | Passwords are bcrypt hashes of `password123` |
| cards | 6 | Mix of unique/non-unique, varying copies, various effect types |
| decks | 2 | Both owned by user 1, one public, one private |
| deck_cards | 11 | Both decks linked to various cards with quantity overrides |
| games | 1 | Code `XK92F`, status `lobby`, owned by user 1, uses deck 1 |
| game_players | 2 | User 1 (is_active true, position 1) and user 2 (position 2) |

Seed emails:
- `test1@example.com` — user 1, owns all seed cards, decks, and game
- `test2@example.com` — user 2, joined game 1
- `admin@example.com` — user 3, no game memberships

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Validation error or bad request |
| 401 | Missing or invalid token |
| 403 | Valid token but insufficient permission |
| 404 | Resource not found |
| 409 | Conflict (duplicate, card in use, etc.) |
| 500 | Internal server error |
