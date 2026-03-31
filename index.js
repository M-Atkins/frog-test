const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

const clients = new Map();
let nextId = 1;

// Physics objects authoritative state — only player 1 (lowest id) simulates & broadcasts
// All objects indexed by objectId
const physObjects = {}; // objectId -> { x, y, z, qx, qy, qz, qw }

function broadcast(senderId, message) {
  const data = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id !== senderId && client.ws.readyState === 1) client.ws.send(data);
  }
}
function broadcastAll(message) {
  const data = JSON.stringify(message);
  for (const [, client] of clients) {
    if (client.ws.readyState === 1) client.ws.send(data);
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const hue = Math.floor(Math.random() * 360);
  clients.set(id, { ws, hue, name: `Frog #${id}`, x:0, y:0.7, z:0, ry:0 });

  console.log(`[+] Player ${id} connected (${clients.size} online)`);

  // Welcome: tell them their id, hue, and whether they are the physics authority
  const isAuthority = clients.size === 1;
  ws.send(JSON.stringify({ type: 'welcome', id, hue, isAuthority }));

  // Send existing players
  for (const [otherId, other] of clients) {
    if (otherId === id) continue;
    ws.send(JSON.stringify({ type: 'peer_joined', id: otherId, hue: other.hue, name: other.name, x: other.x, y: other.y, z: other.z, ry: other.ry }));
  }

  // Send current physics object states to new player
  if (Object.keys(physObjects).length > 0) {
    ws.send(JSON.stringify({ type: 'phys_snapshot', objects: physObjects }));
  }

  broadcast(id, { type: 'peer_joined', id, hue, name: `Frog #${id}`, x:0, y:0.7, z:0, ry:0 });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'move') {
        const c = clients.get(id);
        if (c) { c.x=msg.x; c.y=msg.y; c.z=msg.z; c.ry=msg.ry; }
        broadcast(id, { type: 'peer_move', id, x:msg.x, y:msg.y, z:msg.z, ry:msg.ry });

      } else if (msg.type === 'set_name') {
        const name = String(msg.name||'').replace(/</g,'&lt;').trim().slice(0,20) || `Frog #${id}`;
        const c = clients.get(id);
        if (c) c.name = name;
        broadcastAll({ type: 'peer_name', id, name });

      } else if (msg.type === 'chat') {
        const text = String(msg.text||'').replace(/</g,'&lt;').trim().slice(0,80);
        if (text) broadcastAll({ type: 'chat', id, text });

      } else if (msg.type === 'phys_update') {
        // Authority client sends bulk physics positions
        if (msg.objects) {
          for (const [oid, state] of Object.entries(msg.objects)) {
            physObjects[oid] = state;
          }
          broadcast(id, { type: 'phys_update', objects: msg.objects });
        }

      } else if (msg.type === 'request_authority') {
        // If authority disconnected, next client can claim it
        const lowestId = Math.min(...clients.keys());
        if (id === lowestId) ws.send(JSON.stringify({ type: 'granted_authority' }));
      }

    } catch (_) {}
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast(id, { type: 'peer_left', id });
    console.log(`[-] Player ${id} disconnected (${clients.size} online)`);
    // Tell lowest remaining client it's now authority
    if (clients.size > 0) {
      const lowestId = Math.min(...clients.keys());
      const lowestClient = clients.get(lowestId);
      if (lowestClient && lowestClient.ws.readyState === 1) {
        lowestClient.ws.send(JSON.stringify({ type: 'granted_authority' }));
      }
    }
  });
});

console.log(`🐸 Frog WS server running on port ${PORT}`);
