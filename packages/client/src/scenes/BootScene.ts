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

    // Generate particle texture for effects
    this.generateParticleTexture();

    // Generate heart textures for health display
    this.generateHeartTexture();
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

      // Main block fill - solid color for seamless merging
      graphics.fillStyle(mainColor, 1);
      graphics.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);

      // Bright highlight (top and left edges) - subtle bevel effect
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillRect(0, 0, BLOCK_SIZE, 2);
      graphics.fillRect(0, 0, 2, BLOCK_SIZE);

      // Dark shadow (bottom and right edges) - subtle bevel
      graphics.fillStyle(darkColor, 0.8);
      graphics.fillRect(0, BLOCK_SIZE - 2, BLOCK_SIZE, 2);
      graphics.fillRect(BLOCK_SIZE - 2, 0, 2, BLOCK_SIZE);

      graphics.generateTexture(`block_${color}`, BLOCK_SIZE, BLOCK_SIZE);
      graphics.destroy();
    });
  }

  private generateBamsterTexture(): void {
    // Generate player 1 frames (red cape)
    this.generateBamsterFrame('bamster', false, 'idle', 'red');
    this.generateBamsterFrame('bamster_run1', false, 'run1', 'red');
    this.generateBamsterFrame('bamster_run2', false, 'run2', 'red');
    this.generateBamsterFrame('bamster_jump', false, 'jump', 'red');
    this.generateBamsterFrame('bamster_fall', false, 'fall', 'red');
    this.generateBamsterFrame('bamster_left', true, 'idle', 'red');
    this.generateBamsterFrame('bamster_left_run1', true, 'run1', 'red');
    this.generateBamsterFrame('bamster_left_run2', true, 'run2', 'red');
    this.generateBamsterFrame('bamster_left_jump', true, 'jump', 'red');
    this.generateBamsterFrame('bamster_left_fall', true, 'fall', 'red');

    // Generate player 2 frames (blue cape)
    this.generateBamsterFrame('bamster_p2', false, 'idle', 'blue');
    this.generateBamsterFrame('bamster_p2_run1', false, 'run1', 'blue');
    this.generateBamsterFrame('bamster_p2_run2', false, 'run2', 'blue');
    this.generateBamsterFrame('bamster_p2_jump', false, 'jump', 'blue');
    this.generateBamsterFrame('bamster_p2_fall', false, 'fall', 'blue');
    this.generateBamsterFrame('bamster_p2_left', true, 'idle', 'blue');
    this.generateBamsterFrame('bamster_p2_left_run1', true, 'run1', 'blue');
    this.generateBamsterFrame('bamster_p2_left_run2', true, 'run2', 'blue');
    this.generateBamsterFrame('bamster_p2_left_jump', true, 'jump', 'blue');
    this.generateBamsterFrame('bamster_p2_left_fall', true, 'fall', 'blue');
  }

  private generateBamsterFrame(textureName: string, flipX: boolean, state: 'idle' | 'run1' | 'run2' | 'jump' | 'fall', capeColor: 'red' | 'blue' = 'red'): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const baseX = flipX ? 32 : 24;
    const spriteWidth = 56;
    const spriteHeight = 52;

    // Cape colors based on player
    const capeColors = capeColor === 'red'
      ? { dark: 0xcc0000, light: 0xff3333 }
      : { dark: 0x0066cc, light: 0x3399ff };

    // Cape direction based on state
    // idle: cape hangs down, jump: cape streams up (going up fast), fall: cape streams up dramatically
    const capeDir = flipX ? 1 : -1;

    // Draw cape first (behind body)
    graphics.fillStyle(capeColors.dark, 1);

    if (state === 'idle') {
      // Cape hangs down with slight wave
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 28, 42,                   // bottom corner (flows behind)
        baseX + capeDir * 8, 40                     // bottom near body
      );
      // Brighter highlight layer
      graphics.fillStyle(capeColors.light, 1);
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,
        baseX + capeDir * 22, 36,
        baseX + capeDir * 8, 34
      );
    } else if (state === 'run1' || state === 'run2') {
      // Cape flows back horizontally when running
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 38, 20,                   // streams back
        baseX + capeDir * 32, 30                    // bottom edge
      );
      graphics.fillStyle(capeColors.light, 1);
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,
        baseX + capeDir * 32, 18,
        baseX + capeDir * 28, 26
      );
    } else if (state === 'jump') {
      // Cape streams horizontally/slightly up (jumping up)
      graphics.fillTriangle(
        baseX + capeDir * 6, 14,                    // neck attachment
        baseX + capeDir * 40, 18,                   // streams out flat
        baseX + capeDir * 35, 28                    // bottom edge
      );
      graphics.fillStyle(capeColors.light, 1);
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
      graphics.fillStyle(capeColors.light, 1);
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
    } else if (state === 'run1') {
      // Running frame 1: left leg forward, right leg back
      graphics.fillEllipse(baseX - 12, 38, 6, 5);  // left forward
      graphics.fillEllipse(baseX + 4, 42, 6, 5);   // right back
    } else if (state === 'run2') {
      // Running frame 2: right leg forward, left leg back
      graphics.fillEllipse(baseX - 4, 42, 6, 5);   // left back
      graphics.fillEllipse(baseX + 12, 38, 6, 5);  // right forward
    } else {
      // Normal standing legs (idle)
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
    } else if (state === 'run1') {
      graphics.fillEllipse(baseX - 12, 42, 5, 3);  // left forward
      graphics.fillEllipse(baseX + 4, 46, 5, 3);   // right back
    } else if (state === 'run2') {
      graphics.fillEllipse(baseX - 4, 46, 5, 3);   // left back
      graphics.fillEllipse(baseX + 12, 42, 5, 3);  // right forward
    } else {
      // idle feet
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
    const size = 32; // Consistent size for all power-ups
    const center = size / 2;

    // Corn power-up (health) - neon yellow/green
    const cornGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    cornGraphics.fillStyle(0xffff00, 0.3);
    cornGraphics.fillEllipse(center, center + 2, 22, 28);
    // Main corn body
    cornGraphics.fillStyle(0xffdd00, 1);
    cornGraphics.fillEllipse(center, center + 2, 16, 22);
    // Neon green husk/leaves
    cornGraphics.fillStyle(0x00ff66, 1);
    cornGraphics.fillTriangle(center - 8, 4, center, 12, center + 8, 4);
    // Corn kernels pattern
    cornGraphics.fillStyle(0xffaa00, 1);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cornGraphics.fillCircle(center - 5 + col * 5, 14 + row * 6, 2);
      }
    }
    // Highlight
    cornGraphics.fillStyle(0xffffff, 0.5);
    cornGraphics.fillEllipse(center - 3, center, 4, 8);
    cornGraphics.generateTexture('powerup_corn', size, size);
    cornGraphics.destroy();

    // Sneakers power-up (jump boost) - neon cyan
    const sneakersGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    sneakersGraphics.fillStyle(0x00ffff, 0.3);
    sneakersGraphics.fillRoundedRect(2, 8, 28, 18, 6);
    // Shoe body
    sneakersGraphics.fillStyle(0x00ccff, 1);
    sneakersGraphics.fillRoundedRect(4, 10, 24, 14, 4);
    // Neon pink sole
    sneakersGraphics.fillStyle(0xff00ff, 1);
    sneakersGraphics.fillRect(4, 20, 24, 4);
    // White stripe
    sneakersGraphics.fillStyle(0xffffff, 1);
    sneakersGraphics.fillRect(8, 12, 16, 3);
    // Wing icon (speed)
    sneakersGraphics.fillStyle(0xffff00, 1);
    sneakersGraphics.fillTriangle(22, 8, 30, 12, 22, 16);
    sneakersGraphics.generateTexture('powerup_sneakers', size, size);
    sneakersGraphics.destroy();

    // Rapid fire power-up - neon red/orange
    const rapidGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    rapidGraphics.fillStyle(0xff4400, 0.3);
    rapidGraphics.fillCircle(center, center, 14);
    // Inner circle
    rapidGraphics.fillStyle(0xff2200, 1);
    rapidGraphics.fillCircle(center, center, 11);
    // Lightning bolt icon
    rapidGraphics.fillStyle(0xffff00, 1);
    rapidGraphics.fillTriangle(center - 6, center - 8, center + 2, center - 2, center - 2, center - 2);
    rapidGraphics.fillTriangle(center - 2, center - 2, center + 6, center + 8, center + 2, center + 2);
    rapidGraphics.fillRect(center - 2, center - 2, 4, 4);
    // Speed lines
    rapidGraphics.lineStyle(2, 0xffff00, 0.8);
    rapidGraphics.lineBetween(2, center - 4, 8, center - 4);
    rapidGraphics.lineBetween(2, center + 4, 8, center + 4);
    rapidGraphics.generateTexture('powerup_rapid', size, size);
    rapidGraphics.destroy();

    // Spread shot power-up - neon green
    const spreadGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    spreadGraphics.fillStyle(0x00ff00, 0.3);
    spreadGraphics.fillCircle(center, center, 14);
    // Inner circle
    spreadGraphics.fillStyle(0x00cc00, 1);
    spreadGraphics.fillCircle(center, center, 11);
    // 3-way spread icon
    spreadGraphics.fillStyle(0xffff00, 1);
    // Center bullet
    spreadGraphics.fillRect(center - 2, center - 2, 8, 4);
    // Top bullet
    spreadGraphics.fillRect(center - 2, center - 8, 8, 4);
    // Bottom bullet
    spreadGraphics.fillRect(center - 2, center + 4, 8, 4);
    // Arrows
    spreadGraphics.fillTriangle(center + 8, center - 6, center + 12, center - 6, center + 10, center - 10);
    spreadGraphics.fillTriangle(center + 8, center, center + 14, center, center + 10, center);
    spreadGraphics.fillTriangle(center + 8, center + 6, center + 12, center + 6, center + 10, center + 10);
    spreadGraphics.generateTexture('powerup_spread', size, size);
    spreadGraphics.destroy();

    // Piercing laser power-up - neon purple/cyan
    const piercingGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    piercingGraphics.fillStyle(0x9900ff, 0.3);
    piercingGraphics.fillCircle(center, center, 14);
    // Inner circle
    piercingGraphics.fillStyle(0x7700cc, 1);
    piercingGraphics.fillCircle(center, center, 11);
    // Piercing beam icon
    piercingGraphics.fillStyle(0x00ffff, 1);
    piercingGraphics.fillRect(6, center - 2, 20, 4);
    // Arrow tip
    piercingGraphics.fillTriangle(26, center - 5, 26, center + 5, 30, center);
    // Pierced targets
    piercingGraphics.lineStyle(2, 0xff00ff, 0.8);
    piercingGraphics.strokeCircle(10, center, 4);
    piercingGraphics.strokeCircle(18, center, 4);
    piercingGraphics.generateTexture('powerup_piercing', size, size);
    piercingGraphics.destroy();
  }

  private generateParticleTexture(): void {
    // Small square particle for block destruction effects
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 6, 6);
    graphics.generateTexture('particle', 6, 6);
    graphics.destroy();
  }

  private generateHeartTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const size = 20;
    const centerX = size / 2;
    const centerY = size / 2;

    // Draw filled heart shape
    graphics.fillStyle(0xff0066, 1);

    // Heart is made of two circles and a triangle
    const circleRadius = size * 0.25;
    const circleY = centerY - size * 0.1;

    // Left circle
    graphics.fillCircle(centerX - circleRadius * 0.8, circleY, circleRadius);
    // Right circle
    graphics.fillCircle(centerX + circleRadius * 0.8, circleY, circleRadius);
    // Bottom triangle
    graphics.fillTriangle(
      centerX - size * 0.45, circleY,
      centerX + size * 0.45, circleY,
      centerX, centerY + size * 0.4
    );

    // Add highlight/glow
    graphics.fillStyle(0xff4488, 1);
    graphics.fillCircle(centerX - circleRadius * 0.5, circleY - circleRadius * 0.3, circleRadius * 0.4);

    graphics.generateTexture('heart', size, size);
    graphics.destroy();

    // Empty heart (outline only)
    const emptyGraphics = this.make.graphics({ x: 0, y: 0 });
    emptyGraphics.lineStyle(2, 0x660033, 1);

    // Draw heart outline
    emptyGraphics.strokeCircle(centerX - circleRadius * 0.8, circleY, circleRadius);
    emptyGraphics.strokeCircle(centerX + circleRadius * 0.8, circleY, circleRadius);

    // Fill with dark color
    emptyGraphics.fillStyle(0x220011, 0.5);
    emptyGraphics.fillCircle(centerX - circleRadius * 0.8, circleY, circleRadius);
    emptyGraphics.fillCircle(centerX + circleRadius * 0.8, circleY, circleRadius);
    emptyGraphics.fillTriangle(
      centerX - size * 0.45, circleY,
      centerX + size * 0.45, circleY,
      centerX, centerY + size * 0.4
    );

    emptyGraphics.generateTexture('heart_empty', size, size);
    emptyGraphics.destroy();
  }

  private createAnimations(): void {
    // Player 1 running animation - right facing
    this.anims.create({
      key: 'bamster_run',
      frames: [
        { key: 'bamster_run1' },
        { key: 'bamster_run2' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    // Player 1 running animation - left facing
    this.anims.create({
      key: 'bamster_left_run',
      frames: [
        { key: 'bamster_left_run1' },
        { key: 'bamster_left_run2' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    // Player 2 running animation - right facing (blue cape)
    this.anims.create({
      key: 'bamster_p2_run',
      frames: [
        { key: 'bamster_p2_run1' },
        { key: 'bamster_p2_run2' },
      ],
      frameRate: 10,
      repeat: -1,
    });

    // Player 2 running animation - left facing (blue cape)
    this.anims.create({
      key: 'bamster_p2_left_run',
      frames: [
        { key: 'bamster_p2_left_run1' },
        { key: 'bamster_p2_left_run2' },
      ],
      frameRate: 10,
      repeat: -1,
    });
  }
}
