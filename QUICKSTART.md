# WorldBoss - Quick Reference

## 🏃 Start Everything (60 seconds)

```bash
npm run dev
```

Opens:
- Frontend: http://localhost:3000 ✅
- Backend: http://localhost:3001/boss ✅
- WebSocket: ws://localhost:3001 ✅

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Express + WebSocket server |
| `backend/src/bossManager.js` | Game state machine |
| `frontend/src/App.jsx` | Main React component with routing |
| `frontend/src/socket.js` | WebSocket client wrapper |
| `frontend/src/pages/ArenaPage.jsx` | Boss fight UI |
| `frontend/src/pages/MapPage.jsx` | Global map |
| `vite.config.js` | Vite config (reads port from env) |
| `.env.dev` | Development environment |
| `.env.prod` | Production environment |

## 🛠️ Common Commands

```bash
# Install everything
npm run install:all

# Development (both services together)
npm run dev

# Development (services separately)
npm run dev:backend     # Terminal 1
npm run dev:frontend    # Terminal 2

# Build for production
npm run build

# Clean up
npm run clean
```

## 🐳 Docker

```bash
# Run all services with Docker Compose
cd infra
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

## 🔍 Debugging

**Backend not responding?**
```bash
curl http://localhost:3001/boss
```

**Check WebSocket connects?**
- Open http://localhost:3000
- Press F12 → Console
- Should see: "✅ WebSocket connected to ws://localhost:3001"

**Which service is which port?**
- Frontend: 3000
- Backend: 3001

## 📚 Documentation

- **README.md** - Full guide & API docs
- **ARCHITECTURE.md** - Design decisions explained
- **DEPLOYMENT.md** - How to deploy to production

## 🐛 If Things Break

```bash
# Nuclear option
npm run clean
npm run install:all
npm run dev
```

---

**See README.md for full documentation!**
