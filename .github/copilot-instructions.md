# AI Agent Instructions - Order Book Trading Game

## Project Overview
Educational single-page web application teaching limit order book mechanics and market microstructure. Self-contained HTML/CSS/JavaScript with no build process or external dependencies.

## Architecture & Key Concepts

### Single-File Design Pattern
The entire application lives in `index.html` with embedded styles and JavaScript. This intentional design makes it:
- Instantly deployable (just open in browser)
- Portable for classroom environments (no npm/server required)
- Easy for students to inspect and learn from

### State Management
- **localStorage**: Single source of truth (`orderBookGame` key)
- **Polling**: Every 2 seconds to enable multi-tab/device synchronization within same browser
- **State structure**: See `gameState` object (lines ~188-195 in `index.html`)
  - `players`: Maps name → {siblingCount, revealed}
  - `orders`: Array of limit orders with price-time priority
  - `trades`: Historical execution records
  - `positions`: Maps name → {quantity, totalCost, realizedPnL}

### Core Trading Logic

**"Tighten or Trade" Rule** (see `canPlaceOrder()` function):
- Bids must either: (1) exceed current best bid OR (2) cross the spread to execute
- Asks must either: (1) be below current best ask OR (2) cross the spread to execute
- This prevents "penny jumping" behind the market - KEY EDUCATIONAL CONCEPT

**Order Matching** (see `matchOrders()` function):
- Price-time priority: best price first, then timestamp
- Passive order price used for execution (maker price)
- Partial fills supported
- Immediate position updates with realized P&L calculation

**Position Tracking** (see `updatePosition()` function):
- FIFO cost basis for long positions
- Realized P&L calculated on position reduction
- Supports going from long → short in single trade

## File-Specific Guidance

### `index.html`
- **CSS Grid Layout**: 3-column responsive grid (`main-grid` class)
- **Color Coding**: Green=#00ff64 (bids), Red=#ff3232 (asks), Cyan=#00d4ff (accents)
- **DOM Updates**: All via `updateDisplay()` → calls 4 sub-update functions
- **Event Handlers**: All global functions (onclick in HTML elements)

### `ORDER_BOOK_GAME.md`
- User manual with step-by-step gameplay instructions
- Reference for understanding intended UX flow
- Contains pedagogical context for features

### `README.md`
- Quick-start guide and feature summary
- Link to detailed instructions in ORDER_BOOK_GAME.md

## Development Workflows

### Testing Multi-Device Sync
1. Open `index.html` in browser
2. Open second tab/window with same file
3. Changes sync every 2 seconds via localStorage polling
4. **Limitation**: Only works within single browser instance (localStorage is browser-scoped)

### No Build/Deploy Process
- Direct file:// protocol works
- For true multi-device: serve via simple HTTP server (e.g., `python -m http.server`)
- No compilation, transpilation, or bundling needed

### Optional Online Mode (Server-backed)
- Minimal Node.js server in `server/server.js` keeps a shared in-memory game state and broadcasts updates via SSE
- UIs:
  - Admin: `admin-remote.html` (served at `/admin`)
    - CSV bulk import: accepts `name,sibling_count` format (auto-detects headers)
    - Manual single player addition
    - Requires admin token (generated on server startup)
  - Client: `client-remote.html` (served at `/client`)
    - Order size fixed at 1 contract (hardcoded)
    - Players can only specify order type and price
- API surface (JSON):
  - `GET /api/state` → full `gameState`
  - `GET /api/events` (SSE) → pushes `{ type: 'state', state }` on every change
  - `POST /api/addPlayer { name, count }` (public - allows self-registration)
  - `POST /api/toggleReveal { name }` (requires admin token)
  - `POST /api/submitOrder { playerName, side, price, size }` (applies tighten-or-trade, matches, updates positions)
  - `POST /api/cancelOrders { playerName }`
  - `POST /api/reset {}` (requires admin token)
  - `POST /api/settle {}` (requires admin token)
- Source of truth moves from `localStorage` to the server. Clients subscribe to `/api/events` and re-render on each state push.
- Server binds to `0.0.0.0` for remote access; port configurable via `--port` flag or `PORT` env var

### Debugging
- All state in `localStorage.getItem('orderBookGame')`
- Console: `JSON.parse(localStorage.getItem('orderBookGame'))` to inspect
- `resetGame()` clears everything (requires confirmation)

## Project-Specific Conventions

### Code Style
- **Function Naming**: camelCase, descriptive verbs (updateDisplay, canPlaceOrder)
- **Comments**: Minimal - code should be self-documenting for educational purposes
- **No ES6 modules**: All vanilla JavaScript for maximum browser compatibility
- **Inline event handlers**: onclick attributes in HTML (not addEventListener)

### Data Flow Pattern
```
User Action → Validation → State Mutation → saveState() → updateDisplay()
```
Always follow this sequence - never update DOM directly without updating state first.

### Price Formatting
- Always use `.toFixed(2)` for price display
- Prices stored as floats internally
- Settlement price is integer (sum of sibling counts)

### Player Name as Primary Key
- Names must be unique (no validation currently)
- Case-sensitive matching
- Used to link orders, trades, positions, and player records

## Educational Context

This is a **teaching tool**, not production trading software. Design priorities:
1. **Transparency**: Students should be able to read the code
2. **Simplicity**: No frameworks, no abstractions, no tooling
3. **Immediacy**: Works instantly without setup

When modifying:
- Preserve the single-file structure
- Keep dependencies at zero
- Maintain visual clarity (large fonts, high contrast colors)
- Don't add complexity that obscures the core concepts

## Common Modifications

### Adding New Order Types
- Extend `orderType` select options
- Update `canPlaceOrder()` validation logic
- Modify `matchOrders()` crossing logic

### Changing Settlement Logic
- Settlement price calculation in `settleContract()` function
- Currently: sum of all sibling counts
- P&L realization happens during settlement loop

### UI Enhancements
- All styles in `<style>` tag
- Grid layouts use CSS Grid (not flexbox)
- Responsive breakpoint at 1200px
- Color palette: background=#1a1a2e, panel=#16213e, border=#0f3460

## Key Files & Line References
- **State management**: Lines 188-328 (gameState through saveState)
- **Order validation**: Lines 404-430 (canPlaceOrder function)
- **Order matching**: Lines 433-495 (matchOrders function)
- **Position logic**: Lines 498-544 (updatePosition function)
- **UI updates**: Lines 691-838 (updateDisplay and sub-functions)
