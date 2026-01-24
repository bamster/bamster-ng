import Phaser from 'phaser';
import {
  BAMSTER_SPEED,
  BAMSTER_JUMP_VELOCITY,
  BAMSTER_STARTING_HEALTH,
  NORMAL_FIRE_COOLDOWN,
  RAPID_FIRE_COOLDOWN,
  SPREAD_SHOT_ANGLE,
  SNEAKERS_JUMP_MULTIPLIER,
  POWERUP_DURATION,
  PLAY_AREA_WIDTH,
  FRAME_WIDTH,
  COYOTE_TIME,
} from '@bamster/shared';
import type { WeaponType } from '@bamster/shared';
import { Laser } from './Laser';
import { getSound } from '../systems/SoundManager';

export class Bamster extends Phaser.Physics.Arcade.Sprite {
  public playerId: string;
  public health: number = BAMSTER_STARTING_HEALTH;
  public jumpPower: number = 1;
  public weaponType: WeaponType = 'basic';
  public score: number = 0;
  public isAlive: boolean = true;
  public facingRight: boolean = true;

  private lastFireTime: number = 0;
  private laserGroup: Phaser.Physics.Arcade.Group;
  private canJump: boolean = true;
  private lastGroundedTime: number = 0; // For coyote time

  private sneakersTimer?: Phaser.Time.TimerEvent;
  private weaponTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: string,
    laserGroup: Phaser.Physics.Arcade.Group
  ) {
    super(scene, x, y, 'bamster');

    this.playerId = playerId;
    this.laserGroup = laserGroup;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false); // Allow falling off
    body.setBounce(0.05); // Tiny bounce for liveliness
    body.setDragX(750); // Reduced for more sliding momentum
    body.setAllowGravity(true);
    body.setSize(32, 40);
    body.setOffset(8, 4);
  }

  moveLeft(): void {
    this.setVelocityX(-BAMSTER_SPEED);
    this.facingRight = false;
    // Sprite/animation is handled by updateSprite()
  }

  moveRight(): void {
    this.setVelocityX(BAMSTER_SPEED);
    this.facingRight = true;
    // Sprite/animation is handled by updateSprite()
  }

  stopMoving(): void {
    this.setVelocityX(0);
  }

  jump(): boolean {
    const now = this.scene.time.now;
    const withinCoyoteTime = now - this.lastGroundedTime < COYOTE_TIME;

    if (!this.canJump && !withinCoyoteTime) {
      return false;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const jumpVelocity = BAMSTER_JUMP_VELOCITY * this.jumpPower;
    body.setVelocityY(jumpVelocity);
    this.canJump = false;
    this.lastGroundedTime = 0; // Reset to prevent double-jump from coyote time
    getSound().play('jump');
    return true;
  }

  shoot(): Laser[] {
    const now = this.scene.time.now;
    const cooldown =
      this.weaponType === 'rapid' ? RAPID_FIRE_COOLDOWN : NORMAL_FIRE_COOLDOWN;

    if (now - this.lastFireTime < cooldown) {
      return [];
    }

    this.lastFireTime = now;
    getSound().play('laser');
    const lasers: Laser[] = [];

    const offsetX = this.facingRight ? 24 : -24;
    const direction = this.facingRight ? 1 : -1;

    if (this.weaponType === 'spread') {
      // Shoot 3 lasers in a fan (spread shot is never piercing)
      const angles = [-SPREAD_SHOT_ANGLE, 0, SPREAD_SHOT_ANGLE];
      for (const angle of angles) {
        const laser = new Laser(
          this.scene,
          this.x + offsetX,
          this.y,
          direction,
          angle,
          this.playerId,
          false
        );
        this.laserGroup.add(laser);
        laser.initPhysics();
        lasers.push(laser);
      }
    } else {
      const laser = new Laser(
        this.scene,
        this.x + offsetX,
        this.y,
        direction,
        0,
        this.playerId,
        this.weaponType === 'piercing'
      );
      this.laserGroup.add(laser);
      laser.initPhysics();
      lasers.push(laser);
    }

    return lasers;
  }

  collectCorn(): void {
    this.health += 1;
    // Visual feedback - grow slightly
    this.setScale(1 + (this.health - 1) * 0.1);
  }

  collectSneakers(): void {
    // Clear existing timer if any
    if (this.sneakersTimer) {
      this.sneakersTimer.destroy();
    }

    this.jumpPower = SNEAKERS_JUMP_MULTIPLIER;

    // Add visual indicator
    this.setTint(0x88ffff);

    this.sneakersTimer = this.scene.time.delayedCall(POWERUP_DURATION, () => {
      this.jumpPower = 1;
      this.clearTint();
      this.sneakersTimer = undefined;
    });
  }

  collectWeapon(type: 'rapid' | 'spread' | 'piercing'): void {
    // Clear existing timer if any
    if (this.weaponTimer) {
      this.weaponTimer.destroy();
    }

    this.weaponType = type;

    // Add visual indicator based on weapon type
    const tints: Record<string, number> = {
      rapid: 0xff8888,
      spread: 0x88ff88,
      piercing: 0xaa88ff,
    };
    this.setTint(tints[type]);

    this.weaponTimer = this.scene.time.delayedCall(POWERUP_DURATION, () => {
      this.weaponType = 'basic';
      this.clearTint();
      this.weaponTimer = undefined;
    });
  }

  /** Get remaining time for sneakers power-up (0-1 fraction, or 0 if not active) */
  getSneakersTimeRemaining(): number {
    if (!this.sneakersTimer) return 0;
    const remaining = this.sneakersTimer.getRemaining();
    return remaining / POWERUP_DURATION;
  }

  /** Get remaining time for weapon power-up (0-1 fraction, or 0 if not active) */
  getWeaponTimeRemaining(): number {
    if (!this.weaponTimer) return 0;
    const remaining = this.weaponTimer.getRemaining();
    return remaining / POWERUP_DURATION;
  }

  /** Check if sneakers power-up is active */
  hasSneakers(): boolean {
    return this.jumpPower > 1;
  }

  /** Check if weapon power-up is active */
  hasWeaponPowerUp(): boolean {
    return this.weaponType !== 'basic';
  }

  takeDamage(): boolean {
    this.health -= 1;
    getSound().play('damage');

    if (this.health <= 0) {
      this.die();
      return true;
    }

    // Visual feedback
    this.setScale(1 + (this.health - 1) * 0.1);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });

    return false;
  }

  die(): void {
    this.isAlive = false;
    this.setActive(false);
    this.setVisible(false);

    // Clean up timers
    if (this.sneakersTimer) {
      this.sneakersTimer.destroy();
    }
    if (this.weaponTimer) {
      this.weaponTimer.destroy();
    }
  }

  addScore(points: number): void {
    this.score += points;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Only reset jump when actually touching ground (physics flags)
    // Don't use velocity check as it can be 0 at apex of jump
    const onGround = body.blocked.down || body.touching.down;

    if (onGround) {
      this.canJump = true;
      this.lastGroundedTime = this.scene.time.now; // Track for coyote time
    }

    // Update sprite based on velocity (cape animation)
    this.updateSprite(body.velocity.y, onGround);

    // Keep within play area horizontal bounds (accounting for frame)
    const halfWidth = 16; // Half of sprite width
    const minX = FRAME_WIDTH + halfWidth;
    const maxX = PLAY_AREA_WIDTH - FRAME_WIDTH - halfWidth;
    if (this.x < minX) {
      this.x = minX;
      this.setVelocityX(0);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.setVelocityX(0);
    }

    // Check if fallen off screen (bottom only)
    if (this.y > this.scene.scale.height + 100) {
      if (this.isAlive) {
        this.die();
      }
    }
  }

  private updateSprite(velocityY: number, onGround: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMovingHorizontally = Math.abs(body.velocity.x) > 10;

    if (onGround) {
      if (isMovingHorizontally) {
        // Running - play run animation
        const animKey = this.facingRight ? 'bamster_run' : 'bamster_left_run';
        if (this.anims.currentAnim?.key !== animKey) {
          this.play(animKey);
        }
      } else {
        // Standing still - use idle sprite
        this.stop();
        const textureName = this.facingRight ? 'bamster' : 'bamster_left';
        if (this.texture.key !== textureName) {
          this.setTexture(textureName);
        }
      }
    } else if (velocityY < -50) {
      // Going up (jumping) - use jump sprite
      this.stop();
      const textureName = this.facingRight ? 'bamster_jump' : 'bamster_left_jump';
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    } else if (velocityY > 50) {
      // Falling - use fall sprite
      this.stop();
      const textureName = this.facingRight ? 'bamster_fall' : 'bamster_left_fall';
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    } else {
      // Near apex of jump - use normal sprite
      this.stop();
      const textureName = this.facingRight ? 'bamster' : 'bamster_left';
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    }
  }
}
