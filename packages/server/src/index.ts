import { createServer } from 'http';
import express from 'express';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import { SERVER_PORT } from '@bamster/shared';

const app = express();

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Colyseus monitor (admin UI)
app.use('/colyseus', monitor());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register game room
gameServer.define('game', GameRoom);
gameServer.define('quickmatch', GameRoom).enableRealtimeListing();

httpServer.listen(SERVER_PORT, () => {
  console.log(`BAMster server listening on port ${SERVER_PORT}`);
  console.log(`Monitor available at http://localhost:${SERVER_PORT}/colyseus`);
});
