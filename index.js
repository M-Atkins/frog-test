const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

const clients = new Map();
let nextId = 1;

function broadcast(senderId, message) {
  const data = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== senderId && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const hue = Math.floor(Math.random() * 360);
  clients.set(id, { ws, hue });

  console.log(`[+] Player ${id} connected (${clients.size} online)`);

  ws.send(JSON.stringify({ type: 'welcome', id, hue }));

  for (const [otherId, other] of clients) {
    if (otherId === id) continue;
    ws.send(JSON.stringify({
      type: 'peer_joined',
      id: otherId,
      hue: other.hue,
      x: other.x ?? 0,
      y: other.y ?? 0.7,
      z: other.z ?? 0,
      ry: other.ry ?? 0,
    }));
  }

  broadcast(id, { type: 'peer_joined', id, hue, x: 0, y: 0.7, z: 0, ry: 0 });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'move') {
        const c = clients.get(id);
        if (c) { c.x = msg.x; c.y = msg.y; c.z = msg.z; c.ry = msg.ry; }
        broadcast(id, { type: 'peer_move', id, x: msg.x, y: msg.y, z: msg.z, ry: msg.ry });
      } else if (msg.type === 'chat') {
        // Sanitise: strip tags, cap length
        const text = String(msg.text || '').replace(/</g, '&lt;').trim().slice(0, 80);
        if (text) {
          // Echo back to sender too so they see their own bubble
          const payload = JSON.stringify({ type: 'chat', id, text });
          for (const [, client] of clients) {
            if (client.ws.readyState === 1) client.ws.send(payload);
          }
          console.log(`[chat] #${id}: ${text}`);
        }
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast(id, { type: 'peer_left', id });
    console.log(`[-] Player ${id} disconnected (${clients.size} online)`);
  });
});

console.log(`🐸 Frog WS server running on port ${PORT}`);
