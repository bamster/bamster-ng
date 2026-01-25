import Phaser from 'phaser';
import type { Achievement } from '../systems/AchievementManager';
import { getSound } from '../systems/SoundManager';
import { GAME_WIDTH } from '@bamster/shared';

// 80s color palette
const COLORS = {
  background: 0x1a0a2e,
  border: 0xff00ff,
  borderGlow: 0xff88ff,
  textNeon: 0x00ffff,
  textGold: 0xffd700,
  textWhite: 0xffffff,
};

/**
 * AchievementPopup - Displays achievement unlock notifications
 * Shows a retro-styled popup that slides in from the top
 */
export class AchievementPopup {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private queue: Achievement[] = [];
  private isShowing: boolean = false;

  private static readonly POPUP_WIDTH = 300;
  private static readonly POPUP_HEIGHT = 80;
  private static readonly SHOW_DURATION = 4000; // 4 seconds
  private static readonly SLIDE_DURATION = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show an achievement notification
   * If already showing, queues the achievement
   */
  show(achievement: Achievement): void {
    this.queue.push(achievement);

    if (!this.isShowing) {
      this.showNext();
    }
  }

  /**
   * Show the next achievement in queue
   */
  private showNext(): void {
    const achievement = this.queue.shift();
    if (!achievement) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    this.createPopup(achievement);
  }

  /**
   * Create and animate the popup
   */
  private createPopup(achievement: Achievement): void {
    // Clean up existing container
    if (this.container) {
      this.container.destroy();
    }

    const x = GAME_WIDTH / 2;
    const startY = -AchievementPopup.POPUP_HEIGHT;
    const targetY = 60;

    this.container = this.scene.add.container(x, startY);
    this.container.setDepth(1000); // Above everything

    // Background with neon border
    const bg = this.scene.add.graphics();
    const halfWidth = AchievementPopup.POPUP_WIDTH / 2;
    const halfHeight = AchievementPopup.POPUP_HEIGHT / 2;

    // Outer glow
    bg.fillStyle(COLORS.borderGlow, 0.3);
    bg.fillRoundedRect(-halfWidth - 4, -halfHeight - 4, AchievementPopup.POPUP_WIDTH + 8, AchievementPopup.POPUP_HEIGHT + 8, 10);

    // Main background
    bg.fillStyle(COLORS.background, 0.95);
    bg.fillRoundedRect(-halfWidth, -halfHeight, AchievementPopup.POPUP_WIDTH, AchievementPopup.POPUP_HEIGHT, 8);

    // Neon border
    bg.lineStyle(2, COLORS.border, 1);
    bg.strokeRoundedRect(-halfWidth, -halfHeight, AchievementPopup.POPUP_WIDTH, AchievementPopup.POPUP_HEIGHT, 8);

    // Scanlines effect
    for (let i = 0; i < AchievementPopup.POPUP_HEIGHT; i += 4) {
      bg.fillStyle(0x000000, 0.1);
      bg.fillRect(-halfWidth, -halfHeight + i, AchievementPopup.POPUP_WIDTH, 2);
    }

    this.container.add(bg);

    // Achievement icon - use badge texture if available
    const badgeKey = `badge_${achievement.icon}`;
    const hasBadge = this.scene.textures.exists(badgeKey);

    if (hasBadge) {
      const icon = this.scene.add.image(-halfWidth + 30, 0, badgeKey);
      icon.setScale(1.5);
      this.container.add(icon);

      // Add glow effect to badge
      this.scene.tweens.add({
        targets: icon,
        scaleX: { from: 1.5, to: 1.7 },
        scaleY: { from: 1.5, to: 1.7 },
        duration: 500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      // Fallback to text emoji
      const icon = this.scene.add.text(-halfWidth + 20, 0, achievement.icon, {
        fontSize: '36px',
      });
      icon.setOrigin(0, 0.5);
      this.container.add(icon);
    }

    // "ACHIEVEMENT UNLOCKED" header
    const header = this.scene.add.text(-halfWidth + 70, -20, 'ACHIEVEMENT UNLOCKED', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffd700',
    });
    header.setOrigin(0, 0.5);
    this.container.add(header);

    // Achievement name
    const name = this.scene.add.text(-halfWidth + 70, 0, achievement.name, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0, 0.5);
    this.container.add(name);

    // Achievement description
    const desc = this.scene.add.text(-halfWidth + 70, 18, achievement.description, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      wordWrap: { width: 200 },
    });
    desc.setOrigin(0, 0.5);
    this.container.add(desc);

    // Particle effect
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: { min: -halfWidth, max: halfWidth },
      y: halfHeight,
      lifespan: 800,
      speed: { min: 30, max: 60 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd700, 0x00ffff, 0xff00ff],
      frequency: 100,
      emitting: true,
    });
    this.container.add(particles);

    // Play sound
    getSound().play('powerup');

    // Slide in animation
    this.scene.tweens.add({
      targets: this.container,
      y: targetY,
      duration: AchievementPopup.SLIDE_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Wait then slide out
        this.scene.time.delayedCall(AchievementPopup.SHOW_DURATION - AchievementPopup.SLIDE_DURATION * 2, () => {
          this.slideOut();
        });
      },
    });

    // Pulsing glow effect
    this.scene.tweens.add({
      targets: bg,
      alpha: { from: 1, to: 0.8 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Stop particles after a bit
    this.scene.time.delayedCall(1500, () => {
      particles.stop();
    });
  }

  /**
   * Slide the popup out and show next
   */
  private slideOut(): void {
    if (!this.container) return;

    this.scene.tweens.add({
      targets: this.container,
      y: -AchievementPopup.POPUP_HEIGHT,
      alpha: 0,
      duration: AchievementPopup.SLIDE_DURATION,
      ease: 'Back.easeIn',
      onComplete: () => {
        if (this.container) {
          this.container.destroy();
          this.container = undefined;
        }
        // Show next achievement in queue
        this.showNext();
      },
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.container) {
      this.container.destroy();
      this.container = undefined;
    }
    this.queue = [];
    this.isShowing = false;
  }
}
