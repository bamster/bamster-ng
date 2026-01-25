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
  DAMAGE_INVINCIBILITY_DURATION,
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
  public isDying: boolean = false;
  public facingRight: boolean = true;
  public unlimitedAmmo: boolean = false;
  public invincible: boolean = false;

  private lastFireTime: number = 0;
  private laserGroup: Phaser.Physics.Arcade.Group;
  private canJump: boolean = true;
  private lastGroundedTime: number = 0; // For coyote time

  private sneakersTimer?: Phaser.Time.TimerEvent;
  private weaponTimer?: Phaser.Time.TimerEvent;
  private texturePrefix: string = 'bamster';

  // Power-up visual effect emitters
  private sneakersEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private weaponEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  // Invincibility frames after damage
  private iframesTimer?: Phaser.Time.TimerEvent;
  private iframesFlashTween?: Phaser.Tweens.Tween;

  // Landing detection for dust effect
  private wasInAir: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: string,
    laserGroup: Phaser.Physics.Arcade.Group,
    playerNumber: number = 1
  ) {
    // Player 2 uses different textures (blue cape)
    const texturePrefix = playerNumber === 2 ? 'bamster_p2' : 'bamster';
    super(scene, x, y, texturePrefix);

    this.playerId = playerId;
    this.laserGroup = laserGroup;
    this.texturePrefix = texturePrefix;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Ensure sprite starts with full color (no tint, full alpha)
    this.clearTint();
    this.setAlpha(1);

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

    // Skip cooldown check if unlimited ammo is active
    if (!this.unlimitedAmmo) {
      const cooldown =
        this.weaponType === 'rapid' ? RAPID_FIRE_COOLDOWN : NORMAL_FIRE_COOLDOWN;

      if (now - this.lastFireTime < cooldown) {
        return [];
      }
    }

    this.lastFireTime = now;
    getSound().play('laser');
    const lasers: Laser[] = [];

    const offsetX = this.facingRight ? 24 : -24;
    const direction = this.facingRight ? 1 : -1;

    // Create muzzle flash effect
    this.createMuzzleFlash(offsetX);

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
    // Visual feedback - grow slightly (capped at 1.15x to avoid becoming too large)
    const scaleBonus = Math.min((this.health - 1) * 0.03, 0.15);
    this.setScale(1 + scaleBonus);
  }

  collectSneakers(): void {
    // Clear existing timer if any
    if (this.sneakersTimer) {
      this.sneakersTimer.destroy();
    }

    this.jumpPower = SNEAKERS_JUMP_MULTIPLIER;

    // Brief flash effect instead of persistent tint (preserves color vibrancy)
    this.flashEffect(0x88ffff);

    // Create sneakers particle trail at feet (cyan speed lines)
    this.createSneakersEffect();

    this.sneakersTimer = this.scene.time.delayedCall(POWERUP_DURATION, () => {
      this.jumpPower = 1;
      this.destroySneakersEffect();
      this.sneakersTimer = undefined;
    });
  }

  collectWeapon(type: 'rapid' | 'spread' | 'piercing'): void {
    // Clear existing timer if any
    if (this.weaponTimer) {
      this.weaponTimer.destroy();
    }

    this.weaponType = type;

    // Brief flash effect based on weapon type (preserves color vibrancy)
    const flashColors: Record<string, number> = {
      rapid: 0xff8888,
      spread: 0x88ff88,
      piercing: 0xaa88ff,
    };
    this.flashEffect(flashColors[type]);

    // Create weapon glow effect around gun
    this.createWeaponEffect(type);

    this.weaponTimer = this.scene.time.delayedCall(POWERUP_DURATION, () => {
      this.weaponType = 'basic';
      this.destroyWeaponEffect();
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
    // Invincible players take no damage (includes iframes)
    if (this.invincible) {
      return false;
    }

    this.health -= 1;
    getSound().play('damage');

    if (this.health <= 0) {
      this.die();
      return true;
    }

    // Visual feedback - shrink slightly (capped at 1.15x to avoid becoming too large)
    const scaleBonus = Math.min((this.health - 1) * 0.03, 0.15);
    this.setScale(1 + scaleBonus);

    // Activate invincibility frames to prevent chain-hits
    this.activateIframes();

    return false;
  }

  /** Activate brief invincibility frames after taking damage */
  private activateIframes(): void {
    // Clear existing iframes timer if any
    if (this.iframesTimer) {
      this.iframesTimer.destroy();
    }
    if (this.iframesFlashTween) {
      this.iframesFlashTween.stop();
    }

    // Make player invincible
    this.invincible = true;

    // Flashing effect during iframes
    this.iframesFlashTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.3 },
      duration: 80,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: Math.floor(DAMAGE_INVINCIBILITY_DURATION / 160) - 1,
    });

    // End iframes after duration
    this.iframesTimer = this.scene.time.delayedCall(DAMAGE_INVINCIBILITY_DURATION, () => {
      this.invincible = false;
      this.setAlpha(1); // Ensure alpha is reset
      this.iframesTimer = undefined;
      this.iframesFlashTween = undefined;
    });
  }

  /** Check if player is in invincibility frames (from damage, not power-up) */
  hasIframes(): boolean {
    return this.iframesTimer !== undefined;
  }

  die(): void {
    if (this.isDying) return; // Prevent multiple death triggers
    this.isDying = true;

    // Play death sound
    getSound().play('death');

    // Clean up timers
    if (this.sneakersTimer) {
      this.sneakersTimer.destroy();
    }
    if (this.weaponTimer) {
      this.weaponTimer.destroy();
    }
    if (this.iframesTimer) {
      this.iframesTimer.destroy();
    }
    if (this.iframesFlashTween) {
      this.iframesFlashTween.stop();
    }

    // Clean up power-up visual effects
    this.destroySneakersEffect();
    this.destroyWeaponEffect();

    // Disable physics collisions during death
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = true;

    // Death animation - tumble and fall off screen
    this.scene.tweens.add({
      targets: this,
      angle: { from: 0, to: 720 }, // 2 full spins
      y: this.scene.scale.height + 100, // Fall below screen
      duration: 1500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.isAlive = false;
        this.setActive(false);
        this.setVisible(false);
      },
    });

    // Shrink and fade while falling
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 1500,
      ease: 'Quad.easeIn',
    });
  }

  addScore(points: number): void {
    this.score += points;
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Only reset jump when actually touching ground (physics flags)
    // Don't use velocity check as it can be 0 at apex of jump
    const onGround = body.blocked.down || body.touching.down;

    // Detect landing (was in air, now on ground)
    if (onGround && this.wasInAir) {
      this.createLandingDust();
    }
    this.wasInAir = !onGround;

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

    // Update weapon emitter position based on facing direction
    this.updateWeaponEmitterPosition();
  }

  /** Create sneakers power-up visual effect - cyan particle trail at feet */
  private createSneakersEffect(): void {
    // Destroy existing emitter if any
    this.destroySneakersEffect();

    // Create particle emitter that follows the player
    this.sneakersEmitter = this.scene.add.particles(0, 0, 'particle', {
      follow: this,
      followOffset: { x: 0, y: 18 }, // At feet level
      lifespan: 300,
      speed: { min: 20, max: 50 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00ffff,
      frequency: 50,
      angle: { min: 160, max: 200 }, // Emit mostly downward/backward
      emitting: true,
    });
    this.sneakersEmitter.setDepth(this.depth - 1);
  }

  /** Destroy sneakers visual effect */
  private destroySneakersEffect(): void {
    if (this.sneakersEmitter) {
      this.sneakersEmitter.destroy();
      this.sneakersEmitter = undefined;
    }
  }

  /** Create weapon power-up visual effect - glow particles around gun */
  private createWeaponEffect(type: 'rapid' | 'spread' | 'piercing'): void {
    // Destroy existing emitter if any
    this.destroyWeaponEffect();

    const glowColors: Record<string, number> = {
      rapid: 0xff4400,    // Red/orange for rapid fire
      spread: 0x00ff44,   // Green for spread shot
      piercing: 0x8844ff, // Purple for piercing
    };

    // Create particle emitter that follows the player near gun position
    this.weaponEmitter = this.scene.add.particles(0, 0, 'particle', {
      follow: this,
      followOffset: { x: this.facingRight ? 14 : -14, y: -4 }, // Near gun position
      lifespan: 400,
      speed: { min: 10, max: 30 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: glowColors[type],
      frequency: 80,
      angle: { min: 0, max: 360 }, // Emit in all directions (aura effect)
      emitting: true,
    });
    this.weaponEmitter.setDepth(this.depth - 1);
  }

  /** Destroy weapon visual effect */
  private destroyWeaponEffect(): void {
    if (this.weaponEmitter) {
      this.weaponEmitter.destroy();
      this.weaponEmitter = undefined;
    }
  }

  /** Update weapon emitter position when player changes direction */
  private updateWeaponEmitterPosition(): void {
    if (this.weaponEmitter) {
      this.weaponEmitter.followOffset.x = this.facingRight ? 14 : -14;
    }
  }

  /** Brief flash effect for power-up collection (preserves color vibrancy) */
  private flashEffect(color: number): void {
    this.setTint(color);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
  }

  /** Create muzzle flash effect when shooting */
  private createMuzzleFlash(offsetX: number): void {
    // Determine flash color based on weapon type
    const flashColors: Record<string, number> = {
      basic: 0xffff00,    // Yellow for basic
      rapid: 0xff4400,    // Red/orange for rapid fire
      spread: 0x00ff44,   // Green for spread shot
      piercing: 0x00ffff, // Cyan for piercing
    };
    const color = flashColors[this.weaponType] ?? 0xffff00;

    // Create muzzle flash particle burst
    const flashX = this.x + offsetX;
    const flashY = this.y - 4;

    // Create particle emitter for muzzle flash
    const particles = this.scene.add.particles(flashX, flashY, 'particle', {
      lifespan: 100,
      speed: { min: 50, max: 120 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      angle: this.facingRight ? { min: -30, max: 30 } : { min: 150, max: 210 },
      emitting: false,
    });
    particles.setDepth(this.depth + 1);
    particles.explode(6);

    // Also create a brief glow sprite for extra impact
    const glow = this.scene.add.circle(flashX, flashY, 12, color, 0.8);
    glow.setDepth(this.depth + 1);
    glow.setBlendMode(Phaser.BlendModes.ADD);

    // Animate glow and clean up
    this.scene.tweens.add({
      targets: glow,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 80,
      ease: 'Quad.easeOut',
      onComplete: () => {
        glow.destroy();
      },
    });

    // Clean up particles after they finish
    this.scene.time.delayedCall(150, () => {
      particles.destroy();
    });
  }

  /** Create dust puff effect when landing from a jump */
  private createLandingDust(): void {
    // Position dust at feet level
    const dustX = this.x;
    const dustY = this.y + 20;

    // Create particle emitter for dust puff (80s neon style - purple/magenta)
    const particles = this.scene.add.particles(dustX, dustY, 'particle', {
      lifespan: 250,
      speed: { min: 30, max: 80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xff00ff,
      angle: { min: 200, max: 340 }, // Spread outward and upward
      gravityY: -50, // Float upward slightly
      emitting: false,
    });
    particles.setDepth(this.depth - 1);
    particles.explode(8);

    // Clean up particles after they finish
    this.scene.time.delayedCall(300, () => {
      particles.destroy();
    });
  }

  private updateSprite(velocityY: number, onGround: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMovingHorizontally = Math.abs(body.velocity.x) > 10;
    const p = this.texturePrefix;
    const left = p === 'bamster_p2' ? '_left' : '_left';

    if (onGround) {
      if (isMovingHorizontally) {
        // Running - play run animation
        const animKey = this.facingRight ? `${p}_run` : `${p}${left}_run`;
        if (this.anims.currentAnim?.key !== animKey) {
          this.play(animKey);
        }
      } else {
        // Standing still - use idle sprite
        this.stop();
        const textureName = this.facingRight ? p : `${p}${left}`;
        if (this.texture.key !== textureName) {
          this.setTexture(textureName);
        }
      }
    } else if (velocityY < -50) {
      // Going up (jumping) - use jump sprite
      this.stop();
      const textureName = this.facingRight ? `${p}_jump` : `${p}${left}_jump`;
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    } else if (velocityY > 50) {
      // Falling - use fall sprite
      this.stop();
      const textureName = this.facingRight ? `${p}_fall` : `${p}${left}_fall`;
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    } else {
      // Near apex of jump - use normal sprite
      this.stop();
      const textureName = this.facingRight ? p : `${p}${left}`;
      if (this.texture.key !== textureName) {
        this.setTexture(textureName);
      }
    }
  }
}
