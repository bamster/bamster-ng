import { describe, expect, it } from 'vitest';
import { BLOCK_SIZE } from '@bamster/shared';
import { Block } from '../schema/GameState';
import { areOrthogonalNeighbors, isPlayerInput } from '../rooms/GameRoom';

function blockAt(x: number, y: number): Block {
  const block = new Block();
  block.x = x;
  block.y = y;
  return block;
}

describe('GameRoom input validation', () => {
  it('accepts complete boolean input', () => {
    expect(isPlayerInput({ left: false, right: true, jump: false, shoot: true })).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isPlayerInput(null)).toBe(false);
    expect(isPlayerInput({ left: true })).toBe(false);
    expect(isPlayerInput({ left: true, right: false, jump: false, shoot: 'yes' })).toBe(false);
  });
});

describe('GameRoom block adjacency', () => {
  const center = blockAt(100, 100);

  it('accepts horizontal and vertical neighbors', () => {
    expect(areOrthogonalNeighbors(center, blockAt(100 + BLOCK_SIZE, 100))).toBe(true);
    expect(areOrthogonalNeighbors(center, blockAt(100, 100 + BLOCK_SIZE))).toBe(true);
  });

  it('rejects diagonal and distant blocks', () => {
    expect(areOrthogonalNeighbors(center, blockAt(100 + BLOCK_SIZE, 100 + BLOCK_SIZE))).toBe(false);
    expect(areOrthogonalNeighbors(center, blockAt(100 + BLOCK_SIZE * 2, 100))).toBe(false);
  });
});
