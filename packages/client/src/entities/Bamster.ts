import Phaser from 'phaser';
import {
  BAMSTER_SPEED,
  BAMSTER_JUMP_VELOCITY,
  NORMAL_FIRE_COOLDOWN,
  RAPID_FIRE_COOLDOWN,
  SPREAD_SHOT_ANGLE,
  SNEAKERS_JUMP_MULTIPLIER,
  POWERUP_DURATION,
  PLAY_AREA_WIDTH,
  FRAME_WIDTH,
} from '@bamster/shared';
import type { WeaponType } from '@bamster/shared';
import { Laser } from './Laser';

export class Bamster extends Phaser.Physics.Arcade.Sprite {
  public playerId: string;
  public health: number = 1;
  public jumpPower: number = 1;
  public weaponType: WeaponType = 'basic';
  public score: number = 0;
  public isAlive: boolean = true;
  public facingRight: boolean = true;

  private lastFireTime: number = 0;
  private laserGroup: Phaser.Physics.Arcade.Group;
  private canJump: boolean = true;

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
    body.setBounce(0);
    body.setDragX(1000);
    body.setAllowGravity(true);
    body.setSize(32, 40);
    body.setOffset(8, 4);
  }

  moveLeft(): void {
    this.setVelocityX(-BAMSTER_SPEED);
    this.facingRight = false;
    this.setTexture('bamster_left');
  }

  moveRight(): void {
    this.setVelocityX(BAMSTER_SPEED);
    this.facingRight = true;
    this.setTexture('bamster');
  }

  stopMoving(): void {
    this.setVelocityX(0);
  }

  jump(): boolean {
    if (!this.canJump) {
      return false;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const jumpVelocity = BAMSTER_JUMP_VELOCITY * this.jumpPower;
    body.setVelocityY(jumpVelocity);
    this.canJump = false;
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
    });
  }

  takeDamage(): boolean {
    this.health -= 1;

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
    let textureName: string;

    if (onGround) {
      // On ground - use normal sprite
      textureName = this.facingRight ? 'bamster' : 'bamster_left';
    } else if (velocityY < -50) {
      // Going up (jumping) - use jump sprite
      textureName = this.facingRight ? 'bamster_jump' : 'bamster_left_jump';
    } else if (velocityY > 50) {
      // Falling - use fall sprite
      textureName = this.facingRight ? 'bamster_fall' : 'bamster_left_fall';
    } else {
      // Near apex of jump - use normal sprite
      textureName = this.facingRight ? 'bamster' : 'bamster_left';
    }

    // Only change if different to avoid unnecessary updates
    if (this.texture.key !== textureName) {
      this.setTexture(textureName);
    }
  }
}
