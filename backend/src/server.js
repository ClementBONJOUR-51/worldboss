require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const WebSocket = require('ws');
const bossManager = require('./bossManager');
const qteService = require('./qteService');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/boss', (req, res) => {
  const state = bossManager.getState();
  console.log('GET /boss - connectedPlayers:', state.connectedPlayers, 'count:', state.connectedPlayers?.length || 0);
  res.json(state);
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws._clientId = clientId;
  
  // Register player as connected
  bossManager.registerPlayer(clientId);

  // send initial state
  ws.send(JSON.stringify({ type: 'welcome', data: { playerId: clientId } }));
  ws.send(JSON.stringify({ type: 'state', data: bossManager.getState() }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'click') {
        const pid = msg.playerId || ws._clientId;
        const now = Date.now();

        if (!bossManager.consumeAmmo(pid, 1)) {
          ws.send(JSON.stringify({
            type: 'click_result',
            data: {
              ok: false,
              reason: 'no_ammo',
              damage: 0,
              clickId: msg.clickId || null,
              x: msg.x ?? null,
              y: msg.y ?? null
            }
          }));
          ws.send(JSON.stringify({
            type: 'qte_result',
            data: {
              ok: false,
              reason: 'no_ammo',
              damage: 0,
              cooldownRemainingMs: 0
            }
          }));
          return;
        }

        const clickDamage = bossManager.getClickDamagePerClick();
        bossManager.registerClick(pid, clickDamage);
        ws.send(JSON.stringify({
          type: 'click_result',
          data: {
            ok: true,
            reason: 'queued',
            damage: clickDamage,
            clickId: msg.clickId || null,
            x: msg.x ?? null,
            y: msg.y ?? null
          }
        }));

        if (!qteService.isOnCooldown(pid, now)) {
          const qte = qteService.maybeGrantQte(pid, now, {
            enabled: bossManager.isFrontlineCampActive(),
            ...bossManager.getQteModifiers()
          });
          if (qte) {
            ws.send(JSON.stringify({
              type: 'qte_grant',
              data: {
                qteId: qte.id,
                tier: qte.tier,
                color: qte.color,
                expiresAt: qte.expiresAt
              }
            }));
          }
        }
      }

      if (msg.type === 'qte_hit') {
        const pid = msg.playerId || ws._clientId;
        const now = Date.now();
        const qteId = msg.qteId;
        const result = qteService.validateHit(pid, qteId, now);

        if (result.ok) {
          const damageResult = bossManager.applyInstantDamage(pid, result.damage);
          ws.send(JSON.stringify({
            type: 'qte_result',
            data: {
              ok: damageResult.applied,
              reason: damageResult.applied ? 'success' : damageResult.reason,
              damage: damageResult.applied ? result.damage : 0,
              tier: result.tier,
              cooldownRemainingMs: qteService.getCooldownRemainingMs(pid, now)
            }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'qte_result',
            data: {
              ok: false,
              reason: result.reason,
              damage: 0,
              cooldownRemainingMs: qteService.getCooldownRemainingMs(pid, now)
            }
          }));
        }
      }

      if (msg.type === 'structure_build') {
        const pid = msg.playerId || ws._clientId;
        const structureKey = msg.structureKey;
        bossManager.registerPlayer(pid);
        const result = bossManager.registerStructureBuild(structureKey, 1);
        ws.send(JSON.stringify({
          type: 'structure_build_result',
          data: result
        }));
      }

      if (msg.type === 'set_emote') {
        const pid = msg.playerId || ws._clientId;
        const emote = msg.emote;
        const result = bossManager.setPlayerEmote(pid, emote);
        ws.send(JSON.stringify({
          type: 'set_emote_result',
          data: result
        }));
      }
    } catch (err) {
      console.error('ws message error', err);
    }
  });

  ws.on('close', () => {
    bossManager.unregisterPlayer(clientId);
    qteService.clearPlayer(clientId);
    // Broadcast updated player list
    broadcast({ type: 'state', data: bossManager.getState() });
  });
});

function broadcast(obj) {
  const raw = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(raw);
  });
}

bossManager.on('update', (state) => {
  broadcast({ type: 'state', data: state });
});

bossManager.on('combat_tick', (data) => {
  broadcast({ type: 'combat_tick', data });
});

bossManager.on('dead', ({ boss, contributions }) => {
  const fullState = bossManager.getState();
  broadcast({ type: 'dead', data: fullState });
  // reset after short delay for POC
  setTimeout(() => {
    bossManager.resetBoss();
    broadcast({ type: 'state', data: bossManager.getState() });
  }, 5000);
});

bossManager.start();

const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const HOST = process.env.HOST || process.env.BACKEND_HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🎮 Backend Server running at http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}`);
  console.log(`📊 REST API endpoint: http://${HOST}:${PORT}/boss`);
});
