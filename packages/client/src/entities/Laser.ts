import Phaser from 'phaser';
import { LASER_SPEED } from '@bamster/shared';

export class Laser extends Phaser.Physics.Arcade.Sprite {
  public laserId: string;
  public ownerId: string;
  public isPiercing: boolean;
  public hitBlocks: Set<string> = new Set();

  private static idCounter = 0;
  private velocityX: number;
  private velocityY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: number,
    angleOffset: number,
    ownerId: string,
    isPiercing: boolean = false
  ) {
    super(scene, x, y, 'laser');

    this.laserId = `laser_${Laser.idCounter++}`;
    this.ownerId = ownerId;
    this.isPiercing = isPiercing;

    // Add to scene display list
    scene.add.existing(this);

    // Calculate velocity based on direction and angle
    const angleRad = Phaser.Math.DegToRad(angleOffset);
    this.velocityX = Math.cos(angleRad) * LASER_SPEED * direction;
    this.velocityY = angleOffset !== 0 ? Math.sin(angleRad) * LASER_SPEED : 0;

    // Rotate sprite to match direction
    this.setRotation(Math.atan2(this.velocityY, this.velocityX));

    // Flip if going left
    if (direction < 0) {
      this.setFlipX(true);
    }

    // Add glow effect for piercing laser
    if (isPiercing) {
      this.setTint(0x00ffff);
      this.setScale(1.5, 1);
    }
  }

  // Call this after adding to a physics group
  initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      body.setSize(16, 8);
      body.setVelocity(this.velocityX, this.velocityY);
    }
  }

  update(): void {
    // Destroy if off screen
    if (
      this.x < -50 ||
      this.x > this.scene.scale.width + 50 ||
      this.y < -50 ||
      this.y > this.scene.scale.height + 50
    ) {
      this.destroy();
    }
  }

  hitBlock(blockId: string): boolean {
    if (this.hitBlocks.has(blockId)) {
      return false; // Already hit this block
    }

    this.hitBlocks.add(blockId);

    if (!this.isPiercing) {
      this.destroy();
    }

    return true;
  }
}
