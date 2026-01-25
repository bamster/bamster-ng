import { BLOCK_COLORS } from './constants';

export type BlockColor = (typeof BLOCK_COLORS)[number];

export type PowerUpType = 'corn' | 'sneakers' | 'rapid' | 'spread' | 'piercing' | 'bomb' | 'rate' | 'double';

export type WeaponType = 'basic' | 'rapid' | 'spread' | 'piercing';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  health: number;
  jumpPower: number;
  weaponType: WeaponType;
  isAlive: boolean;
  facingRight: boolean;
}

export interface BlockState {
  id: string;
  x: number;
  y: number;
  color: BlockColor;
  clusterId: string;
  isResting: boolean;
  destroyed: boolean;
}

export interface PowerUpState {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
}

export interface LaserState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
}

export interface GameState {
  players: Map<string, PlayerState>;
  blocks: Map<string, BlockState>;
  powerUps: Map<string, PowerUpState>;
  lasers: Map<string, LaserState>;
  gameTime: number;
  isRunning: boolean;
}

// Input messages from client to server
export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
  sequence: number; // For input prediction
}

// Room messages
export type RoomMessage =
  | { type: 'input'; data: PlayerInput }
  | { type: 'ready' }
  | { type: 'restart' };
