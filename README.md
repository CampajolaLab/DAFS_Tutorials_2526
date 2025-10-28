# DAFS_Tutorials_2526

## Order Book Trading Game

An interactive educational tool for teaching limit order book mechanics.

**[Open the Game](index.html)** | **[Read the Instructions](ORDER_BOOK_GAME.md)**

### Online (Server) Mode
This repo now includes an optional tiny Node.js server for multi-user play over the internet. It keeps a shared in-memory game state and pushes updates to all connected clients in real-time via Server-Sent Events.

Quick start on a machine with Node.js installed:

1. Start the server
   ```bash
   cd server
   node server.js
   # Or specify a custom port:
   node server.js --port 3000
   # Or via environment variable:
   PORT=3000 node server.js
   ```
   **Important:** The server generates a random admin token on startup and displays it in the console. Copy this token - you'll need it to access admin features.

2. Open the Admin UI (on the server machine or remotely)
   - http://<server-host>:8080/admin
   - When prompted, paste the admin token from the server console
   - The token is saved in your browser session (sessionStorage)

3. Share the Client URL with players
   - http://<server-host>:8080/client
   - Players don't need the admin token (they can only submit/cancel orders)

**CSV Bulk Import:**
The admin UI supports importing multiple players from a CSV file. Format:
```csv
name,sibling_count
Alice,2
Bob,3
Charlie,1
```
- First row can be a header (will be auto-detected and skipped)
- Each subsequent row: player name, sibling count (comma-separated)
- See `sample_players.csv` for an example
- **Note:** Players can also self-register via the client login screen

**Player Order Constraints:**
- Client UI automatically fixes order size to **1 contract** per order
- Players can only specify order type (bid/ask) and price

**Player Login:**
- Players must login with their name and sibling count before trading
- During login, they automatically register with the server (if not already registered)
- Name is locked after login (can't be changed during active game)
- Login persists in browser session (survive page refresh)
- Players are automatically logged out when game is reset
- Optional logout button available if player wants to change identity

Notes
- **Security:** Admin-only endpoints (toggle reveal, reset, settle) require the admin token via `Authorization: Bearer <token>` header
- **Player registration** is public (no token needed) to allow self-registration from client UI
- **Port selection:** Default is 8080; override with `--port` flag or `PORT` environment variable
- No external dependencies are required for the server (built-in Node modules only)
- State is in-memory; restarting the server clears the game and generates a new admin token
- Admin and Client UIs are single-file pages (`admin-remote.html`, `client-remote.html`) that talk to the server via `/api/*` and receive live updates via `/api/events`### Features
- Real-time limit order book with bid/offer display
- "Tighten or trade" rule enforcement
- Player position tracking and P&L calculation
- Admin panel for game management
- Contract settlement based on sibling counts
- Multi-device synchronization via localStorage
  - For true internet multi-user play, use the included Node server (Online Mode)

### Quick Start
1. Open `index.html` in your web browser
2. Add players with their sibling counts (Admin Panel)
3. Players submit bid/ask orders (Player Controls)
4. Reveal sibling counts progressively
5. Settle the contract to calculate final P&L

See [ORDER_BOOK_GAME.md](ORDER_BOOK_GAME.md) for detailed instructions.