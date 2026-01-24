import Phaser from 'phaser';
import { BLOCK_SIZE, BLOCK_COLORS } from '@bamster/shared';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading progress
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff',
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate colored block textures
    this.generateBlockTextures();

    // Generate BAMster placeholder sprite
    this.generateBamsterTexture();

    // Generate laser texture
    this.generateLaserTexture();

    // Generate power-up textures
    this.generatePowerUpTextures();
  }

  create(): void {
    // Create animations
    this.createAnimations();

    // Start menu scene
    this.scene.start('MenuScene');
  }

  private generateBlockTextures(): void {
    const colorMap: Record<string, number> = {
      red: 0xff4444,
      blue: 0x4444ff,
      green: 0x44ff44,
      yellow: 0xffff44,
      purple: 0xaa44ff,
    };

    BLOCK_COLORS.forEach((color) => {
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // Main block fill
      graphics.fillStyle(colorMap[color], 1);
      graphics.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Highlight (top and left edges)
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillRect(0, 0, BLOCK_SIZE, 4);
      graphics.fillRect(0, 0, 4, BLOCK_SIZE);

      // Shadow (bottom and right edges)
      graphics.fillStyle(0x000000, 0.3);
      graphics.fillRect(0, BLOCK_SIZE - 4, BLOCK_SIZE, 4);
      graphics.fillRect(BLOCK_SIZE - 4, 0, 4, BLOCK_SIZE);

      // Border
      graphics.lineStyle(2, 0x000000, 0.5);
      graphics.strokeRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      graphics.generateTexture(`block_${color}`, BLOCK_SIZE, BLOCK_SIZE);
      graphics.destroy();
    });
  }

  private generateBamsterTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Body (hamster-like shape)
    graphics.fillStyle(0xd4a574, 1); // Tan/brown color
    graphics.fillEllipse(20, 24, 32, 28); // Body

    // Head
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(20, 12, 12);

    // Ears
    graphics.fillStyle(0xffb6c1, 1); // Pink inner ear
    graphics.fillCircle(10, 4, 5);
    graphics.fillCircle(30, 4, 5);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(10, 4, 3);
    graphics.fillCircle(30, 4, 3);

    // Eyes
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(15, 10, 3);
    graphics.fillCircle(25, 10, 3);

    // Eye shine
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 9, 1);
    graphics.fillCircle(26, 9, 1);

    // Nose
    graphics.fillStyle(0xffb6c1, 1);
    graphics.fillCircle(20, 15, 2);

    // Cheeks
    graphics.fillStyle(0xffcccb, 0.5);
    graphics.fillCircle(10, 14, 4);
    graphics.fillCircle(30, 14, 4);

    // Belly
    graphics.fillStyle(0xf5deb3, 1);
    graphics.fillEllipse(20, 28, 16, 14);

    // Legs
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillEllipse(12, 38, 6, 6);
    graphics.fillEllipse(28, 38, 6, 6);

    // Laser pistol
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(34, 20, 10, 6);
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(42, 21, 4, 4);

    graphics.generateTexture('bamster', 48, 44);
    graphics.destroy();

    // Generate flipped version for left-facing
    const graphicsLeft = this.make.graphics({ x: 0, y: 0 });
    graphicsLeft.fillStyle(0xd4a574, 1);
    graphicsLeft.fillEllipse(28, 24, 32, 28);
    graphicsLeft.fillCircle(28, 12, 12);
    graphicsLeft.fillStyle(0xffb6c1, 1);
    graphicsLeft.fillCircle(18, 4, 5);
    graphicsLeft.fillCircle(38, 4, 5);
    graphicsLeft.fillStyle(0xd4a574, 1);
    graphicsLeft.fillCircle(18, 4, 3);
    graphicsLeft.fillCircle(38, 4, 3);
    graphicsLeft.fillStyle(0x000000, 1);
    graphicsLeft.fillCircle(23, 10, 3);
    graphicsLeft.fillCircle(33, 10, 3);
    graphicsLeft.fillStyle(0xffffff, 1);
    graphicsLeft.fillCircle(22, 9, 1);
    graphicsLeft.fillCircle(32, 9, 1);
    graphicsLeft.fillStyle(0xffb6c1, 1);
    graphicsLeft.fillCircle(28, 15, 2);
    graphicsLeft.fillStyle(0xffcccb, 0.5);
    graphicsLeft.fillCircle(18, 14, 4);
    graphicsLeft.fillCircle(38, 14, 4);
    graphicsLeft.fillStyle(0xf5deb3, 1);
    graphicsLeft.fillEllipse(28, 28, 16, 14);
    graphicsLeft.fillStyle(0xd4a574, 1);
    graphicsLeft.fillEllipse(20, 38, 6, 6);
    graphicsLeft.fillEllipse(36, 38, 6, 6);
    graphicsLeft.fillStyle(0x666666, 1);
    graphicsLeft.fillRect(4, 20, 10, 6);
    graphicsLeft.fillStyle(0xff0000, 1);
    graphicsLeft.fillRect(2, 21, 4, 4);
    graphicsLeft.generateTexture('bamster_left', 48, 44);
    graphicsLeft.destroy();
  }

  private generateLaserTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Laser beam
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(0, 2, 16, 4);

    // Glow effect
    graphics.fillStyle(0xff6666, 0.5);
    graphics.fillRect(0, 0, 16, 8);

    graphics.generateTexture('laser', 16, 8);
    graphics.destroy();
  }

  private generatePowerUpTextures(): void {
    // Corn power-up
    const cornGraphics = this.make.graphics({ x: 0, y: 0 });
    cornGraphics.fillStyle(0xffd700, 1); // Golden yellow
    cornGraphics.fillEllipse(12, 16, 16, 24);
    cornGraphics.fillStyle(0x228b22, 1); // Green husk
    cornGraphics.fillTriangle(4, 0, 12, 8, 20, 0);
    // Corn kernels pattern
    cornGraphics.fillStyle(0xffaa00, 1);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        cornGraphics.fillCircle(6 + col * 6, 10 + row * 6, 2);
      }
    }
    cornGraphics.generateTexture('powerup_corn', 24, 32);
    cornGraphics.destroy();

    // Sneakers power-up
    const sneakersGraphics = this.make.graphics({ x: 0, y: 0 });
    sneakersGraphics.fillStyle(0x4169e1, 1); // Royal blue
    sneakersGraphics.fillRoundedRect(0, 8, 24, 12, 4);
    sneakersGraphics.fillStyle(0xffffff, 1); // White sole
    sneakersGraphics.fillRect(0, 16, 24, 4);
    sneakersGraphics.fillStyle(0xff4500, 1); // Orange accent
    sneakersGraphics.fillRect(2, 10, 4, 6);
    // Laces
    sneakersGraphics.lineStyle(1, 0xffffff, 1);
    sneakersGraphics.lineBetween(8, 8, 12, 12);
    sneakersGraphics.lineBetween(14, 8, 18, 12);
    sneakersGraphics.generateTexture('powerup_sneakers', 24, 24);
    sneakersGraphics.destroy();

    // Rapid fire power-up
    const rapidGraphics = this.make.graphics({ x: 0, y: 0 });
    rapidGraphics.fillStyle(0xff4444, 1);
    rapidGraphics.fillRect(4, 8, 16, 8);
    rapidGraphics.fillStyle(0xffff00, 1);
    // Multiple bullet lines
    rapidGraphics.fillRect(20, 6, 8, 2);
    rapidGraphics.fillRect(20, 10, 8, 2);
    rapidGraphics.fillRect(20, 14, 8, 2);
    rapidGraphics.generateTexture('powerup_rapid', 28, 24);
    rapidGraphics.destroy();

    // Spread shot power-up
    const spreadGraphics = this.make.graphics({ x: 0, y: 0 });
    spreadGraphics.fillStyle(0x44ff44, 1);
    spreadGraphics.fillRect(4, 10, 12, 6);
    spreadGraphics.fillStyle(0xffff00, 1);
    // Fan of bullets
    spreadGraphics.fillRect(16, 4, 8, 2);
    spreadGraphics.fillRect(16, 12, 8, 2);
    spreadGraphics.fillRect(16, 20, 8, 2);
    spreadGraphics.generateTexture('powerup_spread', 28, 28);
    spreadGraphics.destroy();

    // Piercing laser power-up
    const piercingGraphics = this.make.graphics({ x: 0, y: 0 });
    piercingGraphics.fillStyle(0x9944ff, 1);
    piercingGraphics.fillRect(4, 10, 12, 6);
    piercingGraphics.fillStyle(0x00ffff, 1);
    // Long piercing beam
    piercingGraphics.fillRect(16, 11, 16, 4);
    // Targets it goes through
    piercingGraphics.lineStyle(2, 0xff0000, 0.5);
    piercingGraphics.strokeCircle(22, 13, 4);
    piercingGraphics.strokeCircle(30, 13, 4);
    piercingGraphics.generateTexture('powerup_piercing', 36, 28);
    piercingGraphics.destroy();
  }

  private createAnimations(): void {
    // For now, we use static sprites
    // When legacy assets are added, we'll create proper animations here
  }
}
