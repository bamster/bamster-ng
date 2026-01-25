import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { getAchievements, type Achievement } from '../systems/AchievementManager';
import { ALL_ACHIEVEMENTS } from '../data/achievements';

// 80s color palette
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  darkPurple: 0x2a0a4a,
  panelBg: 0x120824,
  locked: 0x444444,
};

const ITEMS_PER_PAGE = 6;

export class AchievementsScene extends Phaser.Scene {
  private currentPage: number = 0;
  private achievementItems: Phaser.GameObjects.Container[] = [];
  private pageText?: Phaser.GameObjects.Text;
  private prevButton?: Phaser.GameObjects.Container;
  private nextButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    // Register all achievements (ensures they're loaded even if game hasn't been played yet)
    const achievementManager = getAchievements();
    achievementManager.registerAchievements(ALL_ACHIEVEMENTS);

    this.currentPage = 0;

    // Dark background with gradient effect
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Add scanlines effect
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      graphics.fillStyle(0x000000, 0.1);
      graphics.fillRect(0, i, GAME_WIDTH, 2);
    }

    // Grid lines (80s style)
    graphics.lineStyle(1, COLORS.neonPink, 0.15);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Title with chrome/neon effect
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 43, 'ACHIEVEMENTS', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 40, 'ACHIEVEMENTS', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Progress stats
    const progress = achievementManager.getProgress();
    const progressText = this.add.text(
      GAME_WIDTH / 2,
      80,
      `${progress.unlocked} / ${progress.total} UNLOCKED`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#00ffff',
      }
    );
    progressText.setOrigin(0.5);

    // Progress bar
    const barWidth = 300;
    const barHeight = 10;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 100;

    graphics.fillStyle(COLORS.darkPurple, 1);
    graphics.fillRect(barX, barY, barWidth, barHeight);
    graphics.lineStyle(2, COLORS.neonPink, 0.8);
    graphics.strokeRect(barX, barY, barWidth, barHeight);

    const fillWidth = (progress.unlocked / Math.max(progress.total, 1)) * barWidth;
    graphics.fillStyle(COLORS.neonCyan, 0.8);
    graphics.fillRect(barX + 2, barY + 2, fillWidth - 4, barHeight - 4);

    // Create achievement list
    this.createAchievementList();

    // Page indicator
    this.pageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    this.pageText.setOrigin(0.5);
    this.updatePageText();

    // Navigation buttons
    this.prevButton = this.createNavButton(GAME_WIDTH / 2 - 100, GAME_HEIGHT - 100, '◄ PREV', () => {
      this.changePage(-1);
    });

    this.nextButton = this.createNavButton(GAME_WIDTH / 2 + 100, GAME_HEIGHT - 100, 'NEXT ►', () => {
      this.changePage(1);
    });

    this.updateNavButtons();

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 50, '◄ BACK TO MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  private createAchievementList(): void {
    // Clear existing items
    this.achievementItems.forEach((item) => item.destroy());
    this.achievementItems = [];

    const achievements = getAchievements().getAll();
    const startIndex = this.currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, achievements.length);

    const startY = 140;
    const itemHeight = 70;

    for (let i = startIndex; i < endIndex; i++) {
      const achievement = achievements[i];
      const y = startY + (i - startIndex) * itemHeight;
      const item = this.createAchievementItem(GAME_WIDTH / 2, y, achievement);
      this.achievementItems.push(item);
    }
  }

  private createAchievementItem(
    x: number,
    y: number,
    achievement: Achievement
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isUnlocked = achievement.unlockedAt !== undefined;

    const itemWidth = 500;
    const itemHeight = 60;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(isUnlocked ? COLORS.panelBg : 0x0a0a10, 0.9);
    bg.fillRoundedRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);
    bg.lineStyle(2, isUnlocked ? COLORS.neonCyan : COLORS.locked, isUnlocked ? 0.8 : 0.4);
    bg.strokeRoundedRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);

    container.add(bg);

    // Icon - use badge texture if available, fallback to text
    const badgeKey = `badge_${achievement.icon}`;
    const hasBadge = this.textures.exists(badgeKey);

    if (hasBadge) {
      const icon = this.add.image(-itemWidth / 2 + 30, 0, isUnlocked ? badgeKey : 'badge_default');
      icon.setScale(1.4);
      if (!isUnlocked) {
        icon.setAlpha(0.3);
        icon.setTint(0x444444);
      }
      container.add(icon);
    } else {
      // Fallback to text emoji
      const icon = this.add.text(-itemWidth / 2 + 30, 0, isUnlocked ? achievement.icon : '?', {
        fontSize: '28px',
      });
      icon.setOrigin(0.5);
      if (!isUnlocked) {
        icon.setAlpha(0.3);
      }
      container.add(icon);
    }

    // Name
    const nameColor = isUnlocked ? '#00ffff' : '#555555';
    const name = this.add.text(-itemWidth / 2 + 70, -12, achievement.name, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: nameColor,
      fontStyle: isUnlocked ? 'bold' : 'normal',
    });
    name.setOrigin(0, 0.5);
    container.add(name);

    // Description
    const descColor = isUnlocked ? '#aaaaaa' : '#444444';
    const desc = this.add.text(-itemWidth / 2 + 70, 10, achievement.description, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: descColor,
    });
    desc.setOrigin(0, 0.5);
    container.add(desc);

    // Unlock date (if unlocked)
    if (isUnlocked && achievement.unlockedAt) {
      const date = new Date(achievement.unlockedAt);
      const dateStr = date.toLocaleDateString();
      const unlockText = this.add.text(itemWidth / 2 - 20, 0, dateStr, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#666666',
      });
      unlockText.setOrigin(1, 0.5);
      container.add(unlockText);
    }

    // Locked overlay
    if (!isUnlocked) {
      const lockedBadge = this.add.text(itemWidth / 2 - 20, 0, 'LOCKED', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ff00ff',
      });
      lockedBadge.setOrigin(1, 0.5);
      lockedBadge.setAlpha(0.6);
      container.add(lockedBadge);
    }

    return container;
  }

  private changePage(delta: number): void {
    const totalPages = Math.ceil(getAchievements().getAll().length / ITEMS_PER_PAGE);
    this.currentPage = Phaser.Math.Clamp(this.currentPage + delta, 0, totalPages - 1);
    this.createAchievementList();
    this.updatePageText();
    this.updateNavButtons();
  }

  private updatePageText(): void {
    if (!this.pageText) return;
    const totalPages = Math.ceil(getAchievements().getAll().length / ITEMS_PER_PAGE);
    this.pageText.setText(`Page ${this.currentPage + 1} of ${totalPages}`);
  }

  private updateNavButtons(): void {
    const totalPages = Math.ceil(getAchievements().getAll().length / ITEMS_PER_PAGE);

    if (this.prevButton) {
      this.prevButton.setAlpha(this.currentPage > 0 ? 1 : 0.3);
      this.prevButton.setData('enabled', this.currentPage > 0);
    }

    if (this.nextButton) {
      this.nextButton.setAlpha(this.currentPage < totalPages - 1 ? 1 : 0.3);
      this.nextButton.setData('enabled', this.currentPage < totalPages - 1);
    }
  }

  private createNavButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const label = this.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    label.setOrigin(0.5);

    container.add(label);
    container.setSize(80, 30);
    container.setInteractive({ useHandCursor: true });
    container.setData('label', label);
    container.setData('enabled', true);

    container.on('pointerover', () => {
      if (container.getData('enabled')) {
        label.setColor('#00ffff');
      }
    });

    container.on('pointerout', () => {
      label.setColor('#888888');
    });

    container.on('pointerdown', () => {
      if (container.getData('enabled')) {
        onClick();
      }
    });

    return container;
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background with neon border
    const bg = this.add.rectangle(0, 0, 280, 40, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(280, 40);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0x4a1a6a);
      bg.setStrokeStyle(3, COLORS.neonCyan);
      label.setColor('#00ffff');
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    container.on('pointerout', () => {
      bg.setFillStyle(COLORS.darkPurple);
      bg.setStrokeStyle(2, COLORS.neonPink);
      label.setColor('#ffffff');
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    container.on('pointerdown', onClick);

    return container;
  }
}
