import Phaser from 'phaser';
import {
  BLOCK_SIZE,
  BLOCK_COLORS,
  BLOCK_SPAWN_INTERVAL,
  BLOCK_SPAWN_INTERVAL_MIN,
  BLOCK_FALL_SPEED,
  BLOCK_FALL_SPEED_INCREMENT,
  POWERUP_SPAWN_CHANCE,
  SCORE_PER_BLOCK,
  COMBO_MULTIPLIER,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '@bamster/shared';
import type { BlockColor, PowerUpType } from '@bamster/shared';
import { Block } from '../entities/Block';
import { PowerUp } from '../entities/PowerUp';

export class BlockSpawner {
  private scene: Phaser.Scene;
  private blockGroup: Phaser.Physics.Arcade.Group;
  private powerUpGroup: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private gameStartTime: number;
  private currentFallSpeed: number = BLOCK_FALL_SPEED;
  private currentSpawnInterval: number = BLOCK_SPAWN_INTERVAL;

  constructor(
    scene: Phaser.Scene,
    blockGroup: Phaser.Physics.Arcade.Group,
    powerUpGroup: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.blockGroup = blockGroup;
    this.powerUpGroup = powerUpGroup;
    this.gameStartTime = scene.time.now;
  }

  start(): void {
    this.scheduleNextSpawn();
  }

  createInitialFloor(rows: number = 2): void {
    const gridColumns = Math.floor(GAME_WIDTH / BLOCK_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const x = col * BLOCK_SIZE + BLOCK_SIZE / 2;
        const y = GAME_HEIGHT - BLOCK_SIZE / 2 - row * BLOCK_SIZE;

        const color = BLOCK_COLORS[
          Phaser.Math.Between(0, BLOCK_COLORS.length - 1)
        ] as BlockColor;

        const block = new Block(this.scene, x, y, color);
        block.setVelocity(0, 0); // Stop falling
        block.land(y); // Mark as resting at exact position
        this.blockGroup.add(block);
      }
    }

    // Merge adjacent same-color blocks
    const blocks = this.blockGroup.children.getArray() as Block[];
    blocks.forEach((block) => this.tryMergeBlocks(block));
  }

  stop(): void {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
  }

  private scheduleNextSpawn(): void {
    this.spawnTimer = this.scene.time.delayedCall(
      this.currentSpawnInterval,
      () => {
        this.spawn();
        this.updateDifficulty();
        this.scheduleNextSpawn();
      }
    );
  }

  private spawn(): void {
    // Calculate random X position (grid-aligned)
    const gridColumns = Math.floor(GAME_WIDTH / BLOCK_SIZE);
    const column = Phaser.Math.Between(0, gridColumns - 1);
    const x = column * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = -BLOCK_SIZE;

    // Chance to spawn power-up instead
    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      this.spawnPowerUp(x, y);
    } else {
      this.spawnBlock(x, y);
    }
  }

  private spawnBlock(x: number, y: number): Block {
    const color = BLOCK_COLORS[
      Phaser.Math.Between(0, BLOCK_COLORS.length - 1)
    ] as BlockColor;
    const block = new Block(this.scene, x, y, color);
    block.setFallSpeed(this.currentFallSpeed);
    this.blockGroup.add(block);
    return block;
  }

  private spawnPowerUp(x: number, y: number): PowerUp {
    const types: PowerUpType[] = [
      'corn',
      'sneakers',
      'rapid',
      'spread',
      'piercing',
    ];
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    const powerUp = new PowerUp(this.scene, x, y, type);
    this.powerUpGroup.add(powerUp);
    return powerUp;
  }

  private updateDifficulty(): void {
    const elapsedMinutes = (this.scene.time.now - this.gameStartTime) / 60000;

    // Increase fall speed over time
    this.currentFallSpeed =
      BLOCK_FALL_SPEED + BLOCK_FALL_SPEED_INCREMENT * elapsedMinutes;

    // Decrease spawn interval over time (faster spawning)
    this.currentSpawnInterval = Math.max(
      BLOCK_SPAWN_INTERVAL_MIN,
      BLOCK_SPAWN_INTERVAL - elapsedMinutes * 200
    );

    // Update existing falling blocks
    this.blockGroup.children.each((block) => {
      const b = block as Block;
      if (!b.isResting) {
        b.setFallSpeed(this.currentFallSpeed);
      }
      return true;
    });
  }

  checkBlockLanding(
    block: Block,
    collidedWith: Phaser.Physics.Arcade.Sprite
  ): void {
    if (block.isResting) return;

    // Calculate target Y position: directly on top of the block we collided with
    const targetY = collidedWith.y - BLOCK_SIZE;

    // Land the block at the calculated position
    block.land(targetY);

    // Try to merge with adjacent same-color blocks
    this.tryMergeBlocks(block);
  }

  landBlockOnGround(block: Block): void {
    if (block.isResting) return;

    // Land on top of the ground (ground is at GAME_HEIGHT - BLOCK_SIZE/2)
    // Block center should be one BLOCK_SIZE above ground center
    const targetY = GAME_HEIGHT - BLOCK_SIZE - BLOCK_SIZE / 2;
    block.land(targetY);
    this.tryMergeBlocks(block);
  }

  private tryMergeBlocks(block: Block): void {
    const restingBlocks = this.blockGroup.children
      .getArray()
      .filter((b) => (b as Block).isResting && b !== block) as Block[];

    const adjacentSameColor = restingBlocks.filter((other) => {
      if (other.color !== block.color) return false;

      const dx = Math.abs(other.x - block.x);
      const dy = Math.abs(other.y - block.y);

      // Check if adjacent (including diagonals for more merging)
      return dx <= BLOCK_SIZE && dy <= BLOCK_SIZE && (dx > 0 || dy > 0);
    });

    if (adjacentSameColor.length > 0) {
      // Find the cluster to join (use smallest clusterId for consistency)
      let targetClusterId = block.clusterId;
      for (const other of adjacentSameColor) {
        if (other.clusterId < targetClusterId) {
          targetClusterId = other.clusterId;
        }
      }

      // Merge all into the target cluster
      block.mergeIntoCluster(targetClusterId);
      for (const other of adjacentSameColor) {
        // Also merge any blocks in this block's cluster
        const otherClusterId = other.clusterId;
        restingBlocks.forEach((b) => {
          if (b.clusterId === otherClusterId) {
            b.mergeIntoCluster(targetClusterId);
          }
        });
        other.mergeIntoCluster(targetClusterId);
      }
    }
  }

  destroyCluster(clusterId: string): { count: number; score: number } {
    const blocksInCluster = this.blockGroup.children
      .getArray()
      .filter((b) => (b as Block).clusterId === clusterId) as Block[];

    const count = blocksInCluster.length;
    const baseScore = count * SCORE_PER_BLOCK;
    const comboBonus =
      count > 1 ? Math.floor(baseScore * (COMBO_MULTIPLIER - 1) * count) : 0;
    const totalScore = baseScore + comboBonus;

    blocksInCluster.forEach((block) => {
      block.destroyBlock();
    });

    return { count, score: totalScore };
  }

  getBlocks(): Block[] {
    return this.blockGroup.children.getArray() as Block[];
  }

  getPowerUps(): PowerUp[] {
    return this.powerUpGroup.children.getArray() as PowerUp[];
  }
}
