# Project Structure Explained

```
WorldBoss/
│
├── backend/                           # Node.js API Server
│   ├── src/
│   │   ├── server.js                 # Express + WebSocket setup
│   │   │   ├── REST endpoint: GET /boss
│   │   │   ├── WebSocket: on('connection'), on('message')
│   │   │   ├── Event listeners: boss.on('update'), boss.on('dead')
│   │   │   └── broadcast() function for all connected clients
│   │   │
│   │   └── bossManager.js            # Game State Machine
│   │       ├── Boss state (hp, name, maxHp, alive)
│   │       ├── registerPlayer(id) / unregisterPlayer(id)
│   │       ├── registerClick(playerId, power)
│   │       ├── _tick() - 2s aggregation loop
│   │       ├── getState() - returns current state
│   │       └── EventEmitter for 'update' & 'dead' events
│   │
│   ├── package.json                  # Dependencies: express, ws, uuid, dotenv
│   ├── Dockerfile                    # Alpine Node.js image + health check
│   └── .gitignore
│
├── frontend/                          # React + Vite SPA
│   ├── src/
│   │   ├── main.jsx                  # React entry point
│   │   │
│   │   ├── App.jsx                   # Main component
│   │   │   ├── Socket initialization with useEffect cleanup
│   │   │   ├── PageSwitch: MapPage vs ArenaPage
│   │   │   └── State management: page, gameState
│   │   │
│   │   ├── socket.js                 # WebSocket Client Wrapper
│   │   │   ├── Constructor: detects backend URL from env
│   │   │   ├── Event listeners: open, message, error, close
│   │   │   ├── sendClick() function
│   │   │   └── close() for cleanup
│   │   │
│   │   ├── pages/
│   │   │   ├── MapPage.jsx           # Global map view
│   │   │   │   ├── Leaflet map rendering
│   │   │   │   ├── Boss marker clicked → enter Arena
│   │   │   │   └── Responsive layout
│   │   │   │
│   │   │   └── ArenaPage.jsx         # Boss combat UI
│   │   │       ├── Large boss emoji (🦑)
│   │   │       ├── Click handler with shake animation
│   │   │       ├── Floating damage numbers (+1)
│   │   │       ├── Soldiers display (🪖 list)
│   │   │       ├── HP bar (red gradient)
│   │   │       ├── Leaderboard (top contributors)
│   │   │       └── Exit button → back to MapPage
│   │   │
│   │   └── styles.css                # Global styles
│   │       ├── Layout: flexbox, grid
│   │       ├── Animations: @keyframes pulse, shake, light-shake, float-up, hit-flash
│   │       ├── Colors: Red HP bar, responsive sizes
│   │       └── Responsive media queries
│   │
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Dependencies: react, vite, leaflet
│   ├── vite.config.js                # Vite config + env port reading
│   ├── Dockerfile                    # Multi-stage: build + nginx serving
│   └── .gitignore
│
├── infra/                            # Infrastructure & Orchestration
│   ├── docker-compose.yml            # Multi-service orchestration
│   │   ├── backend (node:18-alpine)
│   │   ├── frontend (nginx:alpine)
│   │   ├── postgres (optional DB)
│   │   ├── redis (optional cache)
│   │   ├── Health checks for each
│   │   └── Environment variables
│   │
│   └── (future: nginx.conf, k8s manifests, terraform, etc.)
│
├── .env.dev                          # Development environment
│   ├── BACKEND_PORT=3001
│   ├── FRONTEND_PORT=3000
│   ├── VITE_WS_URL=ws://localhost:3001
│   └── NODE_ENV=development
│
├── .env.prod                         # Production environment
│   ├── BACKEND_HOST=0.0.0.0
│   ├── VITE_WS_URL=wss://yourdomain.com
│   └── NODE_ENV=production
│
├── .env.example                      # Template for new developers
│
├── package.json                      # Root workspace
│   ├── "dev": npm run dev:backend & npm run dev:frontend
│   ├── "dev:backend": cd backend && npm run dev
│   ├── "dev:frontend": cd frontend && npm run dev
│   ├── "build": build both services
│   └── "install:all": install all dependencies
│
│
├── README.md                         # **START HERE**
│   ├── Quick start (60 seconds)
│   ├── Architecture overview
│   ├── Development guide
│   ├── Production deployment
│   ├── API documentation
│   └── Troubleshooting
│
├── QUICKSTART.md                     # TL;DR version of README
│   └── Just the commands you need
│
├── ARCHITECTURE.md                   # Design Decision Record (ADR)
│   ├── Why ports 3000/3001?
│   ├── Why server-authoritative?
│   ├── Why 2-second ticks?
│   ├── Why WebSocket vs REST?
│   └── All 11 major architecture decisions explained
│
├── DEPLOYMENT.md                     # How to deploy
│   ├── Local development (npm run dev)
│   ├── Docker Compose (docker-compose up)
│   ├── Cloud platforms (GCP, Heroku, AWS)
│   ├── Kubernetes examples
│   ├── CI/CD pipeline
│   └── Scaling strategies
│
├── INDEPENDENCE.md                   # Services are decoupled
│   ├── Run backend alone (mock frontend)
│   ├── Run frontend alone (mock backend)
│   ├── Parallel development workflow
│   ├── Independent testing
│   ├── Independent deployment
│   └── Real-world scenarios
│
├── ONBOARDING.md                     # New team member checklist
│   ├── Prerequisites
│   ├── Local setup
│   ├── Verification tests
│   ├── Project structure
│   ├── Development workflow
│   └── Common issues
│
└── .gitignore                        # Node/build files to ignore


```

---

## Key Design Patterns

### Backend: Request/Response Flow

```
Client                  Server
  │                       │
  ├─── WebSocket open ────→ registerPlayer(uuid)
  │                       │
  ├─── {type: 'click'} ───→ registerClick(uuid, 1)
  │                       │ (queued)
  │                       │
  │                       ├─ _tick() every 2s
  │                       ├─ aggregate clicks
  │                       ├─ apply damage
  │                       └─ emit 'update'
  │                       │
  ←─── {type: 'state'} ────┤ broadcast to all
  │                       │
  └─── WebSocket close ───→ unregisterPlayer(uuid)
```

### Frontend: Component Hierarchy

```
App (routing + socket init)
  ├─ MapPage (when page === 'map')
  │   └─ Leaflet map + boss marker click → setPage('arena')
  │
  └─ ArenaPage (when page === 'arena')
      ├─ Boss section (HP bar + emoji)
      │   └─ Click handler → socket.sendClick()
      ├─ Floating damage (animated numbers)
      ├─ Soldiers section (list of 🪖)
      └─ Leaderboard (top 5 contributors)
```

### Data Flow: One Click → Screen Update

```
1. User clicks boss emoji
   ↓
2. handleBossClick() fires
   ├─ socket.sendClick() [WebSocket send]
   ├─ setIsShaking(true) [local animation]
   └─ Add floating damage to state
   ↓
3. Backend receives 'click' event
   └─ bossManager.registerClick(uuid, 1)
   ↓
4. After 2 seconds, _tick() runs
   ├─ Aggregate all clicks
   ├─ Apply damage: boss.hp -= totalDamage
   └─ Emit 'update' event
   ↓
5. server.js broadcast() sends to all clients
   ↓
6. Frontend receives {type: 'state', data: {...}}
   ├─ Update game state (new HP)
   ├─ setIsLightShaking(true) [if HP decreased]
   └─ Re-render ArenaPage
   ↓
7. User sees HP bar decrease, boss trembles slightly
```

---

## Environment-Specific Behavior

### Development (.env.dev)
- Localhost only
- Ports: 3000 (frontend), 3001 (backend)
- Log level: debug
- No auth/validation shortcuts

### Production (.env.prod)
- All interfaces (0.0.0.0)
- HTTPS/WSS only
- Log level: warn
- Redis + Postgres integrated

### Docker Compose
- Services named: `backend`, `frontend`, `redis`, `postgres`
- Network: internal (services talk to each other by name)
- Health checks enabled
- Auto-restart on failure

---

## File Size Reference

Typical sizes after build:

```
backend/
├── src/              ~20 KB
├── node_modules/     ~500 MB (not deployed)
└── Dockerfile        ~300 bytes

frontend/
├── src/              ~50 KB
├── dist/             ~400 KB (after build, gzipped ~100 KB)
├── node_modules/     ~1 GB (not deployed)
└── Dockerfile        ~500 bytes
```

**Production image sizes:**
- Backend image: ~200 MB (Node 18 Alpine)
- Frontend image: ~100 MB (Nginx Alpine + built dist)

---

## Communication Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 3000 | HTTP/HTTPS | SPA serving |
| Backend | 3001 | HTTP/WS | API + WebSocket |
| Redis | 6379 | TCP | Caching (optional) |
| Postgres | 5432 | TCP | Database (optional) |

---

## Git Strategy

```
main (production)
├─ feat/upgrades (new features)
├─ fix/balance (bug fixes)
├─ docs/architecture (documentation)
└─ refactor/socket (code cleanup)
```

Each branch:
1. Create from `main`
2. Test locally (`npm run dev`)
3. Submit PR for review
4. Merge when approved + tests pass
5. Deploy to production

---

**This structure is designed for:**
- ✅ Independent service development
- ✅ Easy onboarding (clear file organization)
- ✅ Production-ready deployment
- ✅ Scalability (microservices-ready)
- ✅ Team collaboration (clear boundaries)

