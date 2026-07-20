# Deployment Guide

## Local Development

### Step 1: Install Dependencies

```bash
npm run install:all
```

This runs `npm ci` in root + backend + frontend (exact versions from package-lock.json).

### Step 2: Start Services

```bash
npm run dev
```

This spawns two processes:
- Backend on http://localhost:3001
- Frontend on http://localhost:3000

Check they're running:

```bash
# Terminal 3
curl http://localhost:3001/boss    # Should return JSON
curl http://localhost:3000         # Should return HTML
```

### Step 3: Open Browser

- Frontend: http://localhost:3000
- If you see the map, backend is connected ✅

---

## Docker Compose (Multi-Container)

### Prerequisites

- Docker Desktop installed
- Docker Compose v2+

### Step 1: Build & Run

```bash
cd infra
docker-compose up -d --build
```

This starts 4 services:
- **backend** → `http://localhost:3001`
- **frontend** → `http://localhost:3000`
- **postgres** → `localhost:5432` (optional)
- **redis** → `localhost:6379` (optional)

### Step 2: Verify

```bash
# Check running containers
docker-compose ps

# Backend logs
docker-compose logs -f backend

# All logs
docker-compose logs -f
```

### Step 3: Stop

```bash
docker-compose down

# Remove volumes too
docker-compose down -v
```

---

## Production Deployment

### Option A: Cloud Run / App Engine (Google Cloud)

1. **Create `app.yaml` in backend:**

```yaml
runtime: nodejs18
env: standard

env_variables:
  NODE_ENV: "production"
  BACKEND_PORT: "8080"
  BOSS_MAX_HP: "20000"

handlers:
  - url: /.*
    script: auto
```

2. **Deploy backend:**

```bash
cd backend
gcloud app deploy
```

3. **Deploy frontend:** (Point to deployed backend URL)

```bash
# Update .env.prod
VITE_WS_URL=wss://your-backend.cloudfun.net
VITE_API_URL=https://your-backend.cloudfun.net

cd frontend
npm run build
# Upload dist/ to Cloud Storage or deploy as static site
```

### Option B: Heroku (Deprecated, but example)

```bash
# Backend
cd backend
heroku create worldboss-backend
heroku config:set NODE_ENV=production
git push heroku main

# Frontend
cd frontend
npm run build
heroku create worldboss-frontend
# Deploy dist/ folder
```

### Option C: Docker Swarm / Kubernetes

**Build images:**

```bash
docker build -t myrepo/worldboss-backend:v1.0 ./backend
docker build -t myrepo/worldboss-frontend:v1.0 ./frontend

docker push myrepo/worldboss-backend:v1.0
docker push myrepo/worldboss-frontend:v1.0
```

**Docker Swarm:**

```bash
docker swarm init
docker stack deploy -c docker-compose.yml worldboss
```

**Kubernetes (example k8s deployment):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worldboss-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: myrepo/worldboss-backend:v1.0
        ports:
        - containerPort: 3001
        env:
        - name: BACKEND_HOST
          value: "0.0.0.0"
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /boss
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
```

---

## Environment Configuration

### Development (.env.dev)

```
BACKEND_HOST=localhost
BACKEND_PORT=3001
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
NODE_ENV=development
```

### Production (.env.prod)

```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3001
VITE_WS_URL=wss://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
NODE_ENV=production

# Optional services
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://user:pass@db:5432/worldboss

# Boss config
BOSS_MAX_HP=50000
BOSS_TICK_INTERVAL=2000
```

---

## Database Setup (Future)

### PostgreSQL

```bash
# From within Docker
docker exec worldboss_postgres psql -U wb -d worldboss

# Run migrations
npm run db:migrate
```

### Redis

```bash
# Clear cache
docker exec worldboss_redis redis-cli FLUSHALL

# Monitor traffic
docker exec worldboss_redis redis-cli MONITOR
```

---

## Monitoring & Logging

### Backend Logs

```bash
# Docker Compose
docker-compose logs -f backend

# Local dev
npm run dev:backend
```

### Frontend Console

```
Open http://localhost:3000
Press F12 → Console tab
```

### Performance Issues?

1. **Check backend health:**
   ```bash
   curl http://localhost:3001/boss
   ```

2. **Check WebSocket:**
   - DevTools → Network → WS
   - Should show ws://localhost:3001 as "101 Switching Protocols"

3. **Check boss tick rate:**
   - BossManager logs every 2 seconds
   - If not logging, tick is skipped

---

## Scaling Strategies

### For 100+ Players

1. **Add Redis:**
   - Share state across backend instances
   - Use Redis Pub/Sub for broadcasting

2. **Load Balance Backend:**
   - Use Nginx reverse proxy
   - Or cloud load balancer (ALB, GCP LB)
   - Route WebSocket connections to same backend (sticky sessions)

3. **Separate Services:**
   - Game server (boss logic)
   - WebSocket server (message broker)
   - API server (stats/leaderboards)

### Architecture at Scale

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Frontend │  │ Frontend │  │ Frontend │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
            ┌──────▼──────┐
            │ Load Balancer
            └──────┬──────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│ Backend │  │ Backend │  │ Backend │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
            ┌─────▼──────┐
            │  Redis     │  (shared state)
            │  Postgres  │  (persistence)
            └────────────┘
```

---

## Troubleshooting Deployments

### 502 Bad Gateway
- Backend not running
- Check: `docker-compose ps`
- Check: `docker-compose logs backend`

### Cannot Connect to WebSocket
- Backend port not exposed
- Check firewall rules
- Verify `VITE_WS_URL` points to correct domain

### Build Fails
```bash
# Clear cache
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose up --build
```

### High Memory Usage
- Check for connection leaks
- Monitor with: `docker stats`
- Restart container: `docker-compose restart backend`

---

## CI/CD Pipeline Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build backend
        run: docker build -t ${{ secrets.REGISTRY }}/backend:latest ./backend
      
      - name: Build frontend  
        run: docker build -t ${{ secrets.REGISTRY }}/frontend:latest ./frontend
      
      - name: Push images
        run: |
          docker push ${{ secrets.REGISTRY }}/backend:latest
          docker push ${{ secrets.REGISTRY }}/frontend:latest
      
      - name: Deploy to production
        run: docker-compose -H ${{ secrets.PROD_HOST }} up -d
```

---

## Rollback Strategy

```bash
# Keep previous version tagged
docker tag myrepo/backend:v1.0 myrepo/backend:v0.9-stable

# To rollback
docker-compose down
docker-compose up -d --pull always  # Pulls v0.9-stable
```

---

**Ready to deploy? Start with Option A (Docker Compose) for safe local testing first!**
