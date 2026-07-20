export default function createSocket(onMessage) {
  // Get WS URL from environment or auto-detect
  const wsUrl = import.meta.env.VITE_WS_URL || constructWsUrl()
  
  function constructWsUrl() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const port = import.meta.env.VITE_BACKEND_PORT || '3001'
    return `${protocol}//${location.hostname}:${port}`
  }

  const ws = new WebSocket(wsUrl)

  ws.addEventListener('open', () => {
    console.log('✅ WebSocket connected to', wsUrl)
  })
  
  ws.addEventListener('error', (error) => {
    console.error('❌ WebSocket error:', error)
  })
  
  ws.addEventListener('close', () => {
    console.log('⚠️ WebSocket disconnected')
  })
  
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      onMessage(msg)
    } catch (err) {
      console.error('invalid ws message', err)
    }
  })

  function sendClick(playerId, clickId, x, y) {
    const payload = { type: 'click', playerId, clickId, x, y }
    ws.send(JSON.stringify(payload))
  }

  function sendQteHit(qteId, playerId) {
    const payload = { type: 'qte_hit', qteId, playerId }
    ws.send(JSON.stringify(payload))
  }

  function sendStructureBuild(structureKey, playerId) {
    const payload = { type: 'structure_build', structureKey, playerId }
    ws.send(JSON.stringify(payload))
  }

  function sendEmote(emote, playerId) {
    const payload = { type: 'set_emote', emote, playerId }
    ws.send(JSON.stringify(payload))
  }

  function close() {
    try { ws.close() } catch (e) { /* ignore */ }
  }

  return { sendClick, sendQteHit, sendStructureBuild, sendEmote, close }
}
