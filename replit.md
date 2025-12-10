# Order Book Trading Game

## Overview
An interactive educational tool for teaching limit order book mechanics and market microstructure. The application allows multiple users to participate in a simulated trading environment.

## Project Architecture
- **Server**: Node.js backend (`tutorial_1/server/server.js`) - handles game state, SSE broadcasting, and API endpoints
- **Frontend**: Static HTML files served by the Node server (`tutorial_1/frontend/`)
  - `admin-remote.html` - Admin panel for game management
  - `client-remote.html` - Player trading interface

## Key Features
- Real-time limit order book with bid/offer display
- "Tighten or trade" rule enforcement
- Player position tracking and P&L calculation
- Admin panel for game management
- Turn-based mode support
- CSV bulk player import

## URLs
- **Players (public)**: `/` or `/client` - Anyone can access and join the game
- **Admin (token-protected)**: `/admin` - Requires admin token to access

## Configuration
- PORT: Set via environment variable (default: 5000)
- Admin token is generated randomly on each server start and displayed in console logs
- To access admin, either enter the token in the login form or append `?token=<TOKEN>` to the URL

## Recent Changes
- 2025-12-10: Added token protection to admin page (requires token to even view the page)
- 2025-12-10: Configured for Replit environment with port 5000
