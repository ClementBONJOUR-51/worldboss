# 🎮 WorldBoss - Multiplayer Boss Fighting Game

A real-time multiplayer game inspired by Cookie Clicker, where players from around the world simultaneously fight a global boss to accumulate damage and unlock upgrades.

**Status:** MVP - Core gameplay loop working, ready for feature expansion

---

## 🚀 Quick Start (60 seconds)

### Prerequisites
- **Node.js** 18+ 
- **npm** 9+
- Optional: **Docker** & **Docker Compose**

### Local Development (Recommended)

```bash
# One-time setup
npm run install:all

# Start everything
npm run dev

# Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/boss
```

That's it! Both services run in parallel with hot-reload.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Development](#-development)
- [Production](#-production)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)

---

## 🏗️ Architecture

### Principles

✅ **Fully Decoupled** - Backend and frontend can deploy independently  
✅ **Server-Authoritative** - All game logic runs server-side (cheat-proof)  
✅ **Real-Time** - WebSocket for instant multiplayer sync  
✅ **Scalable** - Ready for Docker, Redis, and Postgres  
✅ **Environment-Agnostic** - Dev/prod with just env vars  

### Stack

**Backend** - Node.js 18 + Express + WebSocket  
**Frontend** - React 18 + Vite  
**Infrastructure** - Docker Compose + Nginx  
**Optional** - Redis, PostgreSQL  

### Communication

```
Browser ◄──WebSocket──► Backend Server
  │                         │
  └──GET /boss──────────────┘
```

**Flow:**
1. Player clicks boss → WebSocket sends `{type: 'click'}`
2. Backend registers click in queue
3. Every 2 seconds: aggregate damage + broadcast update
4. All browsers receive new `{type: 'state'}` with updated HP

---

## 🛠️ Development

### Project Layout

```
WorldBoss/
├── backend/               # API server & WebSocket
│   ├── src/server.js     # Express + WS setup
│   ├── src/bossManager.js # Game state machine
│   └── package.json
├── frontend/             # React app
│   ├── src/App.jsx       # Main component
│   ├── src/socket.js     # WS client
│   ├── src/pages/        # Map & Arena views
│   └── package.json
├── infra/               # Docker Compose
│   └── docker-compose.yml
├── .env.dev             # Dev defaults
├── .env.prod            # Prod defaults
├── package.json         # Root scripts
└── README.md
```

### Commands

```bash
# Install dependencies
npm run install:all

# Development (both services)
npm run dev

# Development (individual)
npm run dev:backend      # Terminal 1
npm run dev:frontend     # Terminal 2

# Production builds
npm run build
npm run build:backend
npm run build:frontend

# Cleanup
npm run clean
```

### Debugging

**Check backend is running:**
```bash
curl http://localhost:3001/boss
# Should return: {"boss": {...}, "contributions": {...}, "connectedPlayers": [...]}
```

**Check frontend is running:**
```bash
curl http://localhost:3000
# Should return HTML
```

**Browser DevTools (F12):**
- Console → Look for ✅ WebSocket connected messages
- Network → Check WS connection to ws://localhost:3001

---

## 🌐 Production

### Docker Compose Setup

```bash
cd infra
docker-compose up -d

# Access
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# API: http://localhost:3001/boss
```

Includes:
- Frontend (Nginx-served)
- Backend (Node.js)
- Redis (caching)
- PostgreSQL (persistence)
- Health checks & auto-restart

### Cloud Deployment

1. **Build images:**
   ```bash
   docker build -t myrepo/worldboss-backend ./backend
   docker build -t myrepo/worldboss-frontend ./frontend
   ```

2. **Push to registry:**
   ```bash
   docker push myrepo/worldboss-backend:v1.0
   docker push myrepo/worldboss-frontend:v1.0
   ```

3. **Deploy** using your platform (ECS, Kubernetes, Heroku, etc.)

### Environment Variables

**Backend** (`BACKEND_*`)
- `BACKEND_HOST` (default: 0.0.0.0 for Docker)
- `BACKEND_PORT` (default: 3001)
- `NODE_ENV` (development/production)
- `BOSS_NAME`, `BOSS_MAX_HP`, `BOSS_TICK_INTERVAL`

**Frontend** (`VITE_*`)
- `VITE_WS_URL` (default: ws://localhost:3001)
- `VITE_API_URL` (default: http://localhost:3001)

See `.env.example` for all options.

---

## 📡 API Reference

### REST Endpoints

#### GET `/boss`
Returns boss state, player contributions, and connected players list.

```json
{
  "boss": {
    "name": "Kraken",
    "hp": 8500,
    "maxHp": 10000,
    "alive": true
  },
  "contributions": {
    "uuid-1": 150,
    "uuid-2": 320
  },
  "connectedPlayers": ["uuid-1", "uuid-2"]
}
```

### WebSocket Events

#### Send: `click`
```json
{ "type": "click", "playerId": "uuid" }
```

#### Receive: `state`
Sent every 2 seconds with updated boss state.

```json
{
  "type": "state",
  "data": {
    "boss": {...},
    "contributions": {...},
    "connectedPlayers": [...]
  }
}
```

#### Receive: `dead`
Sent when boss dies.

```json
{
  "type": "dead",
  "data": {...}
}
```

---

## 🆘 Troubleshooting

### Port in Use
```bash
# Linux/macOS
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### WebSocket Won't Connect
1. Ensure backend is running: `curl http://localhost:3001/boss`
2. Check frontend console for errors (F12 → Console)
3. Verify correct WebSocket URL in frontend env vars

### Build Fails
```bash
npm run clean
npm run install:all
npm run build
```

---

## 🎯 Next Steps

**Phase 2:** Upgrades & progression system  
**Phase 3:** Leaderboards & achievements  
**Phase 4:** Multi-boss support  

---

**Questions?** Check the inline comments in source files or open an issue.

---


