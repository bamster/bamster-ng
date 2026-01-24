import { Client, Room } from 'colyseus.js';
import { SERVER_PORT } from '@bamster/shared';

export interface NetworkState {
  players: Map<string, PlayerNetState>;
  blocks: Map<string, BlockNetState>;
  powerUps: Map<string, PowerUpNetState>;
  lasers: Map<string, LaserNetState>;
  gameTime: number;
  isRunning: boolean;
  isGameOver: boolean;
  winnerId: string;
}

export interface PlayerNetState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  health: number;
  jumpPower: number;
  weaponType: string;
  isAlive: boolean;
  facingRight: boolean;
  isReady: boolean;
}

export interface BlockNetState {
  id: string;
  x: number;
  y: number;
  color: string;
  clusterId: string;
  isResting: boolean;
}

export interface PowerUpNetState {
  id: string;
  x: number;
  y: number;
  powerUpType: string;
}

export interface LaserNetState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  isPiercing: boolean;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
}

type StateChangeCallback = (state: NetworkState) => void;
type ConnectionCallback = (playerId: string) => void;
type ErrorCallback = (error: Error) => void;

export class NetworkManager {
  private client: Client;
  private room?: Room;
  private localPlayerId?: string;

  private onStateChange?: StateChangeCallback;
  private onConnected?: ConnectionCallback;
  private onDisconnected?: () => void;
  private onError?: ErrorCallback;

  constructor() {
    // Default to localhost, can be configured for production
    const serverUrl =
      import.meta.env.VITE_SERVER_URL || `ws://localhost:${SERVER_PORT}`;
    this.client = new Client(serverUrl);
  }

  async joinOrCreate(roomName: string = 'game'): Promise<string> {
    try {
      this.room = await this.client.joinOrCreate(roomName);
      this.localPlayerId = this.room.sessionId;

      this.setupRoomListeners();

      if (this.onConnected) {
        this.onConnected(this.localPlayerId);
      }

      return this.localPlayerId;
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
      throw error;
    }
  }

  async joinById(roomId: string): Promise<string> {
    try {
      this.room = await this.client.joinById(roomId);
      this.localPlayerId = this.room.sessionId;

      this.setupRoomListeners();

      if (this.onConnected) {
        this.onConnected(this.localPlayerId);
      }

      return this.localPlayerId;
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
      throw error;
    }
  }

  async quickMatch(): Promise<string> {
    return this.joinOrCreate('quickmatch');
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      if (this.onStateChange) {
        this.onStateChange(this.convertState(state));
      }
    });

    this.room.onLeave(() => {
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    this.room.onError((code, message) => {
      if (this.onError) {
        this.onError(new Error(`Room error ${code}: ${message}`));
      }
    });

    this.room.onMessage('restart', () => {
      // Handle restart notification
    });
  }

  private convertState(state: any): NetworkState {
    const players = new Map<string, PlayerNetState>();
    const blocks = new Map<string, BlockNetState>();
    const powerUps = new Map<string, PowerUpNetState>();
    const lasers = new Map<string, LaserNetState>();

    state.players.forEach((player: any, id: string) => {
      players.set(id, {
        id: player.id,
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        score: player.score,
        health: player.health,
        jumpPower: player.jumpPower,
        weaponType: player.weaponType,
        isAlive: player.isAlive,
        facingRight: player.facingRight,
        isReady: player.isReady,
      });
    });

    state.blocks.forEach((block: any, id: string) => {
      blocks.set(id, {
        id: block.id,
        x: block.x,
        y: block.y,
        color: block.color,
        clusterId: block.clusterId,
        isResting: block.isResting,
      });
    });

    state.powerUps.forEach((powerUp: any, id: string) => {
      powerUps.set(id, {
        id: powerUp.id,
        x: powerUp.x,
        y: powerUp.y,
        powerUpType: powerUp.powerUpType,
      });
    });

    state.lasers.forEach((laser: any, id: string) => {
      lasers.set(id, {
        id: laser.id,
        x: laser.x,
        y: laser.y,
        vx: laser.vx,
        vy: laser.vy,
        ownerId: laser.ownerId,
        isPiercing: laser.isPiercing,
      });
    });

    return {
      players,
      blocks,
      powerUps,
      lasers,
      gameTime: state.gameTime,
      isRunning: state.isRunning,
      isGameOver: state.isGameOver,
      winnerId: state.winnerId,
    };
  }

  sendInput(input: PlayerInput): void {
    if (this.room) {
      this.room.send('input', input);
    }
  }

  sendReady(): void {
    if (this.room) {
      this.room.send('ready');
    }
  }

  sendRestart(): void {
    if (this.room) {
      this.room.send('restart');
    }
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = undefined;
    }
  }

  getLocalPlayerId(): string | undefined {
    return this.localPlayerId;
  }

  getRoomId(): string | undefined {
    return this.room?.id;
  }

  isConnected(): boolean {
    return !!this.room;
  }

  setOnStateChange(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  setOnConnected(callback: ConnectionCallback): void {
    this.onConnected = callback;
  }

  setOnDisconnected(callback: () => void): void {
    this.onDisconnected = callback;
  }

  setOnError(callback: ErrorCallback): void {
    this.onError = callback;
  }
}
