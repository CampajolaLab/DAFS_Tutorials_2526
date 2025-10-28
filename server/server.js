// Minimal server with in-memory game state and SSE broadcasting
// No external dependencies (Node built-ins only)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Parse command line args for port (e.g., node server.js --port 3000)
function parseArgs() {
  const args = process.argv.slice(2);
  let port = process.env.PORT || 8080;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      if (isNaN(port)) port = 8080;
    }
  }
  return { port };
}

const { port: PORT } = parseArgs();

// Generate random admin token on startup
const ADMIN_TOKEN = crypto.randomBytes(16).toString('hex');
console.log('\n' + '='.repeat(60));
console.log('ADMIN TOKEN (save this for admin UI):');
console.log(ADMIN_TOKEN);
console.log('='.repeat(60) + '\n');

// --- In-memory Game State (same shape as client) ---
let gameState = {
  players: {},        // { name: { siblingCount: number, revealed: boolean } }
  orders: [],         // [{ id, player, side: 'bid'|'ask', price:number, size:number, timestamp:number }]
  trades: [],         // [{ id, buyer, seller, price, size, timestamp }]
  positions: {},      // { name: { quantity:number, totalCost:number, realizedPnL:number } }
  orderIdCounter: 1,
  settledPrice: null,
  turnOrder: [],      // [playerName1, playerName2, ...] - order of turns
  currentTurnIndex: -1, // -1 = no active turn, otherwise index in turnOrder
  priceHistory: [],   // [{ turn: number, midPrice: number|null }] - midprice after each turn
};
let version = 1; // monotonic version for clients (optional)

// --- SSE Clients ---
const sseClients = new Set();
function broadcastState() {
  const payload = `data: ${JSON.stringify({ type: 'state', version, state: gameState })}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (_) { /* ignore */ }
  }
}

// --- Helpers ---
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function notFound(res) { res.writeHead(404); res.end('Not found'); }

function unauthorized(res) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized - invalid admin token' }));
}

function checkAdminAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === ADMIN_TOKEN;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// --- Trading Logic (ported from index.html) ---
function getBestBidAsk() {
  const bids = gameState.orders.filter(o => o.side === 'bid').sort((a, b) => b.price - a.price || a.id - b.id);
  const asks = gameState.orders.filter(o => o.side === 'ask').sort((a, b) => a.price - b.price || a.id - b.id);
  return {
    bestBid: bids.length ? bids[0].price : null,
    bestAsk: asks.length ? asks[0].price : null,
  };
}

function getMidPrice() {
  const { bestBid, bestAsk } = getBestBidAsk();
  if (bestBid !== null && bestAsk !== null) {
    return (bestBid + bestAsk) / 2;
  }
  return null;
}

function capturePriceHistory() {
  // Only capture if turn-based mode is active
  if (gameState.turnOrder.length > 0 && gameState.currentTurnIndex >= 0) {
    const turnNumber = gameState.priceHistory.length + 1;
    const midPrice = getMidPrice();
    gameState.priceHistory.push({ turn: turnNumber, midPrice });
  }
}

function canPlaceOrder(side, price) {
  const { bestBid, bestAsk } = getBestBidAsk();
  if (side === 'bid') {
    if (bestBid === null) return true;
    if (price > bestBid) return true;
    if (bestAsk !== null && price >= bestAsk) return true;
    return false;
  } else {
    if (bestAsk === null) return true;
    if (price < bestAsk) return true;
    if (bestBid !== null && price <= bestBid) return true;
    return false;
  }
}

function ensurePosition(name) {
  if (!gameState.positions[name]) {
    gameState.positions[name] = { quantity: 0, totalCost: 0, realizedPnL: 0, cash: 0 };
  }
  // Ensure cash field exists (for backwards compatibility with existing positions)
  if (gameState.positions[name].cash === undefined) {
    gameState.positions[name].cash = 0;
  }
}

function updatePosition(player, quantity, price) {
  ensurePosition(player);
  const pos = gameState.positions[player];
  
  // Cash flow: buying decreases cash, selling increases cash
  const cashBefore = pos.cash;
  pos.cash -= quantity * price;
  console.log(`[CASH] ${player}: ${cashBefore.toFixed(2)} -> ${pos.cash.toFixed(2)} (qty=${quantity}, price=${price})`);
  
  if (quantity > 0) {
    // Buying
    pos.totalCost += quantity * price;
    pos.quantity += quantity;
  } else {
    // Selling
    const sellSize = Math.abs(quantity);
    if (pos.quantity > 0) {
      const avgCost = pos.totalCost / pos.quantity;
      const closedSize = Math.min(sellSize, pos.quantity);
      const pnl = closedSize * (price - avgCost);
      pos.realizedPnL += pnl;
      pos.quantity -= closedSize;
      pos.totalCost -= closedSize * avgCost;
      if (sellSize > closedSize) {
        const shortSize = sellSize - closedSize;
        pos.quantity -= shortSize;
        pos.totalCost -= shortSize * price;
      }
    } else {
      pos.quantity -= sellSize;
      pos.totalCost -= sellSize * price;
    }
  }
}

function matchOrders(newOrder) {
  const trades = [];
  let remaining = newOrder.size;
  const opposite = gameState.orders
    .filter(o => o.side !== newOrder.side)
    .filter(o => newOrder.side === 'bid' ? (o.price <= newOrder.price) : (o.price >= newOrder.price))
    .sort((a, b) => {
      if (newOrder.side === 'bid') return a.price - b.price || a.id - b.id; // best ask first
      return b.price - a.price || a.id - b.id; // best bid first
    });

  for (const order of opposite) {
    if (remaining <= 0) break;
    const tradeSize = Math.min(remaining, order.size);
    const tradePrice = order.price; // passive price
    const trade = {
      id: gameState.trades.length + 1,
      buyer: newOrder.side === 'bid' ? newOrder.player : order.player,
      seller: newOrder.side === 'bid' ? order.player : newOrder.player,
      price: tradePrice,
      size: tradeSize,
      timestamp: Date.now(),
    };
    trades.push(trade);
    gameState.trades.push(trade);
    console.log(`[TRADE] ${trade.buyer} buys from ${trade.seller} @ ${tradePrice} x ${tradeSize}`);
    updatePosition(trade.buyer, tradeSize, tradePrice);
    updatePosition(trade.seller, -tradeSize, tradePrice);
    console.log(`[POSITIONS] Buyer: ${JSON.stringify(gameState.positions[trade.buyer])}, Seller: ${JSON.stringify(gameState.positions[trade.seller])}`);
    order.size -= tradeSize;
    remaining -= tradeSize;
    if (order.size === 0) {
      gameState.orders = gameState.orders.filter(o => o.id !== order.id);
    }
  }

  if (remaining > 0) {
    newOrder.size = remaining;
    gameState.orders.push(newOrder);
  }
  return trades;
}

function settleContract() {
  const totalSiblings = Object.values(gameState.players).reduce((sum, p) => sum + p.siblingCount, 0);
  if (totalSiblings === 0) return { error: 'No players added yet' };
  gameState.settledPrice = totalSiblings;
  
  console.log(`[SETTLEMENT] Contract settling at price ${totalSiblings}`);
  
  for (const name of Object.keys(gameState.positions)) {
    const pos = gameState.positions[name];
    if (pos.quantity !== 0) {
      // Calculate P&L on position
      const avgPrice = pos.quantity > 0 ? pos.totalCost / pos.quantity : -pos.totalCost / Math.abs(pos.quantity);
      const unrealizedPnL = pos.quantity * (totalSiblings - avgPrice);
      pos.realizedPnL += unrealizedPnL;
      
      // Cash settlement: receive cash for position value at settlement price
      // Long position: receive quantity * settledPrice
      // Short position: pay quantity * settledPrice (negative quantity means paying)
      const settlementCash = pos.quantity * totalSiblings;
      pos.cash += settlementCash;
      
      console.log(`[SETTLEMENT] ${name}: position=${pos.quantity}, settlementCash=${settlementCash.toFixed(2)}, finalCash=${pos.cash.toFixed(2)}`);
      
      // Clear position
      pos.quantity = 0;
      pos.totalCost = 0;
    }
  }
  
  return { settledPrice: totalSiblings };
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url, true);

  // Static files
  if (req.method === 'GET' && (pathname === '/' || pathname === '/admin' || pathname === '/client')) {
    const file = pathname === '/client' ? 'client-remote.html' : 'admin-remote.html';
    const filePath = path.join(__dirname, '..', file);
    fs.readFile(filePath, (err, data) => {
      if (err) return notFound(res);
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end(data);
    });
    return;
  }

  // Serve other assets if needed
  if (req.method === 'GET' && pathname.endsWith('.html')) {
    const filePath = path.join(__dirname, '..', pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) return notFound(res);
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end(data);
    });
    return;
  }

  // SSE events
  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`retry: 2000\n\n`);
    sseClients.add(res);
    // send initial state
    res.write(`data: ${JSON.stringify({ type: 'state', version, state: gameState })}\n\n`);
    req.on('close', () => { sseClients.delete(res); });
    return;
  }

  // API: get state
  if (req.method === 'GET' && pathname === '/api/state') {
    return sendJSON(res, 200, { version, state: gameState });
  }

  // API: add player (public - no auth required for self-registration)
  if (req.method === 'POST' && pathname === '/api/addPlayer') {
    try {
      const { name, count } = await readBody(req);
      if (!name || typeof count !== 'number' || count < 0) return sendJSON(res, 400, { error: 'Invalid input' });
      gameState.players[name] = { siblingCount: count, revealed: false };
      if (!gameState.positions[name]) gameState.positions[name] = { quantity: 0, totalCost: 0, realizedPnL: 0 };
      version++;
      sendJSON(res, 200, { ok: true });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: toggle reveal
  if (req.method === 'POST' && pathname === '/api/toggleReveal') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      const { name } = await readBody(req);
      if (!name || !gameState.players[name]) return sendJSON(res, 400, { error: 'Invalid player' });
      gameState.players[name].revealed = !gameState.players[name].revealed;
      version++;
      sendJSON(res, 200, { ok: true });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: submit order
  if (req.method === 'POST' && pathname === '/api/submitOrder') {
    try {
      const { playerName, side, price, size } = await readBody(req);
      if (!playerName || !['bid', 'ask'].includes(side)) return sendJSON(res, 400, { error: 'Invalid side/name' });
      const p = Number(price), s = Number(size);
      if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(s) || s <= 0) return sendJSON(res, 400, { error: 'Invalid price/size' });
      if (!Number.isInteger(p)) return sendJSON(res, 400, { error: 'Price must be an integer' });
      
      // Check turn-based mode
      if (gameState.turnOrder.length > 0 && gameState.currentTurnIndex >= 0) {
        const currentPlayer = gameState.turnOrder[gameState.currentTurnIndex];
        if (playerName !== currentPlayer) {
          return sendJSON(res, 400, { error: 'Not your turn', currentPlayer });
        }
      }
      
      // tighten or trade rule
      if (!canPlaceOrder(side, p)) {
        const { bestBid, bestAsk } = getBestBidAsk();
        return sendJSON(res, 400, { error: 'Tighten or trade', bestBid, bestAsk });
      }
      ensurePosition(playerName);
      const order = { id: gameState.orderIdCounter++, player: playerName, side, price: p, size: s, timestamp: Date.now() };
      const trades = matchOrders(order);
      
      // Advance turn if in turn-based mode
      if (gameState.turnOrder.length > 0 && gameState.currentTurnIndex >= 0) {
        gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
        capturePriceHistory();
      }
      
      version++;
      sendJSON(res, 200, { ok: true, trades });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: cancel orders
  if (req.method === 'POST' && pathname === '/api/cancelOrders') {
    try {
      const { playerName } = await readBody(req);
      if (!playerName) return sendJSON(res, 400, { error: 'Missing playerName' });
      
      // Check turn-based mode
      if (gameState.turnOrder.length > 0 && gameState.currentTurnIndex >= 0) {
        const currentPlayer = gameState.turnOrder[gameState.currentTurnIndex];
        if (playerName !== currentPlayer) {
          return sendJSON(res, 400, { error: 'Not your turn', currentPlayer });
        }
      }
      
      const before = gameState.orders.length;
      gameState.orders = gameState.orders.filter(o => o.player !== playerName);
      const cancelled = before - gameState.orders.length;
      
      // Advance turn if in turn-based mode and orders were cancelled
      if (cancelled > 0 && gameState.turnOrder.length > 0 && gameState.currentTurnIndex >= 0) {
        gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
        capturePriceHistory();
      }
      
      version++;
      sendJSON(res, 200, { ok: true, cancelled });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: cancel single order by ID (admin only)
  if (req.method === 'POST' && pathname === '/api/cancelOrder') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      const { orderId } = await readBody(req);
      if (!orderId) return sendJSON(res, 400, { error: 'Missing orderId' });
      
      const before = gameState.orders.length;
      gameState.orders = gameState.orders.filter(o => o.id !== orderId);
      const cancelled = before - gameState.orders.length;
      
      if (cancelled === 0) {
        return sendJSON(res, 404, { error: 'Order not found' });
      }
      
      version++;
      sendJSON(res, 200, { ok: true, cancelled });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: reset
  if (req.method === 'POST' && pathname === '/api/reset') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    gameState = { players: {}, orders: [], trades: [], positions: {}, orderIdCounter: 1, settledPrice: null, turnOrder: [], currentTurnIndex: -1, priceHistory: [] };
    version++;
    sendJSON(res, 200, { ok: true });
    broadcastState();
    return;
  }

  // API: settle
  if (req.method === 'POST' && pathname === '/api/settle') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    const result = settleContract();
    if (result && result.error) return sendJSON(res, 400, result);
    version++;
    sendJSON(res, 200, { ok: true, ...result });
    broadcastState();
    return;
  }

  // API: set turn order
  if (req.method === 'POST' && pathname === '/api/setTurnOrder') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      const { turnOrder } = await readBody(req);
      if (!Array.isArray(turnOrder)) return sendJSON(res, 400, { error: 'turnOrder must be array' });
      
      // Validate all players exist
      for (const name of turnOrder) {
        if (!gameState.players[name]) {
          return sendJSON(res, 400, { error: `Player ${name} not found` });
        }
      }
      
      gameState.turnOrder = turnOrder;
      version++;
      sendJSON(res, 200, { ok: true });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: set current turn by player name
  if (req.method === 'POST' && pathname === '/api/setCurrentTurn') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      const { playerName } = await readBody(req);
      if (playerName === null || playerName === undefined) {
        return sendJSON(res, 400, { error: 'Missing playerName' });
      }
      
      // Allow setting to -1 or empty string to disable turns
      if (playerName === -1 || playerName === '') {
        gameState.currentTurnIndex = -1;
      } else {
        const index = gameState.turnOrder.indexOf(playerName);
        if (index === -1) {
          return sendJSON(res, 400, { error: `Player ${playerName} not in turn order` });
        }
        gameState.currentTurnIndex = index;
      }
      
      version++;
      sendJSON(res, 200, { ok: true, currentTurnIndex: gameState.currentTurnIndex });
      broadcastState();
    } catch (e) { sendJSON(res, 400, { error: 'Bad JSON' }); }
    return;
  }

  // API: start turns (set currentTurnIndex to 0)
  if (req.method === 'POST' && pathname === '/api/startTurns') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      if (gameState.turnOrder.length === 0) {
        return sendJSON(res, 400, { error: 'Turn order is empty. Add players to turn order first.' });
      }
      gameState.currentTurnIndex = 0;
      version++;
      sendJSON(res, 200, { ok: true, currentPlayer: gameState.turnOrder[0] });
      broadcastState();
    } catch (e) { sendJSON(res, 500, { error: e.message }); }
    return;
  }

  // API: stop turns (set currentTurnIndex to -1)
  if (req.method === 'POST' && pathname === '/api/stopTurns') {
    if (!checkAdminAuth(req)) return unauthorized(res);
    try {
      gameState.currentTurnIndex = -1;
      version++;
      sendJSON(res, 200, { ok: true });
      broadcastState();
    } catch (e) { sendJSON(res, 500, { error: e.message }); }
    return;
  }

  // Fallback
  notFound(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Order Book Game server running on http://0.0.0.0:${PORT}`);
  console.log(`Admin UI:  http://localhost:${PORT}/admin`);
  console.log(`Client UI: http://localhost:${PORT}/client`);
  console.log(`\nFor remote access, use your server's IP or domain instead of localhost`);
});
