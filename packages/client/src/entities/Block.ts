import Phaser from 'phaser';
import { BLOCK_SIZE, BLOCK_FALL_SPEED, GAME_HEIGHT, BLOCK_HP, FRAME_WIDTH } from '@bamster/shared';
import type { BlockColor } from '@bamster/shared';

export class Block extends Phaser.Physics.Arcade.Sprite {
  public blockId: string;
  public color: BlockColor;
  public clusterId: string;
  public isResting: boolean = false;
  public hp: number;
  public maxHp: number;

  private static idCounter = 0;
  private hpText?: Phaser.GameObjects.Text;
  private targetFallSpeed: number = BLOCK_FALL_SPEED;

  constructor(scene: Phaser.Scene, x: number, y: number, color: BlockColor) {
    super(scene, x, y, `block_${color}`);

    this.blockId = `block_${Block.idCounter++}`;
    this.color = color;
    this.clusterId = this.blockId; // Initially its own cluster

    // Set HP based on color
    this.maxHp = BLOCK_HP[color] ?? 3;
    this.hp = this.maxHp;

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

    // Create HP indicator
    this.createHpIndicator();
  }

  private createHpIndicator(): void {
    this.hpText = this.scene.add.text(this.x, this.y, `${this.hp}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.hpText.setOrigin(0.5);
    this.hpText.setDepth(10);
  }

  private updateHpIndicator(): void {
    if (this.hpText) {
      this.hpText.setPosition(this.x, this.y);
      this.hpText.setText(`${this.hp}`);
    }
  }

  takeDamage(): boolean {
    this.hp -= 1;

    // Flash effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
    });

    this.updateHpIndicator();

    if (this.hp <= 0) {
      return true; // Block should be destroyed
    }

    // Darken the block as it takes damage
    const damageRatio = this.hp / this.maxHp;
    this.setAlpha(0.5 + damageRatio * 0.5);

    return false; // Block still alive
  }

  setFallSpeed(speed: number): void {
    this.targetFallSpeed = speed;
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

    // Snap X to grid (accounting for frame offset)
    const gridX = Math.floor((this.x - FRAME_WIDTH) / BLOCK_SIZE);
    this.x = FRAME_WIDTH + gridX * BLOCK_SIZE + BLOCK_SIZE / 2;

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

  update(): void {
    // Keep HP indicator positioned on block
    this.updateHpIndicator();

    // Maintain fall speed for falling blocks (physics collisions can slow them down)
    if (!this.isResting) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y !== this.targetFallSpeed) {
        body.velocity.y = this.targetFallSpeed;
      }
    }
  }

  destroyBlock(): void {
    // Clean up HP text
    if (this.hpText) {
      this.hpText.destroy();
    }

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
