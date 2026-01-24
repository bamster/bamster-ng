import Phaser from 'phaser';
import { BLOCK_FALL_SPEED } from '@bamster/shared';
import type { PowerUpType } from '@bamster/shared';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public powerUpId: string;
  public powerUpType: PowerUpType;

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

    // Add floating animation
    scene.tweens.add({
      targets: this,
      y: y + 5,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Add glow effect
    this.setTint(0xffffaa);
  }

  collect(): void {
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
