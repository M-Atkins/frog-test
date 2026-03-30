# 🐸 Froggy Forest — Multiplayer

Two-player low-poly frog adventure. No auth, no persistence — just frogs.

## Project structure

```
frog-multiplayer/
├── client/
│   └── index.html      ← deploy to Netlify (drag & drop)
└── server/
    ├── index.js        ← WebSocket server
    └── package.json    ← deploy to Railway
```

---

## 1 · Deploy the WebSocket server → Railway

1. Push this repo to GitHub (or just the `server/` folder as its own repo)
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select the repo (point root to `server/` if needed, or set **Root Directory** to `server`)
4. Railway auto-detects Node and runs `npm start`
5. Go to **Settings → Networking → Generate Domain**
6. Copy the domain — it'll look like `frog-ws-server-production.up.railway.app`

> **Free tier note:** Railway gives $5/mo free credit, plenty for a quick demo.

---

## 2 · Deploy the frontend → Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag the `client/` folder into the drop zone
3. Done — your game is live in seconds

---

## 3 · Play

1. Open the Netlify URL in **two browser tabs** (or share with a friend)
2. Paste your Railway WebSocket URL into the input field:
   ```
   wss://your-server.up.railway.app
   ```
3. Click **Hop In** on both tabs
4. Move with **Arrow Keys** (or WASD)

Each player gets a randomly coloured frog with a floating `🐸 #id` nametag.

---

## Running locally (no cloud needed)

```bash
# Terminal 1 — start the WS server
cd server
npm install
npm start
# → 🐸 Frog WS server running on port 8080

# Terminal 2 — serve the frontend
cd client
npx serve .
# or just open index.html in a browser

# In the game, enter:
ws://localhost:8080
```

---

## How it works

- Server tracks connected clients, assigns each a random hue and an ID
- On connect: server sends `welcome` (your id+hue) + `peer_joined` for each existing player
- While moving: client sends `{ type: "move", x, y, z, ry }` at ~20fps
- Server forwards as `peer_move` to all other clients
- On disconnect: server broadcasts `peer_left`
- Client interpolates remote frog positions each frame for smooth movement
# frog-test
