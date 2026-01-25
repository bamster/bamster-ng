// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PLAY_AREA_WIDTH = 568; // 14 blocks * 40px + 8px frame (4px each side)
export const FRAME_WIDTH = 4;

// Physics
export const GRAVITY = 800;
export const BAMSTER_SPEED = 220;
export const BAMSTER_JUMP_VELOCITY = -440;
export const COYOTE_TIME = 100; // ms - grace period for jumping after leaving platform
export const BAMSTER_STARTING_HEALTH = 3;
export const DAMAGE_INVINCIBILITY_DURATION = 1200; // ms - invincibility frames after taking damage
export const BLOCK_FALL_SPEED = 120;
export const BLOCK_FALL_SPEED_INCREMENT = 15; // Speed increase per minute
export const LASER_SPEED = 600;

// Block settings
export const BLOCK_SIZE = 40;
// 80s neon colors
export const BLOCK_COLORS = ['magenta', 'cyan', 'lime', 'orange', 'violet'] as const;

// Block HP by color (how many hits to destroy)
export const BLOCK_HP: Record<string, number> = {
  magenta: 3,
  cyan: 2,
  lime: 2,
  orange: 3,
  violet: 4,
};
export const BLOCK_SPAWN_INTERVAL = 1200; // ms - starting interval
export const BLOCK_SPAWN_INTERVAL_MIN = 400; // minimum ms between spawns
export const BLOCK_SPAWN_INTERVAL_DECREASE = 300; // ms decrease per minute

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
  jump: 'UP',
  shoot: 'SPACE',
} as const;

export const PLAYER2_KEYS = {
  left: 'J',
  right: 'L',
  up: 'I',
  jump: 'I',
  shoot: 'U',
} as const;
