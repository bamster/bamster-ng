import Phaser from 'phaser';
import { BLOCK_SIZE, BLOCK_COLORS } from '@bamster/shared';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark 80s background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, width, height);

    // Grid effect
    bg.lineStyle(1, 0xff00ff, 0.1);
    for (let x = 0; x < width; x += 40) {
      bg.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      bg.lineBetween(0, y, width, y);
    }

    // Title
    const title = this.add.text(width / 2, height / 2 - 80, 'BAMSTER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Loading text
    const loadingText = this.add.text(width / 2, height / 2 - 20, 'LOADING...', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    loadingText.setOrigin(0.5);

    // Progress bar container
    const progressBox = this.add.graphics();
    progressBox.lineStyle(2, 0xff00ff, 1);
    progressBox.strokeRect(width / 2 - 160, height / 2 + 10, 320, 30);

    // Progress bar fill
    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      // Neon gradient effect
      progressBar.fillStyle(0xff00ff, 1);
      progressBar.fillRect(width / 2 - 158, height / 2 + 12, 316 * value, 26);
      progressBar.fillStyle(0x00ffff, 0.5);
      progressBar.fillRect(width / 2 - 158, height / 2 + 12, 316 * value, 13);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      title.destroy();
      bg.destroy();
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
    // 80s neon color palette
    const colorMap: Record<string, number> = {
      magenta: 0xff00ff,
      cyan: 0x00ffff,
      lime: 0x39ff14,
      orange: 0xff6600,
      violet: 0xbf00ff,
    };

    // Darker shades for 3D effect
    const darkMap: Record<string, number> = {
      magenta: 0xaa00aa,
      cyan: 0x00aaaa,
      lime: 0x22aa00,
      orange: 0xaa4400,
      violet: 0x8800aa,
    };

    BLOCK_COLORS.forEach((color) => {
      const graphics = this.make.graphics({ x: 0, y: 0 });

      // Get color with fallback
      const mainColor = colorMap[color] ?? 0xff00ff;
      const darkColor = darkMap[color] ?? 0xaa00aa;

      // Main block fill with slight gradient effect
      graphics.fillStyle(mainColor, 1);
      graphics.fillRect(2, 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);

      // Bright highlight (top and left edges) - neon glow effect
      graphics.fillStyle(0xffffff, 0.6);
      graphics.fillRect(2, 2, BLOCK_SIZE - 4, 3);
      graphics.fillRect(2, 2, 3, BLOCK_SIZE - 4);

      // Dark shadow (bottom and right edges)
      graphics.fillStyle(darkColor, 1);
      graphics.fillRect(2, BLOCK_SIZE - 5, BLOCK_SIZE - 4, 3);
      graphics.fillRect(BLOCK_SIZE - 5, 2, 3, BLOCK_SIZE - 4);

      // Outer border - dark
      graphics.lineStyle(2, 0x111111, 1);
      graphics.strokeRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Inner glow border
      graphics.lineStyle(1, mainColor, 0.5);
      graphics.strokeRect(3, 3, BLOCK_SIZE - 6, BLOCK_SIZE - 6);

      graphics.generateTexture(`block_${color}`, BLOCK_SIZE, BLOCK_SIZE);
      graphics.destroy();
    });
  }

  private generateBamsterTexture(): void {
    // Generate right-facing frames (idle, running, jump, fall)
    this.generateBamsterFrame('bamster', false, 'idle');
    this.generateBamsterFrame('bamster_jump', false, 'jump');
    this.generateBamsterFrame('bamster_fall', false, 'fall');
    // Generate left-facing frames
    this.generateBamsterFrame('bamster_left', true, 'idle');
    this.generateBamsterFrame('bamster_left_jump', true, 'jump');
    this.generateBamsterFrame('bamster_left_fall', true, 'fall');
  }

  private generateBamsterFrame(textureName: string, flipX: boolean, state: 'idle' | 'jump' | 'fall'): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const baseX = flipX ? 32 : 24;
    const spriteWidth = 56;
    const spriteHeight = 52;

    // Cape direction based on state
    // idle: cape hangs down, jump: cape streams up (going up fast), fall: cape streams up dramatically
    const capeDir = flipX ? 1 : -1;

    // Draw cape first (behind body)
    graphics.fillStyle(0xcc0000, 1); // Dark red base

    if (state === 'idle') {
      // Cape hangs down with slight wave
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 28, 42,                   // bottom corner (flows behind)
        baseX + capeDir * 8, 40                     // bottom near body
      );
      // Brighter highlight layer
      graphics.fillStyle(0xff3333, 1);
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,
        baseX + capeDir * 22, 36,
        baseX + capeDir * 8, 34
      );
    } else if (state === 'jump') {
      // Cape streams horizontally/slightly up (jumping up)
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 40, 18,                   // streams out flat
        baseX + capeDir * 35, 28                    // bottom edge
      );
      graphics.fillStyle(0xff3333, 1);
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,
        baseX + capeDir * 35, 16,
        baseX + capeDir * 30, 24
      );
    } else {
      // Cape streams upward dramatically (falling)
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 35, -8,                   // streams up above head
        baseX + capeDir * 28, 8                     // mid point
      );
      graphics.fillStyle(0xff3333, 1);
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,
        baseX + capeDir * 30, -4,
        baseX + capeDir * 24, 6
      );
    }

    // Body (hamster-like shape)
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillEllipse(baseX, 26, 32, 28);

    // Head
    graphics.fillCircle(baseX, 14, 12);

    // Ears
    graphics.fillStyle(0xffb6c1, 1);
    graphics.fillCircle(baseX - 10, 6, 5);
    graphics.fillCircle(baseX + 10, 6, 5);
    graphics.fillStyle(0xd4a574, 1);
    graphics.fillCircle(baseX - 10, 6, 3);
    graphics.fillCircle(baseX + 10, 6, 3);

    // Eyes
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(baseX - 5, 12, 3);
    graphics.fillCircle(baseX + 5, 12, 3);

    // Eye shine
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(baseX - 4, 11, 1);
    graphics.fillCircle(baseX + 6, 11, 1);

    // Nose
    graphics.fillStyle(0xffb6c1, 1);
    graphics.fillCircle(baseX, 17, 2);

    // Cheeks
    graphics.fillStyle(0xffcccb, 0.5);
    graphics.fillCircle(baseX - 10, 16, 4);
    graphics.fillCircle(baseX + 10, 16, 4);

    // Belly
    graphics.fillStyle(0xf5deb3, 1);
    graphics.fillEllipse(baseX, 30, 16, 14);

    // Legs - position based on state
    graphics.fillStyle(0xd4a574, 1);
    if (state === 'jump') {
      // Legs tucked up when jumping
      graphics.fillEllipse(baseX - 6, 38, 6, 5);
      graphics.fillEllipse(baseX + 6, 38, 6, 5);
    } else if (state === 'fall') {
      // Legs spread when falling
      graphics.fillEllipse(baseX - 10, 40, 6, 5);
      graphics.fillEllipse(baseX + 10, 40, 6, 5);
    } else {
      // Normal standing legs
      graphics.fillEllipse(baseX - 8, 40, 6, 6);
      graphics.fillEllipse(baseX + 8, 40, 6, 6);
    }

    // Feet
    graphics.fillStyle(0xc49464, 1);
    if (state === 'jump') {
      graphics.fillEllipse(baseX - 6, 42, 5, 3);
      graphics.fillEllipse(baseX + 6, 42, 5, 3);
    } else if (state === 'fall') {
      graphics.fillEllipse(baseX - 10, 44, 5, 3);
      graphics.fillEllipse(baseX + 10, 44, 5, 3);
    } else {
      graphics.fillEllipse(baseX - 8, 44, 5, 3);
      graphics.fillEllipse(baseX + 8, 44, 5, 3);
    }

    // Laser pistol
    const gunX = flipX ? baseX - 22 : baseX + 14;
    graphics.fillStyle(0x444444, 1);
    graphics.fillRect(gunX, 22, 10, 6);
    // Neon glow on gun
    graphics.fillStyle(0xff00ff, 1);
    graphics.fillRect(flipX ? gunX : gunX + 8, 23, 3, 4);

    graphics.generateTexture(textureName, spriteWidth, spriteHeight);
    graphics.destroy();
  }

  private generateLaserTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Outer glow - neon pink
    graphics.fillStyle(0xff00ff, 0.3);
    graphics.fillRect(0, 0, 20, 10);

    // Middle glow
    graphics.fillStyle(0xff44ff, 0.6);
    graphics.fillRect(1, 2, 18, 6);

    // Core beam - bright white/pink
    graphics.fillStyle(0xffaaff, 1);
    graphics.fillRect(2, 3, 16, 4);

    // Hot center
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(3, 4, 14, 2);

    graphics.generateTexture('laser', 20, 10);
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
