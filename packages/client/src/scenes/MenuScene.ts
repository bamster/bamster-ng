import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { getSound } from '../systems/SoundManager';
import { createRetroButton, drawRetroBackdrop } from '../ui/RetroUI';

export type GameMode = 'single' | 'local' | 'online';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    drawRetroBackdrop(this);

    // Oversized arcade-flyer branding with chromatic print offsets.
    const titleX = GAME_WIDTH / 2 - 105;
    const yearX = GAME_WIDTH / 2 + 205;

    // Shadow for "BAMster"
    const titleShadow = this.add.text(titleX + 8, 87, 'BAMSTER', {
      fontSize: '82px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      fontStyle: 'italic',
      color: '#ff149d',
    });
    titleShadow.setOrigin(0.5);

    // Main "BAMster" text
    const title = this.add.text(titleX, 80, 'BAMSTER', {
      fontSize: '82px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      fontStyle: 'italic',
      color: '#fff3d6',
      stroke: '#17051f',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Glowing effect for "BAMster"
    const titleGlow = this.add.text(titleX - 6, 77, 'BAMSTER', {
      fontSize: '82px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      fontStyle: 'italic',
      color: '#00ffff',
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
        fontSize: '62px',
        fontFamily: 'Impact, Haettenschweiler, sans-serif',
        fontStyle: 'italic',
        color: layer.color,
      });
      yearLayer.setOrigin(0.5);
      yearLayer.setAlpha(layer.alpha);
      yearLayer.setBlendMode(Phaser.BlendModes.ADD);
      yearLayers.push(yearLayer);
    });

    // Main "2OOO" text on top (white/bright core)
    const year = this.add.text(yearX, 80, '2OOO', {
      fontSize: '62px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      fontStyle: 'italic',
      color: '#ffff33',
      stroke: '#ff247d',
      strokeThickness: 3,
    });
    year.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 151, "IT'S BAMSTER TIME", {
      fontSize: '14px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#080713',
      backgroundColor: '#00ffff',
      padding: { x: 14, y: 5 },
      letterSpacing: 3,
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
    this.createButton(buttonX, 210, '[1P] SINGLE PLAYER', () => {
      this.startGame('single');
    });

    this.createButton(buttonX, 265, '[2P] LOCAL MULTIPLAYER', () => {
      this.startGame('local');
    });

    this.createButton(buttonX, 320, '[NET] ONLINE PLAY', () => {
      this.scene.start('LobbyScene');
    });

    this.createButton(buttonX, 375, '[?] HOW TO PLAY', () => {
      this.scene.start('TutorialScene');
    });

    this.createButton(buttonX, 430, '[CFG] SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    this.createButton(buttonX, 485, '[★] ACHIEVEMENTS', () => {
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

    this.tweens.add({
      targets: subtitle,
      alpha: 0.72,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    return createRetroButton(this, x, y, text, onClick, {
      width: 300,
      height: 48,
      fontSize: 18,
    });
  }

  private startGame(mode: GameMode): void {
    // Initialize audio (requires user interaction)
    getSound().init();
    this.scene.start('GameScene', { mode });
  }
}
