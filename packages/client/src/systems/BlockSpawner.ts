import Phaser from 'phaser';
import {
  BLOCK_SIZE,
  BLOCK_COLORS,
  BLOCK_HP,
  BLOCK_SPAWN_INTERVAL,
  BLOCK_SPAWN_INTERVAL_MIN,
  BLOCK_SPAWN_INTERVAL_DECREASE,
  BLOCK_FALL_SPEED,
  BLOCK_FALL_SPEED_INCREMENT,
  POWERUP_SPAWN_CHANCE,
  SCORE_PER_BLOCK,
  COMBO_MULTIPLIER,
  PLAY_AREA_WIDTH,
  GAME_HEIGHT,
  FRAME_WIDTH,
} from '@bamster/shared';
import type { BlockColor, PowerUpType } from '@bamster/shared';
import { Block } from '../entities/Block';
import { PowerUp } from '../entities/PowerUp';

export interface DifficultyConfig {
  blockFallSpeed: number;
  blockSpawnInterval: number;
  blockSpawnIntervalMin: number;
}

export class BlockSpawner {
  private scene: Phaser.Scene;
  private blockGroup: Phaser.Physics.Arcade.Group;
  private powerUpGroup: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private gameStartTime: number;
  private baseFallSpeed: number = BLOCK_FALL_SPEED;
  private baseSpawnInterval: number = BLOCK_SPAWN_INTERVAL;
  private minSpawnInterval: number = BLOCK_SPAWN_INTERVAL_MIN;
  private currentFallSpeed: number = BLOCK_FALL_SPEED;
  private currentSpawnInterval: number = BLOCK_SPAWN_INTERVAL;

  // Track HP per cluster (merged blocks share HP pool)
  private clusterHp: Map<string, number> = new Map();

  // Early game power-up tracking
  private spawnCount: number = 0;
  private earlyPowerUpSpawned: boolean = false;

  constructor(
    scene: Phaser.Scene,
    blockGroup: Phaser.Physics.Arcade.Group,
    powerUpGroup: Phaser.Physics.Arcade.Group,
    difficultyConfig?: DifficultyConfig
  ) {
    this.scene = scene;
    this.blockGroup = blockGroup;
    this.powerUpGroup = powerUpGroup;
    this.gameStartTime = scene.time.now;

    // Apply difficulty config if provided
    if (difficultyConfig) {
      this.baseFallSpeed = difficultyConfig.blockFallSpeed;
      this.baseSpawnInterval = difficultyConfig.blockSpawnInterval;
      this.minSpawnInterval = difficultyConfig.blockSpawnIntervalMin;
      this.currentFallSpeed = this.baseFallSpeed;
      this.currentSpawnInterval = this.baseSpawnInterval;
    }
  }

  // Get cluster HP
  getClusterHp(clusterId: string): number {
    return this.clusterHp.get(clusterId) ?? 0;
  }

  // Damage a cluster, returns true if cluster is destroyed
  damageCluster(clusterId: string, damage: number = 1): boolean {
    const currentHp = this.clusterHp.get(clusterId) ?? 0;
    const newHp = currentHp - damage;

    if (newHp <= 0) {
      this.clusterHp.delete(clusterId);
      return true; // Cluster destroyed
    }

    this.clusterHp.set(clusterId, newHp);

    // Update HP display on all blocks in cluster
    const blocks = this.getBlocksInCluster(clusterId);
    blocks.forEach(block => {
      block.hp = newHp;
      block.maxHp = newHp; // Update so display shows correct ratio
    });

    return false;
  }

  // Get all blocks in a cluster
  getBlocksInCluster(clusterId: string): Block[] {
    return this.blockGroup.children
      .getArray()
      .filter((b) => (b as Block).clusterId === clusterId) as Block[];
  }

  // Get block count in a cluster
  getClusterSize(clusterId: string): number {
    return this.getBlocksInCluster(clusterId).length;
  }

  start(): void {
    this.scheduleNextSpawn();
  }

  createInitialFloor(rows: number = 2): void {
    const usableWidth = PLAY_AREA_WIDTH - FRAME_WIDTH * 2;
    const gridColumns = Math.floor(usableWidth / BLOCK_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const x = FRAME_WIDTH + col * BLOCK_SIZE + BLOCK_SIZE / 2;
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
    this.spawnCount++;

    // Calculate random X position (grid-aligned within play area)
    const usableWidth = PLAY_AREA_WIDTH - FRAME_WIDTH * 2;
    const gridColumns = Math.floor(usableWidth / BLOCK_SIZE);
    const column = Phaser.Math.Between(0, gridColumns - 1);
    const x = FRAME_WIDTH + column * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = -BLOCK_SIZE;

    // Determine if we should spawn a power-up
    let shouldSpawnPowerUp = false;

    // Guarantee first power-up between spawns 5-8 (gives player time to adjust)
    if (!this.earlyPowerUpSpawned && this.spawnCount >= 5 && this.spawnCount <= 8) {
      // Increasing chance: 25% at spawn 5, 50% at 6, 75% at 7, guaranteed at 8
      const earlyChance = (this.spawnCount - 4) * 0.25;
      if (Math.random() < earlyChance) {
        shouldSpawnPowerUp = true;
        this.earlyPowerUpSpawned = true;
      }
    }

    // Regular power-up chance (higher in early game)
    if (!shouldSpawnPowerUp) {
      // Double power-up chance for first 20 spawns
      const effectiveChance =
        this.spawnCount <= 20 ? POWERUP_SPAWN_CHANCE * 2 : POWERUP_SPAWN_CHANCE;
      shouldSpawnPowerUp = Math.random() < effectiveChance;
    }

    if (shouldSpawnPowerUp) {
      this.spawnPowerUp(x, y);
      if (!this.earlyPowerUpSpawned) {
        this.earlyPowerUpSpawned = true;
      }
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

    // Initialize cluster HP for the new block (so it has proper HP while falling)
    this.clusterHp.set(block.clusterId, block.hp);

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
      this.baseFallSpeed + BLOCK_FALL_SPEED_INCREMENT * elapsedMinutes;

    // Decrease spawn interval over time (faster spawning)
    this.currentSpawnInterval = Math.max(
      this.minSpawnInterval,
      this.baseSpawnInterval - elapsedMinutes * BLOCK_SPAWN_INTERVAL_DECREASE
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

      // Check if adjacent (horizontally or vertically only, not diagonals)
      // Horizontal neighbor: same row (dy small), adjacent column (dx ~ BLOCK_SIZE)
      const isHorizontalNeighbor = dy < BLOCK_SIZE * 0.5 && dx > BLOCK_SIZE * 0.5 && dx < BLOCK_SIZE * 1.5;
      // Vertical neighbor: same column (dx small), adjacent row (dy ~ BLOCK_SIZE)
      const isVerticalNeighbor = dx < BLOCK_SIZE * 0.5 && dy > BLOCK_SIZE * 0.5 && dy < BLOCK_SIZE * 1.5;

      return isHorizontalNeighbor || isVerticalNeighbor;
    });

    if (adjacentSameColor.length > 0) {
      // Find the cluster to join (use smallest clusterId for consistency)
      let targetClusterId = block.clusterId;
      for (const other of adjacentSameColor) {
        if (other.clusterId < targetClusterId) {
          targetClusterId = other.clusterId;
        }
      }

      // Calculate new cluster HP with diminishing returns
      // Formula: baseHp + (blockCount - 1) × baseHp × 0.5
      // This creates a trade-off: fused blocks have less total HP than separate blocks
      const mergingClusterIds = new Set<string>([block.clusterId]);
      adjacentSameColor.forEach(other => mergingClusterIds.add(other.clusterId));

      let blockCount = 0;
      mergingClusterIds.forEach(clusterId => {
        blockCount += this.getClusterSize(clusterId);
        if (clusterId !== targetClusterId) {
          this.clusterHp.delete(clusterId); // Clean up old cluster HP
        }
      });

      // Diminishing returns: 50% bonus per additional block (not full HP)
      const baseHp = BLOCK_HP[block.color] ?? 3;
      const newClusterHp = Math.ceil(baseHp + (blockCount - 1) * baseHp * 0.5);
      this.clusterHp.set(targetClusterId, newClusterHp);

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

      // Update HP display on all blocks in cluster
      const clusterBlocks = this.getBlocksInCluster(targetClusterId);
      clusterBlocks.forEach(b => {
        b.hp = newClusterHp;
        b.maxHp = newClusterHp;
      });
    } else {
      // No merge - initialize this block's cluster HP
      this.clusterHp.set(block.clusterId, block.hp);
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

    // After a short delay, check for unsupported blocks that should fall
    this.scene.time.delayedCall(200, () => {
      this.dropUnsupportedBlocks();
    });

    return { count, score: totalScore };
  }

  private dropUnsupportedBlocks(): void {
    const restingBlocks = this.blockGroup.children
      .getArray()
      .filter((b) => (b as Block).isResting && b.active) as Block[];

    // Ground level (top of ground platform)
    const groundY = GAME_HEIGHT - BLOCK_SIZE;

    // Check each resting block for support
    restingBlocks.forEach((block) => {
      // If block is at ground level, it's supported
      if (block.y >= groundY - BLOCK_SIZE / 2) {
        return;
      }

      // Check if there's another block directly below
      const hasSupport = restingBlocks.some((other) => {
        if (other === block || !other.active) return false;
        // Other block should be directly below (same X, Y is one block lower)
        const sameColumn = Math.abs(other.x - block.x) < BLOCK_SIZE * 0.5;
        const oneBlockBelow =
          other.y > block.y &&
          other.y - block.y < BLOCK_SIZE * 1.5 &&
          other.y - block.y > BLOCK_SIZE * 0.5;
        return sameColumn && oneBlockBelow;
      });

      if (!hasSupport) {
        // Make block fall again
        block.isResting = false;
        const body = block.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(false);
        body.setVelocityY(this.currentFallSpeed);
      }
    });
  }

  getBlocks(): Block[] {
    return this.blockGroup.children.getArray() as Block[];
  }

  getPowerUps(): PowerUp[] {
    return this.powerUpGroup.children.getArray() as PowerUp[];
  }
}
