require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initDB, pool } = require('./db');
const { attachToServer } = require('./realtime/partyHub');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/avatar', require('./routes/shop'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dungeon', require('./routes/dungeon'));
app.use('/api/battles', require('./routes/battles'));
app.use('/api/party', require('./routes/party'));
app.use('/api/tavern', require('./routes/tavern'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Attach the multiplayer-party WebSocket server to the same HTTP server so
// it shares the Render port. Clients connect to wss://<host>/ws/party.
attachToServer(server, { pool });

initDB().then(() => {
  server.listen(PORT, () => console.log(`Tickd backend on :${PORT}`));
});
