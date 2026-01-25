import Phaser from 'phaser';
import { LASER_SPEED, PLAY_AREA_WIDTH, FRAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';

export class Laser extends Phaser.Physics.Arcade.Sprite {
  public laserId: string;
  public ownerId: string;
  public isPiercing: boolean;
  public hitBlocks: Set<string> = new Set();
  public bouncing: boolean = false;
  public bounceCount: number = 0;
  public maxBounces: number = 3;

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
    // Destroy if outside game frame (not just browser window)
    const minX = FRAME_WIDTH;
    const maxX = FRAME_WIDTH + PLAY_AREA_WIDTH;
    const minY = FRAME_WIDTH;
    const maxY = GAME_HEIGHT - FRAME_WIDTH;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Handle bouncing off side walls
    if (this.bouncing && this.bounceCount < this.maxBounces) {
      if (this.x <= minX || this.x >= maxX) {
        // Bounce off wall - reverse X velocity
        this.velocityX = -this.velocityX;
        body.setVelocityX(this.velocityX);

        // Keep inside bounds
        this.x = this.x <= minX ? minX + 1 : maxX - 1;

        // Update sprite rotation to match new direction
        this.setRotation(Math.atan2(this.velocityY, this.velocityX));
        this.setFlipX(this.velocityX < 0);

        this.bounceCount++;
        return;
      }
    }

    // Destroy if outside bounds (top/bottom always, left/right if not bouncing)
    if (this.y < minY || this.y > maxY) {
      this.destroy();
      return;
    }

    if (this.x < minX || this.x > maxX) {
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
