// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Physics
export const GRAVITY = 800;
export const BAMSTER_SPEED = 200;
export const BAMSTER_JUMP_VELOCITY = -400;
export const BLOCK_FALL_SPEED = 100;
export const BLOCK_FALL_SPEED_INCREMENT = 5; // Speed increase per minute
export const LASER_SPEED = 600;

// Block settings
export const BLOCK_SIZE = 40;
export const BLOCK_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'] as const;
export const BLOCK_SPAWN_INTERVAL = 2000; // ms
export const BLOCK_SPAWN_INTERVAL_MIN = 500; // minimum ms between spawns

// Power-up settings
export const POWERUP_DURATION = 30000; // 30 seconds for timed power-ups
export const POWERUP_SPAWN_CHANCE = 0.1; // 10% chance instead of block
export const CORN_HEALTH_BONUS = 1;
export const SNEAKERS_JUMP_MULTIPLIER = 1.5;

// Weapon settings
export const RAPID_FIRE_COOLDOWN = 100; // ms
export const NORMAL_FIRE_COOLDOWN = 300; // ms
export const SPREAD_SHOT_ANGLE = 15; // degrees

// Scoring
export const SCORE_PER_BLOCK = 10;
export const COMBO_MULTIPLIER = 1.5; // multiplier for merged block bonus

// Network
export const SERVER_PORT = 2567;
export const TICK_RATE = 20; // Server updates per second

// Player controls
export const PLAYER1_KEYS = {
  left: 'LEFT',
  right: 'RIGHT',
  up: 'UP',
  jump: 'SPACE',
  shoot: 'Z',
} as const;

export const PLAYER2_KEYS = {
  left: 'J',
  right: 'L',
  up: 'I',
  jump: 'I',
  shoot: 'U',
} as const;
