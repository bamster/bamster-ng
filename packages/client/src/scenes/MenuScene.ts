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

    // Title with chrome/neon effect - split into "BAMster" and "2OOO"
    const titleX = GAME_WIDTH / 2 - 100;
    const yearX = GAME_WIDTH / 2 + 180;

    // Shadow for "BAMster"
    const titleShadow = this.add.text(titleX + 4, 84, 'BAMster', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    // Main "BAMster" text
    const title = this.add.text(titleX, 80, 'BAMster', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Glowing effect for "BAMster"
    const titleGlow = this.add.text(titleX, 80, 'BAMster', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    titleGlow.setOrigin(0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Rainbow chromatic aberration effect for "2OOO" - layered colors offset
    const rainbowLayers = [
      { color: '#ff0000', offsetY: -6, alpha: 0.5 },  // Red on top
      { color: '#ff8800', offsetY: -4, alpha: 0.6 },  // Orange
      { color: '#ffff00', offsetY: -2, alpha: 0.7 },  // Yellow
      { color: '#00ff00', offsetY: 0, alpha: 0.8 },   // Green (center-ish)
      { color: '#00ffff', offsetY: 2, alpha: 0.9 },   // Cyan
      { color: '#0088ff', offsetY: 4, alpha: 0.8 },   // Blue
      { color: '#ff00ff', offsetY: 6, alpha: 0.7 },   // Magenta at bottom
    ];

    // Create rainbow layers (back to front)
    const yearLayers: Phaser.GameObjects.Text[] = [];
    rainbowLayers.forEach((layer) => {
      const yearLayer = this.add.text(yearX, 80 + layer.offsetY, '2OOO', {
        fontSize: '72px',
        fontFamily: 'monospace',
        color: layer.color,
      });
      yearLayer.setOrigin(0.5);
      yearLayer.setAlpha(layer.alpha);
      yearLayer.setBlendMode(Phaser.BlendModes.ADD);
      yearLayers.push(yearLayer);
    });

    // Main "2OOO" text on top (white/bright core)
    const year = this.add.text(yearX, 80, '2OOO', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#ffffff',
      strokeThickness: 2,
    });
    year.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 150, "★ It's BAMster time! ★", {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    subtitle.setOrigin(0.5);

    // BAMster preview on the left side - centered so cape is fully visible
    const bamster = this.add.sprite(200, GAME_HEIGHT / 2 + 50, 'bamster');
    bamster.setScale(5);

    // Start with idle pose (cape hanging naturally)
    bamster.setTexture('bamster');

    // Gentle floating animation
    this.tweens.add({
      targets: bamster,
      y: GAME_HEIGHT / 2 + 60,
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Gentle cape movement - alternate between idle and run frames slowly
    // This creates a subtle "wind" effect
    let capeFrame = 0;
    const capeFrames = ['bamster', 'bamster_run1', 'bamster', 'bamster_run2'];
    this.time.addEvent({
      delay: 800, // Slow, gentle movement
      callback: () => {
        bamster.setTexture(capeFrames[capeFrame]);
        capeFrame = (capeFrame + 1) % capeFrames.length;
      },
      loop: true,
    });

    // Occasional foot shuffle - random timing, not constant
    this.time.addEvent({
      delay: 3000, // Check every 3 seconds
      callback: () => {
        // 40% chance to do a quick foot shuffle
        if (Math.random() < 0.4) {
          // Quick shuffle: run1 -> run2 -> idle
          const originalFrame = capeFrame;
          bamster.setTexture('bamster_run1');
          this.time.delayedCall(150, () => {
            bamster.setTexture('bamster_run2');
            this.time.delayedCall(150, () => {
              bamster.setTexture(capeFrames[originalFrame]);
            });
          });
        }
      },
      loop: true,
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
      targets: [title, titleGlow, titleShadow],
      y: 85,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Animate year "2OOO" - main text and all rainbow layers in sync
    this.tweens.add({
      targets: year,
      y: 85,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Animate each rainbow layer with its offset preserved
    yearLayers.forEach((layer, index) => {
      const baseOffset = rainbowLayers[index].offsetY;
      this.tweens.add({
        targets: layer,
        y: 85 + baseOffset,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
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
