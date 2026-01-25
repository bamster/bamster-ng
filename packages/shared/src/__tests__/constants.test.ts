import { describe, it, expect } from 'vitest';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAY_AREA_WIDTH,
  FRAME_WIDTH,
  BLOCK_SIZE,
  BLOCK_COLORS,
  BLOCK_HP,
  BAMSTER_STARTING_HEALTH,
  BAMSTER_SPEED,
  BAMSTER_JUMP_VELOCITY,
  GRAVITY,
  LASER_SPEED,
  POWERUP_DURATION,
  SCORE_PER_BLOCK,
  RAPID_FIRE_COOLDOWN,
  NORMAL_FIRE_COOLDOWN,
} from '../constants';

describe('Game Dimensions', () => {
  it('should have valid game dimensions', () => {
    expect(GAME_WIDTH).toBeGreaterThan(0);
    expect(GAME_HEIGHT).toBeGreaterThan(0);
    expect(GAME_WIDTH).toBe(800);
    expect(GAME_HEIGHT).toBe(600);
  });

  it('should have play area smaller than game width', () => {
    expect(PLAY_AREA_WIDTH).toBeLessThanOrEqual(GAME_WIDTH);
    expect(PLAY_AREA_WIDTH).toBeGreaterThan(0);
  });

  it('should have frame width that fits in play area', () => {
    expect(FRAME_WIDTH).toBeGreaterThanOrEqual(0);
    expect(FRAME_WIDTH * 2).toBeLessThan(PLAY_AREA_WIDTH);
  });
});

describe('Block Settings', () => {
  it('should have valid block size', () => {
    expect(BLOCK_SIZE).toBeGreaterThan(0);
    expect(BLOCK_SIZE).toBe(40);
  });

  it('should have at least 3 block colors', () => {
    expect(BLOCK_COLORS.length).toBeGreaterThanOrEqual(3);
  });

  it('should have HP defined for all block colors', () => {
    BLOCK_COLORS.forEach((color) => {
      expect(BLOCK_HP[color]).toBeDefined();
      expect(BLOCK_HP[color]).toBeGreaterThan(0);
    });
  });

  it('should have play area divisible by block size (with frame)', () => {
    const usableWidth = PLAY_AREA_WIDTH - FRAME_WIDTH * 2;
    expect(usableWidth % BLOCK_SIZE).toBeLessThanOrEqual(BLOCK_SIZE);
  });
});

describe('BAMster Settings', () => {
  it('should have valid starting health', () => {
    expect(BAMSTER_STARTING_HEALTH).toBeGreaterThan(0);
    expect(BAMSTER_STARTING_HEALTH).toBe(3);
  });

  it('should have positive movement speed', () => {
    expect(BAMSTER_SPEED).toBeGreaterThan(0);
  });

  it('should have negative jump velocity (upward)', () => {
    expect(BAMSTER_JUMP_VELOCITY).toBeLessThan(0);
  });

  it('should have positive gravity', () => {
    expect(GRAVITY).toBeGreaterThan(0);
  });
});

describe('Weapon Settings', () => {
  it('should have positive laser speed', () => {
    expect(LASER_SPEED).toBeGreaterThan(0);
  });

  it('should have rapid fire faster than normal fire', () => {
    expect(RAPID_FIRE_COOLDOWN).toBeLessThan(NORMAL_FIRE_COOLDOWN);
  });

  it('should have positive fire cooldowns', () => {
    expect(RAPID_FIRE_COOLDOWN).toBeGreaterThan(0);
    expect(NORMAL_FIRE_COOLDOWN).toBeGreaterThan(0);
  });
});

describe('Powerup Settings', () => {
  it('should have reasonable powerup duration', () => {
    expect(POWERUP_DURATION).toBeGreaterThan(1000); // At least 1 second
    expect(POWERUP_DURATION).toBeLessThanOrEqual(60000); // At most 1 minute
  });
});

describe('Scoring', () => {
  it('should have positive score per block', () => {
    expect(SCORE_PER_BLOCK).toBeGreaterThan(0);
  });
});
