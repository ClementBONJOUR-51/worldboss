# Architecture Decision Record (ADR)

## Context

This document explains design decisions made for WorldBoss POC and their rationale.

---

## 1. Port Selection: 3000 & 3001

**Decision:** Frontend on port 3000 (standard), Backend on port 3001 (paired backend port).

**Rationale:**
- Standard convention: 3000 = frontend, 3001 = backend
- Recognizable by all developers (no guessing)
- Matches npm/Next.js defaults
- Allows independent scaling & reverse-proxy routing

**Alternative Considered:**
- Single port with path-based routing (`/api/*`) → More complex middleware needed

---

## 2. Server-Authoritative Architecture

**Decision:** All damage calculations happen on the backend. Frontend only sends "click" events.

**Rationale:**
- Prevents cheating (players can't increase their damage client-side)
- Single source of truth
- Auditable for analytics
- Scales better (less data to sync)

**Flow:**
```
Client clicks → "click" event → Backend calculates damage → Broadcast to all
```

---

## 3. 2-Second Aggregation Ticks

**Decision:** Cluster clicking every 2 seconds instead of applying instant damage.

**Rationale:**
- Stability: Hundreds of simultaneous clicks don't overwhelm the server
- Performance: Batch processing is more efficient than per-click updates
- UX: Natural rhythm (feels intentional, not jittery)
- Scales better: 100 players = 100 events/2s, not 100 events/click

**Trade-off:**
- Slight delay between click and damage showing (+2s worst case)
- Acceptable for idle/clicker game genre

---

## 4. WebSocket for Real-Time Events

**Decision:** Use WebSocket for all game updates, REST GET for initial state fetch.

**Rationale:**
- Bidirectional (needed for "click" events from client to server)
- Lower latency than polling
- Persistent connection = efficient for frequent updates
- Industry standard for multiplayer games

**Hybrid Approach:**
- WebSocket: Game events (clicks, state updates)
- REST: Initial load & optional API queries (`/boss` endpoint)

---

## 5. Fully Decoupled Backend & Frontend

**Decision:** Services don't depend on each other's source code. Only communicate via API.

**Rationale:**
- Can deploy independently
- Different teams can own each service
- Easy to replace frontend (could make a mobile app)
- Easier testing (mock API for frontend)

**Implementation:**
- Separate `package.json` files
- Separate Docker containers
- Can run without the other (frontend to mock API, backend without frontend)

---

## 6. Environment Configuration via .env Files

**Decision:** Use `dotenv` for all configuration, not hardcoded values.

**Rationale:**
- Same codebase runs in dev/staging/prod
- Secrets stay out of git
- No code changes needed for deployment
- CI/CD friendly

**Files:**
- `.env.dev` → Development defaults (localhost)
- `.env.prod` → Production defaults (0.0.0.0, secure URLs)
- `.env.example` → Template for new developers

---

## 7. Docker Multi-Stage Build for Frontend

**Decision:** Use Vite build step, then serve with Nginx (not Node.js dev server).

**Rationale:**
- Production-grade serving (Nginx is proven)
- Tiny image size (only Nginx + static files)
- Faster delivery (no Node.js runtime needed)
- Better caching headers

**Build Process:**
```
Stage 1: node:18-alpine → npm ci && npm run build → /dist
Stage 2: nginx:alpine → copy /dist → serve on port 3000
```

---

## 8. Alpine Linux for Docker Images

**Decision:** Use `-alpine` variants of Node and Nginx images.

**Rationale:**
- Smaller image size (50 MB vs 1 GB)
- Faster pull/deploy times
- Same functionality as full images
- Reduces attack surface

---

## 9. Health Checks in Docker

**Decision:** Add HEALTHCHECK to backend and frontend Docker images.

**Rationale:**
- Docker/orchestration can detect unhealthy containers
- Auto-restart if health fails
- Better reliability in production

**Example:**
```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/boss
```

---

## 10. Single-Responsibility for BossManager

**Decision:** BossManager handles ONLY boss state machine, not WebSocket logic.

**Rationale:**
- Testable in isolation (can mock easily)
- Reusable (could use in CLI admin tool)
- Clear separation: Game logic vs I/O logic
- Can be swapped out later (for Redis-backed state)

**Boundaries:**
- BossManager: State, damage math, tick logic
- server.js: WebSocket events, HTTP routes, broadcasting

---

## 11. React StrictMode Cleanup

**Decision:** WebSocket is closed and reopened on component unmount (Strict Mode).

**Rationale:**
- Prevents duplicate connections in development
- React StrictMode intentionally double-mounts components
- Cleanup functions (`useEffect () => {...}`) are essential for resources

**Pattern:**
```javascript
useEffect(() => {
  socket.current = createSocket(...)
  return () => socket.current.close()  // Cleanup
}, [])
```

---

## Future Considerations

### Redis Integration
- Currently in-memory state
- Redis would enable multi-server deployments
- Track connectedPlayers in Redis Set
- Use Redis Pub/Sub for broadcasting

### PostgreSQL Persistence
- Track historical damage per player
- Leaderboards & achievements
- Player progression data
- Battle statistics

### Load Balancing
- Multiple backend instances behind load balancer
- Sticky sessions (player's clicks go to same server)
- Or fully stateless with Redis shared state

---

## Trade-Offs Accepted for MVP

❌ **Not doing:**
- Authentication (public POC)
- Caching layer (Redis)
- Database persistence (in-memory PCS only)
- Rate limiting (trusting good players)
- Logging service (console only)
- Metrics/monitoring (no Prometheus yet)

✅ **Doing:**
- Core game loop (click → damage → broadcast)
- Visual feedback (animations)
- Real-time multiplayer
- Clean code structure

---

## Validation

This architecture was validated by:
1. ✅ Local development works smoothly
2. ✅ Multiple browser tabs can play together
3. ✅ Docker Compose deployment successful
4. ✅ No port conflicts or assumptions
5. ✅ Environment variables are flexible

---
