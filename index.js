const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// Map of id -> { ws, state }
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
  // Pick a random hue for this player's frog
  const hue = Math.floor(Math.random() * 360);
  clients.set(id, { ws, hue });

  console.log(`[+] Player ${id} connected (${clients.size} online)`);

  // Tell this client their own id & colour
  ws.send(JSON.stringify({ type: 'welcome', id, hue }));

  // Tell this client about all existing players
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

  // Tell everyone else this player joined
  broadcast(id, { type: 'peer_joined', id, hue, x: 0, y: 0.7, z: 0, ry: 0 });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'move') {
        // Cache latest position
        const c = clients.get(id);
        if (c) { c.x = msg.x; c.y = msg.y; c.z = msg.z; c.ry = msg.ry; }
        // Forward to everyone else
        broadcast(id, { type: 'peer_move', id, x: msg.x, y: msg.y, z: msg.z, ry: msg.ry });
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
