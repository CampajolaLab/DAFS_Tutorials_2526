# Order Book Trading Game

An interactive single-page web application for teaching order book mechanics and market microstructure concepts.

## Overview

This application simulates a limit order book where players can submit bids (buy orders) and asks (sell orders). The game enforces realistic trading rules and demonstrates how order books work in financial markets.

## How to Use

### Opening the Application

Simply open `index.html` in any modern web browser. No server or installation required (though you can use a local web server for multi-device testing).

### Game Setup (Admin Panel)

1. **Add Players**: Enter each player's name and their sibling count
   - Player Name: The identifier for each participant
   - Sibling Count: A secret number that will determine the final settlement price
   
2. **Reveal Counts**: Click on any player's sibling count to toggle between hidden (???) and revealed
   - This allows the admin to reveal information sequentially during gameplay
   - Players can use this information to inform their trading decisions

3. **Control Buttons**:
   - **Add Player**: Adds a new player to the game
   - **Reset Game**: Clears all data and starts fresh (requires confirmation)
   - **Settle Contract**: Ends the game and settles all positions at the sum of all sibling counts

### Trading (Player Controls)

1. **Enter Your Name**: Type your player name to identify your orders

2. **Select Order Type**:
   - **Bid (Buy)**: Place an order to buy the contract
   - **Ask (Sell)**: Place an order to sell the contract

3. **Enter Price**: The price at which you want to trade

4. **Enter Size**: The number of contracts (default is 1)

5. **Submit Order**: Click to place your order
   - The order will either be added to the book or execute against existing orders
   - You'll see a message indicating success or explaining why the order was rejected

6. **Cancel My Orders**: Removes all your pending orders from the book

### Understanding the Order Book

The order book displays:
- **Asks (Red)**: Sell orders, shown above the spread (lowest price at bottom)
- **Spread**: The difference between best bid and best ask
- **Bids (Green)**: Buy orders, shown below the spread (highest price at top)

Each order shows:
- **Price**: The limit price
- **Size**: Number of contracts
- **Player**: Who placed the order

Your own orders are highlighted with a blue border.

### The "Tighten or Trade" Rule

This is the key learning feature! When you submit an order, it must either:

1. **Tighten the spread**: 
   - A bid must be higher than the current best bid
   - An ask must be lower than the current best ask
   
2. **Trade against existing orders**:
   - A bid at or above the best ask will execute immediately
   - An ask at or below the best bid will execute immediately

Orders that don't meet these criteria will be rejected with an explanatory message.

### Position Tracking

The application tracks:
- **Position**: Your net contracts (positive = long, negative = short, zero = flat)
- **P&L**: Your realized profit and loss from trades
- **All Player Positions**: A table showing everyone's positions and P&L

### Settlement

When the admin clicks "Settle Contract":
1. The settlement price is calculated as the sum of all players' sibling counts
2. All open positions are closed at this price
3. Final P&L is calculated and displayed
4. A message shows the settlement price

### Multi-Device Support

The game uses localStorage for persistence and polls every 2 seconds for changes. This means:
- Multiple players can use different devices/browsers on the same computer
- Game state persists across page refreshes
- All devices see updates within 2 seconds

**Note**: For true multi-device support across different computers, you'll need to host the application on a shared server with a backend database. The current implementation only syncs within a single browser's localStorage.

## Learning Objectives

Students will learn:
1. **Order Book Structure**: How bids and asks are organized by price
2. **Price Discovery**: How the spread represents the market's uncertainty
3. **Order Matching**: How trades execute at the passive order's price
4. **Market Impact**: How aggressive orders move prices
5. **Position Management**: How to track long/short positions
6. **P&L Calculation**: How profits and losses are realized

## Example Workflow

1. Admin adds players: Alice (2 siblings), Bob (3 siblings)
2. Alice places an ask at $5.00 for 2 contracts
3. Bob tries to place a bid at $4.00 - rejected (doesn't tighten or trade)
4. Bob places a bid at $4.80 for 1 contract - accepted (tightens spread)
5. Alice reveals Bob's sibling count
6. Bob places a bid at $5.00 for 1 contract - executes against Alice's ask
7. After all trading, admin settles contract at $5.00 (2+3)
8. P&L is calculated based on trading prices vs. settlement

## Technical Details

- **Pure HTML/CSS/JavaScript**: No dependencies or build process
- **localStorage**: Stores game state in browser
- **Polling**: Checks for updates every 2 seconds
- **Responsive Design**: Works on desktop and mobile browsers
- **Price-Time Priority**: Orders match based on best price first, then timestamp

## Tips for Instructors

1. Start with a simple example to demonstrate the tighten-or-trade rule
2. Reveal sibling counts gradually to create information asymmetry
3. Discuss why the rule prevents "penny jumping" behind the best bid/ask
4. Use the P&L tracking to discuss risk and reward
5. The settlement mechanism demonstrates contract-for-difference (CFD) mechanics

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled and localStorage support.
