# Card Game Platform

A full-stack web application for hosting and playing custom card games in real time. Players can design their own cards, build decks with custom rules, and host or join multiplayer sessions — all from a mobile-friendly browser interface.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Seeding the Database](#seeding-the-database)
- [Running Tests](#running-tests)
- [API Overview](#api-overview)
- [Socket Events](#socket-events)
- [Test Accounts](#test-accounts)

---

## Features

- **Custom card designer** — Create cards with front/back text, images (including HEIC from iPhone), and custom attributes
- **Deck builder** — Build decks with rules for shuffle behaviour, duplicate handling, and discard pile visibility
- **Multiplayer lobbies** — Host a game with a shareable 6-character code; players join by code
- **Real-time gameplay** — Live turn management, draw/play/pass actions, board placement, and score tracking via Socket.IO
- **Guest access** — Players can join a game without registering using a guest token
- **Drag-and-drop board** — Cards can be dragged from hand onto a shared game board; board cards are repositionable
- **Host controls** — Hosts can adjust turns, reshuffle the deck, update scores, and end the session

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, dnd-kit |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Real-time | Socket.IO |
| Auth | JWT (localStorage for users, sessionStorage for guests) |
| Image processing | Multer, Sharp (HEIC to JPEG conversion) |
| Testing | Jest, Supertest |

---

## Project Structure

```
card-game-platform/
├── backend/
│   ├── controllers/        # Route handler logic
│   ├── db/                 # PostgreSQL pool, schema, migrations, seed
│   ├── middleware/         # JWT auth, file upload (Multer + Sharp)
│   ├── routes/             # Express routers
│   ├── socket/             # Socket.IO init, auth middleware, event handlers
│   ├── server.js           # Express app + Socket.IO bootstrap
│   └── .env                # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── api/            # Thin fetch wrapper
│   │   ├── components/     # Reusable UI, card, game, and layout components
│   │   ├── context/        # AuthContext, SocketContext
│   │   ├── pages/          # One component per route
│   │   └── utils/          # JWT decode helper
│   └── vite.config.js
├── uploads/                # User-uploaded card images (gitignored)
└── socket-test.html        # Manual Socket.IO test page
```

---

## Prerequisites

Make sure the following are installed before you begin:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9 or later (comes with Node.js)
- **PostgreSQL** v14 or later — [postgresql.org](https://www.postgresql.org)

To verify your versions:

```bash
node -v
npm -v
psql --version
```

---

## Environment Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd card-game-platform
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Create the backend environment file

In the `backend/` directory, create a file named `.env`:

```bash
cd ../backend
touch .env
```

Open `.env` and add the following — replacing placeholder values with your own:

```env
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=card_game_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://your_postgres_username:your_postgres_password@localhost:5432/card_game_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server port
PORT=3001
```

> **Note:** `JWT_SECRET` can be any long random string. You can generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Database Setup

### 1. Create the database

Open a terminal and connect to PostgreSQL:

```bash
psql -U your_postgres_username
```

Inside the psql prompt:

```sql
CREATE DATABASE card_game_db;
\q
```

### 2. Run the schema

From the `backend/` directory:

```bash
psql -U your_postgres_username -d card_game_db -f db/schema.sql
```

This creates all tables: `users`, `decks`, `cards`, `deck_cards`, `user_decks`, `games`, `game_players`, `player_hands`, `session_draw_pile`, and `session_discard_pile`.

### 3. Seed the database

The seed script populates test users and several starter decks (Standard Playing Cards, Uno, Animal Charades, World Capitals Flashcards, and more):

```bash
npm run seed
```

Or equivalently:

```bash
node db/seed.js
```

To reset and re-seed from scratch (drops all data and re-runs):

```bash
npm run db:fresh
```

---

## Running the Application

You need to run the backend and frontend in **two separate terminal windows**.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

The backend server starts on **http://localhost:3001** by default. You should see:

```
Server running on port 3001
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

The frontend dev server starts on **http://localhost:5173** by default. Open this URL in your browser.

> **Local network testing (e.g. mobile device on the same Wi-Fi):**
> The backend CORS configuration automatically allows requests from `192.168.x.x` and `10.x.x.x` subnets in development, so you can open the frontend from another device on the same network. The frontend reads `window.location.hostname` at runtime so no hardcoded URLs need changing.

---

## Seeding the Database

The seed script (`backend/db/seed.js`) does the following in one pass:

1. Drops and recreates all tables (full reset)
2. Creates three test user accounts (see [Test Accounts](#test-accounts) below)
3. Creates a system seed user that owns the starter decks
4. Seeds five decks with their full card sets:
   - Standard 52-card playing cards
   - Uno deck
   - Charades deck
   - Animal Charades deck
   - World Capitals Flashcards
5. Assigns "Standard Playing Cards" and "Animal Charades" to every user's deck library and copies their cards into each user's personal card library

Run from the `backend/` directory:

```bash
npm run seed
```

---

## Running Tests

The test suite uses **Jest** and **Supertest**. All tests hit the real database (no mocks), so make sure the database is running and the `.env` file is configured before running tests.

From the `backend/` directory:

```bash
npm test
```

To run with verbose output:

```bash
npm test -- --verbose
```

### What is tested

The suite contains **8 test suites** and **200 tests** covering:

| Suite | What it covers |
|---|---|
| Auth | Register, login, getMe, refresh token, guest token |
| Cards | Create, read, update, delete, pagination |
| Decks | Create, read, update, delete, card membership |
| Games | Create game (code collision retry), join by code, get game state |
| Game Actions | Deal, draw, play, pass turn, reshuffle, board placement |
| Socket Handlers | join_game, leave_game, disconnect events |
| Upload | Image upload, HEIC conversion, JWT-protected access |
| Scores | Read and update player scores |

---

## API Overview

The backend exposes **38 REST endpoints** across five routers. All endpoints except auth routes require a valid JWT in the `Authorization: Bearer <token>` header.

### Auth (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register a new user (assigns starter decks) |
| POST | `/login` | Log in and receive a JWT |
| GET | `/me` | Get the authenticated user's profile |
| PUT | `/password` | Update password |
| POST | `/refresh` | Refresh an expiring token |
| POST | `/guest` | Create a guest session token (stored in sessionStorage) |

### Cards (`/api/cards`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List user's cards (paginated, max 100) |
| POST | `/` | Create a new card |
| PUT | `/:cardId` | Update a card |
| DELETE | `/:cardId` | Delete a card (blocked if in a deck) |

### Decks (`/api/decks`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List user's decks (own + library) |
| POST | `/` | Create a new deck |
| GET | `/:deckId` | Get a deck with its cards |
| PUT | `/:deckId` | Update deck settings |
| DELETE | `/:deckId` | Delete (owner) or remove from library |
| POST | `/:deckId/cards` | Add or update a card in a deck |
| DELETE | `/:deckId/cards/:cardId` | Remove a card from a deck |

### Games (`/api/games`)
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create a game (generates unique 6-char code) |
| GET | `/:gameId` | Get game state + players + discard top |
| POST | `/join` | Join a game by code |
| POST | `/:gameId/players` | Add the current user as a player |
| POST | `/:gameId/deal` | Shuffle and deal starting hands |
| POST | `/:gameId/draw` | Draw a card |
| POST | `/:gameId/play` | Play a card to the discard pile |
| POST | `/:gameId/pass` | Pass the turn |
| POST | `/:gameId/reshuffle` | Return discard pile to draw pile |
| PUT | `/:gameId/turn` | Set the current player (host only) |
| GET | `/:gameId/hand` | Get the authenticated player's hand |
| POST | `/:gameId/board` | Place a card on the shared board |
| GET | `/:gameId/scores` | Get all player scores |
| PUT | `/:gameId/score` | Update a player's score |
| PUT | `/:gameId/state` | Write arbitrary state to game_state JSON column |
| PUT | `/:gameId/session/end` | End the game session |

### Upload (`/api/upload`)
| Method | Path | Description |
|---|---|---|
| POST | `/` | Upload a card image (HEIC converted to JPEG automatically) |
| GET | `/:filename` | Retrieve an uploaded image (requires valid JWT) |

---

## Socket Events

The backend uses Socket.IO on the same port as the HTTP server. All socket connections require a valid JWT passed as `auth.token` during handshake.

### Client emits

| Event | Payload | Description |
|---|---|---|
| `join_game` | `{ game_code }` | Join a game room |
| `leave_game` | `{ game_code }` | Leave a game room |

### Server emits (to room)

| Event | Payload | Description |
|---|---|---|
| `joined_game` | `{ game_code, status, player_position }` | Confirms the requesting client joined |
| `player_joined` | `{ user_id, game_player_id, username, player_position }` | Another player joined the lobby |
| `player_left` | `{ user_id, game_player_id }` | A player left the lobby |
| `player_connected` | `{ game_player_id }` | A player's socket reconnected |
| `player_disconnected` | `{ game_player_id, username }` | A player's socket disconnected |
| `game_started` | (none) | Host started the game |
| `card_drawn` | `{ user_id, username }` | A player drew a card |
| `card_played` | `{ user_id, username, card }` | A player played a card to the discard pile |
| `turn_passed` | `{ current_player_position }` | The turn moved to a new player |
| `deck_reshuffled` | `{ count }` | The discard pile was returned to the draw pile |
| `board_card_placed` | `{ user_id, username, card_name }` | A player placed a card on the board |
| `score_updated` | `{ user_id, score }` | A player's score was updated |
| `game_ended` | (none) | The host ended the session |

---

## Test Accounts

After running `npm run seed`, the following accounts are available for testing:

| Username | Email | Password |
|---|---|---|
| testuser1 | test1@example.com | password123 |
| testuser2 | test2@example.com | password123 |
| admin | admin@example.com | adminpass123 |

Each test account has "Standard Playing Cards" and "Animal Charades" pre-assigned to their deck library with full card copies in their card library.

---

## Notes

- The `uploads/` directory stores card images on disk. It is gitignored. You should recreate it locally if it does not exist:
  ```bash
  mkdir -p backend/uploads
  ```
- HEIC images uploaded from iPhones are automatically converted to JPEG using Sharp before being saved.
- The frontend proxies API requests to `http://localhost:3001` in development via Vite's proxy config. No CORS issues arise in local dev.
- Guest sessions are stored in `sessionStorage` and are cleared when the browser tab is closed. Registered user tokens are stored in `localStorage`.
