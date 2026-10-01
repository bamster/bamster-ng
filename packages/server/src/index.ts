import { createServer } from 'http';
import express from 'express';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import { SERVER_PORT } from '@bamster/shared';

const app = express();

// Use PORT env variable or default
const port = parseInt(process.env.PORT || String(SERVER_PORT), 10);
const isProduction = process.env.NODE_ENV === 'production';

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Never expose the unauthenticated admin UI in production.
if (!isProduction) {
  app.use('/colyseus', monitor());
}

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register game room
gameServer.define('game', GameRoom);
gameServer.define('quickmatch', GameRoom).enableRealtimeListing();
gameServer.define('private', GameRoom);

httpServer.listen(port, () => {
  console.log(`BAMster server listening on port ${port}`);
  if (!isProduction) {
    console.log(`Monitor available at http://localhost:${port}/colyseus`);
  }
});
