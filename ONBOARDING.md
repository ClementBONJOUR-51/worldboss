# Developer Onboarding Checklist

Welcome to WorldBoss! Use this checklist to get set up locally.

---

## ✅ Prerequisites (5 min)

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Git installed and configured
- [ ] Code editor (VS Code recommended)
- [ ] Your favorite terminal

---

## ✅ Clone & Setup (10 min)

```bash
# Clone repo
git clone <repo-url>
cd WorldBoss

# Install all dependencies
npm run install:all

# Verify setup
npm run dev
```

- [ ] Backend starts (see "🎮 Backend Server running")
- [ ] Frontend starts (see "VITE v... ready")
- [ ] No error messages in console

---

## ✅ Verify Locally (5 min)

Open browser tabs:

- [ ] Frontend: http://localhost:3000 (should show a map)
- [ ] Backend API: http://localhost:3001/boss (should return JSON)
- [ ] DevTools Console (F12): Look for "✅ WebSocket connected"

---

## ✅ First Test: Click the Boss (5 min)

1. [ ] In browser at http://localhost:3000
2. [ ] Click the boss emoji on the map
3. [ ] Enter the Arena
4. [ ] Click the boss (the big squid 🦑)
5. [ ] See floating damage number (+1)
6. [ ] See boss HP decrease

---

## ✅ Multi-Player Test (5 min)

1. [ ] Open 2 browser tabs with http://localhost:3000
2. [ ] Tab 1: Enter Arena
3. [ ] Tab 2: Enter Arena
4. [ ] Tab 1: Click boss 3 times
5. [ ] Tab 2: Watch boss HP decrease in real-time
6. [ ] Tab 1: See soldiers (🪖) appear below boss

---

## ✅ Project Structure (5 min)

Read and understand:

- [ ] `README.md` - Full documentation
- [ ] `QUICKSTART.md` - Very quick reference
- [ ] `ARCHITECTURE.md` - Why things are designed this way
- [ ] `INDEPENDENCE.md` - Services are decoupled

---

## ✅ Code Navigation (10 min)

Files to understand:

**Backend:**
- [ ] `backend/src/server.js` (lines 15-30) - WebSocket connection
- [ ] `backend/src/bossManager.js` (lines 1-20) - State machine

**Frontend:**
- [ ] `frontend/src/App.jsx` (lines 1-20) - Main routing
- [ ] `frontend/src/socket.js` - WebSocket wrapper
- [ ] `frontend/src/pages/ArenaPage.jsx` (lines 30-50) - Boss click handler

---

## ✅ Development Workflow (5 min)

Know these commands:

```bash
npm run dev              # Start everything
npm run dev:backend      # Backend only (localhost:3001)
npm run dev:frontend     # Frontend only (localhost:3000)
npm run build            # Production build
npm run clean            # Clear cache
```

- [ ] Can start/stop services
- [ ] Know which port is which

---

## ✅ VS Code Setup (Optional but Recommended)

Suggested extensions:

- [ ] ES7+ React/Redux/React-Native snippets
- [ ] REST Client (for testing `/boss` endpoint)
- [ ] Thunder Client or Postman (for WebSocket testing)

**Recommended settings (`.vscode/settings.json`):**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## ✅ Docker (Optional, for Ops)

If you'll deploy to Docker:

```bash
# Build images
docker build -t worldboss-backend ./backend
docker build -t worldboss-frontend ./frontend

# Run all services
cd infra
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f backend
```

- [ ] Docker Desktop installed
- [ ] Can run `docker ps`
- [ ] Can run `docker-compose up`

---

## ✅ Before First PR

Make sure:

- [ ] You can `npm run dev` without errors
- [ ] You can open http://localhost:3000
- [ ] You can click the boss and see damage
- [ ] You've read `ARCHITECTURE.md` to understand design
- [ ] Your changes follow existing code style
- [ ] No console errors/warnings

---

## ✅ Common Issues

**"Port 3001 already in use"**
```bash
# Find and kill process
netstat -ano | findstr :3001
taskkill /PID <number> /F
```

**"WebSocket won't connect"**
- Check backend is running: `curl http://localhost:3001/boss`
- Check  frontend console (F12) for errors
- Verify correct port in `.env` or `vite.config.js`

**"npm install fails"**
```bash
npm cache clean --force
npm run clean
npm run install:all
```

---

## 🎉 You're Ready!

Next steps:

1. **Pick a task** from the roadmap (ARCHITECTURE.md)
2. **Create a branch** (`git checkout -b feature/your-feature`)
3. **Make changes** (frontend in `frontend/src`, backend in `backend/src`)
4. **Test locally** (`npm run dev`)
5. **Commit & push** (`git push origin feature/your-feature`)
6. **Submit PR** for review

---

## 📚 Resources

- [React Docs](https://react.dev)
- [Express.js Docs](https://expressjs.com)
- [WebSocket Spec](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Vite Docs](https://vitejs.dev)
- [Docker Docs](https://docs.docker.com)

---

## ❓ Questions?

- Check `README.md` (most questions answered there)
- Check source code comments
- Look at existing similar code for patterns
- Ask in team chat or open an issue

---

**Welcome to the team! 🚀**
