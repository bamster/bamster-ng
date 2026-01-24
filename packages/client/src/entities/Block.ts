import Phaser from 'phaser';
import { BLOCK_SIZE, BLOCK_FALL_SPEED, GAME_HEIGHT } from '@bamster/shared';
import type { BlockColor } from '@bamster/shared';

export class Block extends Phaser.Physics.Arcade.Sprite {
  public blockId: string;
  public color: BlockColor;
  public clusterId: string;
  public isResting: boolean = false;

  private static idCounter = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, color: BlockColor) {
    super(scene, x, y, `block_${color}`);

    this.blockId = `block_${Block.idCounter++}`;
    this.color = color;
    this.clusterId = this.blockId; // Initially its own cluster

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false); // We control falling manually
    body.setImmovable(false);
    body.setBounce(0, 0);
    body.setSize(BLOCK_SIZE - 2, BLOCK_SIZE - 2); // Slightly smaller to avoid edge collisions
    body.setOffset(1, 1);

    // Start falling
    this.setVelocityY(BLOCK_FALL_SPEED);
  }

  setFallSpeed(speed: number): void {
    if (!this.isResting) {
      this.setVelocityY(speed);
    }
  }

  land(targetY?: number): void {
    if (this.isResting) return;

    this.isResting = true;
    this.setVelocity(0, 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setVelocity(0, 0);

    // Snap X to grid
    const gridX = Math.floor(this.x / BLOCK_SIZE);
    this.x = gridX * BLOCK_SIZE + BLOCK_SIZE / 2;

    // Snap Y to the target position or calculate from current position
    if (targetY !== undefined) {
      this.y = targetY;
    } else {
      // Snap to nearest grid position from bottom
      const gridY = Math.floor((GAME_HEIGHT - this.y) / BLOCK_SIZE);
      this.y = GAME_HEIGHT - gridY * BLOCK_SIZE - BLOCK_SIZE / 2;
    }

    // Sync physics body with sprite position
    body.reset(this.x, this.y);
  }

  mergeIntoCluster(clusterId: string): void {
    this.clusterId = clusterId;
  }

  destroyBlock(): void {
    // Visual effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
