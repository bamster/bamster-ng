import Phaser from 'phaser';
import { BLOCK_FALL_SPEED } from '@bamster/shared';
import type { PowerUpType } from '@bamster/shared';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public powerUpId: string;
  public powerUpType: PowerUpType;
  public isCollected: boolean = false;

  private static idCounter = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, `powerup_${type}`);

    this.powerUpId = `powerup_${PowerUp.idCounter++}`;
    this.powerUpType = type;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Fall slower than blocks
    this.setVelocityY(BLOCK_FALL_SPEED * 0.7);

    // Ensure power-ups render above blocks
    this.setDepth(10);

    // Scale up for better visibility
    this.setScale(1.25);

    // Add pulsing glow animation (no static tint that washes out colors)
    scene.tweens.add({
      targets: this,
      alpha: { from: 0.8, to: 1 },
      scale: { from: 1.2, to: 1.35 },
      duration: 400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  collect(): void {
    // Prevent multiple collections during animation
    if (this.isCollected) return;
    this.isCollected = true;

    // Disable physics body immediately to prevent further collisions
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    // Visual effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  update(): void {
    // Destroy if off screen
    if (this.y > this.scene.scale.height + 50) {
      this.destroy();
    }
  }
}
