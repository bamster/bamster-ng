import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, Block, PowerUp, Laser } from '../schema/GameState';

describe('Player Schema', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  it('should initialize with default values', () => {
    expect(player.id).toBe('');
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
    expect(player.score).toBe(0);
    expect(player.health).toBe(1);
    expect(player.isAlive).toBe(true);
    expect(player.weaponType).toBe('basic');
    expect(player.jumpPower).toBe(1);
    expect(player.isReady).toBe(false);
  });

  it('should allow setting position', () => {
    player.x = 100;
    player.y = 200;
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  it('should allow setting velocity', () => {
    player.vx = 50;
    player.vy = -100;
    expect(player.vx).toBe(50);
    expect(player.vy).toBe(-100);
  });

  it('should allow updating health', () => {
    player.health = 3;
    expect(player.health).toBe(3);
    player.health -= 1;
    expect(player.health).toBe(2);
  });
});

describe('Block Schema', () => {
  let block: Block;

  beforeEach(() => {
    block = new Block();
  });

  it('should initialize with default values', () => {
    expect(block.id).toBe('');
    expect(block.x).toBe(0);
    expect(block.y).toBe(0);
    expect(block.color).toBe('');
    expect(block.clusterId).toBe('');
    expect(block.isResting).toBe(false);
  });

  it('should allow setting block properties', () => {
    block.id = 'block_1';
    block.x = 160;
    block.y = 400;
    block.color = 'magenta';
    block.clusterId = 'cluster_1';
    block.isResting = true;

    expect(block.id).toBe('block_1');
    expect(block.x).toBe(160);
    expect(block.y).toBe(400);
    expect(block.color).toBe('magenta');
    expect(block.clusterId).toBe('cluster_1');
    expect(block.isResting).toBe(true);
  });
});

describe('PowerUp Schema', () => {
  let powerUp: PowerUp;

  beforeEach(() => {
    powerUp = new PowerUp();
  });

  it('should initialize with default values', () => {
    expect(powerUp.id).toBe('');
    expect(powerUp.x).toBe(0);
    expect(powerUp.y).toBe(0);
    expect(powerUp.powerUpType).toBe('');
  });

  it('should allow setting power-up type', () => {
    powerUp.powerUpType = 'corn';
    expect(powerUp.powerUpType).toBe('corn');

    powerUp.powerUpType = 'sneakers';
    expect(powerUp.powerUpType).toBe('sneakers');

    powerUp.powerUpType = 'rapid';
    expect(powerUp.powerUpType).toBe('rapid');
  });
});

describe('Laser Schema', () => {
  let laser: Laser;

  beforeEach(() => {
    laser = new Laser();
  });

  it('should initialize with default values', () => {
    expect(laser.id).toBe('');
    expect(laser.x).toBe(0);
    expect(laser.y).toBe(0);
    expect(laser.vx).toBe(0);
    expect(laser.vy).toBe(0);
    expect(laser.ownerId).toBe('');
    expect(laser.isPiercing).toBe(false);
  });

  it('should allow setting laser properties', () => {
    laser.id = 'laser_1';
    laser.ownerId = 'player_1';
    laser.vx = 600;
    laser.isPiercing = true;

    expect(laser.id).toBe('laser_1');
    expect(laser.ownerId).toBe('player_1');
    expect(laser.vx).toBe(600);
    expect(laser.isPiercing).toBe(true);
  });
});

describe('GameState Schema', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
  });

  it('should initialize with empty collections', () => {
    expect(state.players.size).toBe(0);
    expect(state.blocks.size).toBe(0);
    expect(state.powerUps.size).toBe(0);
    expect(state.lasers.size).toBe(0);
  });

  it('should initialize game state flags', () => {
    expect(state.gameTime).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.isGameOver).toBe(false);
    expect(state.winnerId).toBe('');
  });

  it('should allow adding players', () => {
    const player = new Player();
    player.id = 'player_1';
    state.players.set('player_1', player);

    expect(state.players.size).toBe(1);
    expect(state.players.get('player_1')).toBe(player);
  });

  it('should allow adding blocks', () => {
    const block = new Block();
    block.id = 'block_1';
    state.blocks.set('block_1', block);

    expect(state.blocks.size).toBe(1);
    expect(state.blocks.get('block_1')).toBe(block);
  });

  it('should allow removing entities', () => {
    const player = new Player();
    player.id = 'player_1';
    state.players.set('player_1', player);

    expect(state.players.size).toBe(1);

    state.players.delete('player_1');
    expect(state.players.size).toBe(0);
  });

  it('should allow updating game state', () => {
    state.isRunning = true;
    state.gameTime = 1000;

    expect(state.isRunning).toBe(true);
    expect(state.gameTime).toBe(1000);
  });

  it('should track game over with winner', () => {
    state.isGameOver = true;
    state.winnerId = 'player_2';

    expect(state.isGameOver).toBe(true);
    expect(state.winnerId).toBe('player_2');
  });
});
