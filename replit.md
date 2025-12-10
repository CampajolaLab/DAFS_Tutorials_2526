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

## How to Run
The server runs on port 5000 (configured via PORT environment variable).
- Admin UI: `/admin`
- Client UI: `/client`

## Configuration
- PORT: Set via environment variable (default: 5000)
- Admin token is generated randomly on each server start and displayed in console logs

## Recent Changes
- 2025-12-10: Configured for Replit environment with port 5000
