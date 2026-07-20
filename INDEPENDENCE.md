# Service Independence Guide

This document explains how to develop, test, and deploy each service independently.

---

## Backend Independence

### Run Backend Alone

```bash
cd backend
npm install
npm run dev
```

**Backend serves:**
- REST API: `GET http://localhost:3001/boss` → Returns boss state as JSON
- WebSocket: `ws://localhost:3001` → Accepts `{type: 'click'}` messages

### Test Backend Without Frontend

```bash
# In one terminal
npm run dev:backend

# In another terminal, simulate client clicks
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('open', () => {
  console.log('Connected');
  setInterval(() => {
    ws.send(JSON.stringify({type: 'click', playerId: 'test'}));
  }, 500);
});
ws.on('message', (msg) => console.log(JSON.parse(msg)));
"
```

### Backend API (No WebSocket Needed)

```bash
# Terminal 1
npm run dev:backend

# Terminal 2 - Poll boss state
while true; do
  curl http://localhost:3001/boss | jq '.boss.hp'
  sleep 1
done
```

---

## Frontend Independence

### Run Frontend to Mock API

Create `frontend/src/socket-mock.js`:

```javascript
export default function createSocket(onMessage) {
  // Simulate receiving boss updates
  let hp = 10000;
  
  setInterval(() => {
    hp = Math.max(0, hp - Math.random() * 100);
    onMessage({
      type: 'state',
      data: {
        boss: { hp, maxHp: 10000, alive: hp > 0, name: 'Mocked Boss' },
        contributions: { 'player-1': 500 },
        connectedPlayers: ['player-1', 'player-2']
      }
    });
  }, 2000);
  
  return {
    sendClick: () => console.log('Mock click sent'),
    close: () => {}
  };
}
```

Then in `App.jsx`, swap the import:

```javascript
// Change this
import createSocket from './socket'

// To this (for mocking)
import createSocket from './socket-mock'
```

Run frontend:

```bash
cd frontend
npm run dev
```

Frontend works independently! No backend needed for UI development.

---

## Parallel Development

### Setup: Two Developers

**Alice:** Works on backend game logic  
**Bob:** Works on frontend UI

```bash
# Alice's terminal
cd backend
npm run dev

# Bob's terminal
cd frontend

# Update socket-mock to match Alice's latest API
npm run dev
```

They communicate via:
- **API Contract:** Bob mocks the API calls Alice is building
- **Git:** Merge when features align
- **Slack:** Quick sync on breaking changes

### Merge: When Both Services Are Ready

```bash
# Alice: Backend on port 3001
npm run dev:backend

# Bob: Switches to real backend
npm run dev:frontend
# Frontend auto-connects to ws://localhost:3001

# Test together
curl http://localhost:3001/boss  # Should show real state
```

Both work? Merge to main! 🎉

---

## Docker: Independence

### Build Backend Container Alone

```bash
docker build -t worldboss-backend ./backend
docker run -p 3001:3001 worldboss-backend
```

### Build Frontend Container Alone

```bash
docker build -t worldboss-frontend ./frontend
docker run -p 3000:3000 worldboss-frontend
```

### Run Containers Separately

```bash
# Terminal 1
docker run -p 3001:3001 worldboss-backend

# Terminal 2
docker run \
  -p 3000:3000 \
  -e VITE_WS_URL=ws://localhost:3001 \
  worldboss-frontend
```

---

## Testing: Independence

### Backend Unit Tests (Future)

```javascript
// backend/test/bossManager.test.js
const BossManager = require('../src/bossManager');

test('Boss takes damage when player clicks', () => {
  const boss = new BossManager();
  boss.registerPlayer('p1');
  boss.registerClick('p1', 1);
  boss._tick();  // Force tick
  expect(boss.boss.hp).toBeLessThan(10000);
});
```

**No frontend needed!** Test just the state machine.

### Frontend Component Tests (Future)

```javascript
// frontend/src/components/ArenaPage.test.jsx
import ArenaPage from './pages/ArenaPage';

test('Click handler sends click via socket', () => {
  const mockSocket = { sendClick: jest.fn() };
  const { getByRole } = render(<ArenaPage socket={mockSocket} />);
  
  const bossButton = getByRole('button', { name: /🦑/i });
  fireEvent.click(bossButton);
  
  expect(mockSocket.sendClick).toHaveBeenCalled();
});
```

**No backend needed!** Mock the socket.

---

## Deployment: Independence

### Deploy Backend Only

```bash
# Push backend image to registry
docker tag worldboss-backend myrepo/backend:v1.0
docker push myrepo/backend:v1.0

# Deploy to server
ssh prod-server "docker pull myrepo/backend:v1.0 && docker run -p 3001:3001 myrepo/backend:v1.0"
```

### Deploy Frontend Only

```bash
# Push frontend image
docker tag worldboss-frontend myrepo/frontend:v1.0
docker push myrepo/frontend:v1.0

# Deploy to server
ssh prod-server "docker pull myrepo/frontend:v1.0 && docker run -p 3000:3000 myrepo/frontend:v1.0"
```

### Rollback Configuration

If frontend needs to talk to old backend API:

```bash
# Redeploy frontend with different backend URL
docker run \
  -p 3000:3000 \
  -e VITE_WS_URL=wss://old-api.example.com \
  myrepo/frontend:v1.0
```

**No code changes needed!** Just env var.

---

## Real-World Scenarios

### Scenario 1: Backend Bug Found in Production

1. **Frontend unaffected** - Still serves users
2. **Fix backend** - Deploy new backend version
3. **Point to new backend** - Frontend auto-reconnects (WebSocket retry logic)
4. **Done!** No frontend changes needed

### Scenario 2: Frontend UX Redesign

1. **Backend unchanged** - Still serving API
2. **Redesign frontend** - Change UI, same API calls
3. **Deploy frontend** - No backend changes
4. **Done!** Backend version stays same

### Scenario 3: API Contract Change

1. **Backend** adds new field `boss.rating`
2. **Frontend** updates to use `boss.rating`
3. **Coordination:** Merge both changes, deploy both
4. **Communication:** No downtime if coordinated

---

## Monitoring: Independence

### Backend Health Check

```bash
curl -s http://localhost:3001/boss | jq '.boss.alive'
# true/false
```

### Frontend Health Check

```bash
curl -s http://localhost:3000 | grep -q "<html>"
# $? = 0 if healthy
```

### Service Mesh (Future)

Each service exposes health endpoint:
- `http://backend:3001/health` → `{status: 'ok'}`
- `http://frontend:3000/health` → `{status: 'ok'}`

Orchestrator (Kubernetes) checks these to restart failed services.

---

## Summary: Independence Benefits

| Aspect | Benefit |
|--------|---------|
| **Development** | Developers work in parallel without blocking |
| **Testing** | Mock dependencies; test each service alone |
| **Deployment** | Deploy frontend without redeploying backend |
| **Scaling** | Run 5 frontends + 2 backends independently |
| **Languages** | Could rewrite frontend in Vue; backend stays same |
| **Teams** | Different teams own each service |
| **Debugging** | Isolate issues to one service |

---

**True independence = True scalability!**
