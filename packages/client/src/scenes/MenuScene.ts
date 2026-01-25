import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { getSound } from '../systems/SoundManager';

export type GameMode = 'single' | 'local' | 'online';

// 80s color palette
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  neonOrange: 0xff6600,
  darkPurple: 0x2a0a4a,
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
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
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 4, 84, 'BAMster 2000', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 80, 'BAMster 2000', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Glowing title effect
    const titleGlow = this.add.text(GAME_WIDTH / 2, 80, 'BAMster 2000', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    titleGlow.setOrigin(0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 150, "★ It's BAMster time! ★", {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    subtitle.setOrigin(0.5);

    // BAMster preview on the left side
    const bamster = this.add.image(150, GAME_HEIGHT / 2 + 50, 'bamster');
    bamster.setScale(5);

    // Add a gentle floating animation to BAMster
    this.tweens.add({
      targets: bamster,
      y: GAME_HEIGHT / 2 + 60,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Menu buttons - centered with comfortable spacing
    const buttonX = GAME_WIDTH / 2 + 80; // Offset right to balance BAMster on left
    this.createButton(buttonX, 220, '► SINGLE PLAYER', () => {
      this.startGame('single');
    });

    this.createButton(buttonX, 280, '► LOCAL MULTIPLAYER', () => {
      this.startGame('local');
    });

    this.createButton(buttonX, 340, '► ONLINE PLAY', () => {
      this.scene.start('LobbyScene');
    });

    this.createButton(buttonX, 400, '⚙ SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    this.createButton(buttonX, 460, '🏆 ACHIEVEMENTS', () => {
      this.scene.start('AchievementsScene');
    });

    // Animate title with pulsing glow
    this.tweens.add({
      targets: [title, titleGlow],
      y: 85,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Pulsing glow effect
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.5,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Subtitle color cycling
    this.time.addEvent({
      delay: 500,
      callback: () => {
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ff6600'];
        const current = colors.indexOf(subtitle.style.color as string);
        subtitle.setColor(colors[(current + 1) % colors.length]);
      },
      loop: true,
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background with neon border
    const bg = this.add.rectangle(0, 0, 280, 45, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(280, 45);
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

  private startGame(mode: GameMode): void {
    // Initialize audio (requires user interaction)
    getSound().init();
    this.scene.start('GameScene', { mode });
  }
}
