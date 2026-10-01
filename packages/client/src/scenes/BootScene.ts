import Phaser from 'phaser';
import { BLOCK_SIZE, BLOCK_COLORS } from '@bamster/shared';
import { drawRetroBackdrop } from '../ui/RetroUI';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const bg = drawRetroBackdrop(this);

    // Title
    const title = this.add.text(width / 2, height / 2 - 80, 'BAMster 2OOO', {
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

    // Generate power-up overlay textures (sneakers, gun upgrades)
    this.generatePowerUpOverlays();

    // Generate achievement badge textures
    this.generateAchievementBadges();

    // Load legacy sprites
    this.loadLegacySprites();
  }

  create(): void {
    // Create animations
    this.createAnimations();

    // Create legacy sprite animations
    this.createLegacyAnimations();

    // Start menu scene
    this.scene.start('MenuScene');
  }

  private loadLegacySprites(): void {
    // Load legacy BAMster sprites from the original game
    const basePath = 'sprites/legacy/';

    // Run animation frames (7 frames)
    for (let i = 0; i <= 6; i++) {
      this.load.image(`legacy_run_${i}`, `${basePath}bamster_run_r${i}.png`);
    }

    // Jump animation frames (8 frames)
    for (let i = 0; i <= 7; i++) {
      this.load.image(`legacy_jump_${i}`, `${basePath}bamster_jump_r${i}.png`);
    }

    // Wait/idle animation frames (4 frames)
    for (let i = 0; i <= 3; i++) {
      this.load.image(`legacy_wait_${i}`, `${basePath}bamster_wait_r${i}.png`);
    }
  }

  private createLegacyAnimations(): void {
    // Legacy run animation
    this.anims.create({
      key: 'legacy_run',
      frames: [
        { key: 'legacy_run_0' },
        { key: 'legacy_run_1' },
        { key: 'legacy_run_2' },
        { key: 'legacy_run_3' },
        { key: 'legacy_run_4' },
        { key: 'legacy_run_5' },
        { key: 'legacy_run_6' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // Legacy idle/wait animation
    this.anims.create({
      key: 'legacy_idle',
      frames: [
        { key: 'legacy_wait_0' },
        { key: 'legacy_wait_1' },
        { key: 'legacy_wait_2' },
        { key: 'legacy_wait_3' },
      ],
      frameRate: 6,
      repeat: -1,
    });

    // Legacy jump animation
    this.anims.create({
      key: 'legacy_jump',
      frames: [
        { key: 'legacy_jump_0' },
        { key: 'legacy_jump_1' },
        { key: 'legacy_jump_2' },
        { key: 'legacy_jump_3' },
      ],
      frameRate: 10,
      repeat: 0,
    });

    // Legacy fall animation (second half of jump frames)
    this.anims.create({
      key: 'legacy_fall',
      frames: [
        { key: 'legacy_jump_4' },
        { key: 'legacy_jump_5' },
        { key: 'legacy_jump_6' },
        { key: 'legacy_jump_7' },
      ],
      frameRate: 10,
      repeat: 0,
    });
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

    // Bomb power-up (row clear) - neon red/orange
    const bombGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    bombGraphics.fillStyle(0xff4400, 0.3);
    bombGraphics.fillCircle(center, center + 2, 14);
    // Bomb body (dark sphere)
    bombGraphics.fillStyle(0x222222, 1);
    bombGraphics.fillCircle(center, center + 2, 11);
    // Neon red highlights
    bombGraphics.fillStyle(0xff2200, 1);
    bombGraphics.fillCircle(center - 3, center, 3);
    // Fuse at top
    bombGraphics.lineStyle(3, 0x886644, 1);
    bombGraphics.lineBetween(center, center - 9, center + 4, center - 14);
    // Lit fuse spark (neon yellow/orange)
    bombGraphics.fillStyle(0xffff00, 1);
    bombGraphics.fillCircle(center + 4, center - 14, 4);
    bombGraphics.fillStyle(0xff8800, 1);
    bombGraphics.fillCircle(center + 4, center - 14, 2);
    // Small sparks
    bombGraphics.fillStyle(0xffff00, 0.8);
    bombGraphics.fillCircle(center + 7, center - 16, 2);
    bombGraphics.fillCircle(center + 2, center - 17, 1.5);
    // Skull icon on bomb
    bombGraphics.fillStyle(0xff4400, 1);
    bombGraphics.fillCircle(center, center + 2, 5);
    bombGraphics.fillStyle(0x000000, 1);
    bombGraphics.fillCircle(center - 2, center + 1, 1.5);
    bombGraphics.fillCircle(center + 2, center + 1, 1.5);
    bombGraphics.fillRect(center - 2, center + 4, 4, 2);
    bombGraphics.generateTexture('powerup_bomb', size, size);
    bombGraphics.destroy();

    // Fire Rate upgrade power-up (permanent) - neon yellow/gold
    const rateGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    rateGraphics.fillStyle(0xffff00, 0.3);
    rateGraphics.fillCircle(center, center, 14);
    // Inner circle
    rateGraphics.fillStyle(0xffaa00, 1);
    rateGraphics.fillCircle(center, center, 11);
    // Up arrows (speed increase icon)
    rateGraphics.fillStyle(0xffffff, 1);
    // Left arrow
    rateGraphics.fillTriangle(center - 6, center + 4, center - 2, center - 6, center + 2, center + 4);
    // Right arrow
    rateGraphics.fillTriangle(center - 2, center + 8, center + 2, center - 2, center + 6, center + 8);
    // Plus sign
    rateGraphics.fillStyle(0x00ff00, 1);
    rateGraphics.fillRect(center + 4, center - 8, 6, 2);
    rateGraphics.fillRect(center + 6, center - 10, 2, 6);
    rateGraphics.generateTexture('powerup_rate', size, size);
    rateGraphics.destroy();

    // Double Shot power-up (permanent) - neon magenta/purple
    const doubleGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    doubleGraphics.fillStyle(0xff00ff, 0.3);
    doubleGraphics.fillCircle(center, center, 14);
    // Inner circle
    doubleGraphics.fillStyle(0xaa00aa, 1);
    doubleGraphics.fillCircle(center, center, 11);
    // Two parallel laser beams icon
    doubleGraphics.fillStyle(0x00ffff, 1);
    // Top beam
    doubleGraphics.fillRect(6, center - 5, 16, 4);
    doubleGraphics.fillTriangle(22, center - 7, 22, center + 1, 28, center - 3);
    // Bottom beam
    doubleGraphics.fillRect(6, center + 1, 16, 4);
    doubleGraphics.fillTriangle(22, center - 1, 22, center + 7, 28, center + 3);
    // "x2" text hint
    doubleGraphics.fillStyle(0xffff00, 1);
    doubleGraphics.fillRect(center - 8, center + 6, 2, 4);
    doubleGraphics.fillRect(center - 6, center + 8, 2, 4);
    doubleGraphics.fillRect(center - 4, center + 6, 2, 4);
    doubleGraphics.generateTexture('powerup_double', size, size);
    doubleGraphics.destroy();
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

  private generatePowerUpOverlays(): void {
    // Sneakers overlay - neon cyan shoes that appear on Bamster's feet
    this.generateSneakersOverlay('sneakers_overlay', false);
    this.generateSneakersOverlay('sneakers_overlay_left', true);

    // Gun overlays for each weapon type
    this.generateGunOverlay('gun_rapid', false, 'rapid');
    this.generateGunOverlay('gun_rapid_left', true, 'rapid');
    this.generateGunOverlay('gun_spread', false, 'spread');
    this.generateGunOverlay('gun_spread_left', true, 'spread');
    this.generateGunOverlay('gun_piercing', false, 'piercing');
    this.generateGunOverlay('gun_piercing_left', true, 'piercing');
  }

  private generateSneakersOverlay(textureName: string, flipX: boolean): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const width = 56;
    const height = 20;
    const baseX = flipX ? 32 : 24;

    // Neon cyan sneakers with glow effect
    // Left shoe
    const leftShoeX = baseX - 8;
    const rightShoeX = baseX + 8;
    const shoeY = 8;

    // Glow around shoes
    graphics.fillStyle(0x00ffff, 0.3);
    graphics.fillEllipse(leftShoeX, shoeY, 14, 10);
    graphics.fillEllipse(rightShoeX, shoeY, 14, 10);

    // Shoe bodies
    graphics.fillStyle(0x00ccff, 1);
    graphics.fillEllipse(leftShoeX, shoeY, 10, 6);
    graphics.fillEllipse(rightShoeX, shoeY, 10, 6);

    // Neon pink soles
    graphics.fillStyle(0xff00ff, 1);
    graphics.fillRect(leftShoeX - 5, shoeY + 2, 10, 3);
    graphics.fillRect(rightShoeX - 5, shoeY + 2, 10, 3);

    // White stripes
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(leftShoeX - 4, shoeY - 2, 8, 2);
    graphics.fillRect(rightShoeX - 4, shoeY - 2, 8, 2);

    // Wing icons (speed)
    graphics.fillStyle(0xffff00, 1);
    const wingDir = flipX ? -1 : 1;
    graphics.fillTriangle(
      leftShoeX + wingDir * 4, shoeY - 4,
      leftShoeX + wingDir * 8, shoeY,
      leftShoeX + wingDir * 4, shoeY
    );
    graphics.fillTriangle(
      rightShoeX + wingDir * 4, shoeY - 4,
      rightShoeX + wingDir * 8, shoeY,
      rightShoeX + wingDir * 4, shoeY
    );

    graphics.generateTexture(textureName, width, height);
    graphics.destroy();
  }

  private generateGunOverlay(textureName: string, flipX: boolean, type: 'rapid' | 'spread' | 'piercing'): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const width = 40;
    const height = 20;

    // Colors based on weapon type
    const colors: Record<string, { main: number; glow: number }> = {
      rapid: { main: 0xff4400, glow: 0xff8800 },
      spread: { main: 0x00ff44, glow: 0x88ff88 },
      piercing: { main: 0x8844ff, glow: 0x00ffff },
    };
    const color = colors[type];

    const gunX = flipX ? 26 : 4;
    const gunY = 6;

    // Outer glow
    graphics.fillStyle(color.glow, 0.4);
    if (type === 'piercing') {
      // Longer barrel for piercing
      graphics.fillRoundedRect(gunX - (flipX ? 14 : 0), gunY - 4, 22, 14, 4);
    } else if (type === 'spread') {
      // Wider barrel for spread
      graphics.fillRoundedRect(gunX - (flipX ? 8 : 0), gunY - 5, 16, 16, 4);
    } else {
      // Standard size for rapid
      graphics.fillRoundedRect(gunX - (flipX ? 8 : 0), gunY - 3, 16, 12, 4);
    }

    // Gun body
    graphics.fillStyle(0x333333, 1);
    if (type === 'piercing') {
      // Longer gun
      graphics.fillRect(gunX - (flipX ? 10 : 0), gunY, 18, 6);
    } else if (type === 'spread') {
      // Wider muzzle
      graphics.fillRect(gunX - (flipX ? 6 : 0), gunY - 1, 14, 8);
    } else {
      // Standard gun
      graphics.fillRect(gunX - (flipX ? 6 : 0), gunY, 14, 6);
    }

    // Neon glow on muzzle
    graphics.fillStyle(color.main, 1);
    if (type === 'piercing') {
      const muzzleX = flipX ? gunX - 12 : gunX + 14;
      graphics.fillRect(muzzleX, gunY + 1, 6, 4);
      // Energy rings
      graphics.lineStyle(2, color.glow, 0.8);
      graphics.strokeCircle(flipX ? gunX - 6 : gunX + 10, gunY + 3, 4);
    } else if (type === 'spread') {
      // Triple muzzle glow
      const muzzleX = flipX ? gunX - 6 : gunX + 10;
      graphics.fillCircle(muzzleX, gunY, 3);
      graphics.fillCircle(muzzleX, gunY + 3, 3);
      graphics.fillCircle(muzzleX, gunY + 6, 3);
    } else {
      // Rapid fire glow - pulsing effect (just brighter)
      const muzzleX = flipX ? gunX - 6 : gunX + 10;
      graphics.fillRect(muzzleX, gunY + 1, 4, 4);
      // Extra glow effect
      graphics.fillStyle(color.glow, 0.6);
      graphics.fillCircle(muzzleX + 2, gunY + 3, 5);
    }

    graphics.generateTexture(textureName, width, height);
    graphics.destroy();
  }

  private generateAchievementBadges(): void {
    const size = 32;
    const center = size / 2;

    // Badge definitions - each maps to the icon string from achievements
    const badges: Array<{ icon: string; draw: (g: Phaser.GameObjects.Graphics) => void }> = [
      // Target icon (🎯) - for First Blood, Sniper
      {
        icon: '🎯',
        draw: (g) => {
          g.fillStyle(0xff0000, 1);
          g.fillCircle(center, center, 12);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center, 9);
          g.fillStyle(0xff0000, 1);
          g.fillCircle(center, center, 6);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center, 3);
        },
      },
      // Star icon (🌟)
      {
        icon: '🌟',
        draw: (g) => {
          g.fillStyle(0xffff00, 1);
          this.drawStar(g, center, center, 5, 12, 6);
          g.fillStyle(0xffffff, 0.5);
          this.drawStar(g, center - 2, center - 2, 5, 8, 4);
        },
      },
      // Corn icon (🌽)
      {
        icon: '🌽',
        draw: (g) => {
          g.fillStyle(0xffdd00, 1);
          g.fillEllipse(center, center + 2, 12, 18);
          g.fillStyle(0x00ff44, 1);
          g.fillTriangle(center - 6, 4, center, 10, center + 6, 4);
          g.fillStyle(0xffaa00, 1);
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              g.fillCircle(center - 4 + col * 4, 12 + row * 5, 2);
            }
          }
        },
      },
      // 100 icon (💯)
      {
        icon: '💯',
        draw: (g) => {
          g.fillStyle(0xff0000, 1);
          g.fillRect(6, 8, 6, 16);
          g.fillCircle(17, 18, 5);
          g.fillCircle(26, 18, 5);
          g.fillStyle(0x000000, 1);
          g.fillCircle(17, 18, 2);
          g.fillCircle(26, 18, 2);
        },
      },
      // Money bag (💰)
      {
        icon: '💰',
        draw: (g) => {
          g.fillStyle(0xcc8844, 1);
          g.fillEllipse(center, center + 4, 18, 14);
          g.fillRect(center - 3, 4, 6, 8);
          g.fillStyle(0xffff00, 1);
          g.fillRect(center - 2, center + 1, 4, 8);
          g.fillRect(center - 4, center + 3, 8, 4);
        },
      },
      // Crown (👑)
      {
        icon: '👑',
        draw: (g) => {
          g.fillStyle(0xffd700, 1);
          g.fillRect(6, 16, 20, 10);
          g.fillTriangle(6, 16, 6, 6, 11, 16);
          g.fillTriangle(16, 16, 16, 4, 21, 16);
          g.fillTriangle(26, 16, 26, 6, 21, 16);
          g.fillStyle(0xff0000, 1);
          g.fillCircle(8, 10, 2);
          g.fillCircle(16, 8, 2);
          g.fillCircle(24, 10, 2);
        },
      },
      // Brick/Block (🧱)
      {
        icon: '🧱',
        draw: (g) => {
          g.fillStyle(0xcc4400, 1);
          g.fillRect(4, 6, 24, 20);
          g.lineStyle(2, 0x884400, 1);
          g.lineBetween(4, 16, 28, 16);
          g.lineBetween(16, 6, 16, 16);
          g.lineBetween(10, 16, 10, 26);
          g.lineBetween(22, 16, 22, 26);
        },
      },
      // Explosion (💥)
      {
        icon: '💥',
        draw: (g) => {
          g.fillStyle(0xff4400, 1);
          this.drawStar(g, center, center, 8, 14, 7);
          g.fillStyle(0xffff00, 1);
          this.drawStar(g, center, center, 8, 8, 4);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center, 3);
        },
      },
      // Skull (☠️)
      {
        icon: '☠️',
        draw: (g) => {
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center - 2, 10);
          g.fillRect(center - 4, center + 6, 8, 6);
          g.fillStyle(0x000000, 1);
          g.fillCircle(center - 4, center - 2, 3);
          g.fillCircle(center + 4, center - 2, 3);
          g.fillTriangle(center - 2, center + 2, center + 2, center + 2, center, center + 5);
        },
      },
      // Fire (🔥)
      {
        icon: '🔥',
        draw: (g) => {
          g.fillStyle(0xff4400, 1);
          g.fillEllipse(center, center + 4, 14, 18);
          g.fillStyle(0xffaa00, 1);
          g.fillEllipse(center, center + 6, 10, 12);
          g.fillStyle(0xffff00, 1);
          g.fillEllipse(center, center + 8, 6, 8);
        },
      },
      // Lightning (⚡)
      {
        icon: '⚡',
        draw: (g) => {
          g.fillStyle(0xffff00, 1);
          g.fillTriangle(center - 6, 4, center + 6, 4, center - 2, 16);
          g.fillTriangle(center - 4, 14, center + 8, 14, center, 28);
          g.fillStyle(0xffffff, 0.6);
          g.fillTriangle(center - 4, 6, center + 4, 6, center - 1, 14);
        },
      },
      // Rainbow (🌈)
      {
        icon: '🌈',
        draw: (g) => {
          const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
          colors.forEach((color, i) => {
            g.lineStyle(3, color, 1);
            g.beginPath();
            g.arc(center, center + 8, 12 - i * 2, Math.PI, 0, false);
            g.strokePath();
          });
        },
      },
      // Timer (⏱️)
      {
        icon: '⏱️',
        draw: (g) => {
          g.fillStyle(0x888888, 1);
          g.fillCircle(center, center + 2, 12);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center + 2, 10);
          g.fillStyle(0x000000, 1);
          g.fillRect(center - 1, center - 4, 2, 6);
          g.fillRect(center - 1, center, 5, 2);
          g.fillRect(center - 2, 2, 4, 4);
        },
      },
      // Runner (🏃)
      {
        icon: '🏃',
        draw: (g) => {
          g.fillStyle(0x00ffff, 1);
          g.fillCircle(center, 8, 5);
          g.fillRect(center - 2, 12, 4, 10);
          g.fillRect(center - 6, 14, 12, 3);
          g.fillRect(center - 4, 22, 3, 6);
          g.fillRect(center + 1, 22, 3, 6);
        },
      },
      // Trophy (🏆)
      {
        icon: '🏆',
        draw: (g) => {
          g.fillStyle(0xffd700, 1);
          g.fillRect(center - 6, 6, 12, 12);
          g.fillRect(center - 8, 6, 4, 8);
          g.fillRect(center + 4, 6, 4, 8);
          g.fillRect(center - 2, 18, 4, 4);
          g.fillRect(center - 5, 22, 10, 4);
          g.fillStyle(0xffaa00, 0.5);
          g.fillCircle(center, 12, 3);
        },
      },
      // Shield (🛡️)
      {
        icon: '🛡️',
        draw: (g) => {
          g.fillStyle(0x4488ff, 1);
          g.fillEllipse(center, center + 2, 16, 20);
          g.fillRect(center - 8, 4, 16, 8);
          g.fillStyle(0xffd700, 1);
          g.fillCircle(center, center, 5);
        },
      },
      // Battery (🔋)
      {
        icon: '🔋',
        draw: (g) => {
          g.fillStyle(0x444444, 1);
          g.fillRect(6, 10, 20, 12);
          g.fillRect(26, 13, 4, 6);
          g.fillStyle(0x00ff00, 1);
          g.fillRect(8, 12, 16, 8);
        },
      },
      // Gift (🎁)
      {
        icon: '🎁',
        draw: (g) => {
          g.fillStyle(0xff00ff, 1);
          g.fillRect(6, 12, 20, 14);
          g.fillRect(8, 6, 16, 6);
          g.fillStyle(0xffff00, 1);
          g.fillRect(center - 2, 6, 4, 20);
          g.fillRect(6, center, 20, 4);
        },
      },
      // Scared face (😰)
      {
        icon: '😰',
        draw: (g) => {
          g.fillStyle(0xffdd00, 1);
          g.fillCircle(center, center, 12);
          g.fillStyle(0x000000, 1);
          g.fillCircle(center - 4, center - 2, 2);
          g.fillCircle(center + 4, center - 2, 2);
          g.fillEllipse(center, center + 6, 6, 4);
          g.fillStyle(0x00aaff, 1);
          g.fillEllipse(center + 8, center, 3, 5);
        },
      },
      // Skull face (💀)
      {
        icon: '💀',
        draw: (g) => {
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center - 2, 11);
          g.fillRect(center - 5, center + 6, 10, 6);
          g.fillStyle(0x000000, 1);
          g.fillCircle(center - 4, center - 2, 4);
          g.fillCircle(center + 4, center - 2, 4);
          g.fillTriangle(center - 2, center + 3, center + 2, center + 3, center, center + 6);
          g.fillRect(center - 4, center + 8, 2, 4);
          g.fillRect(center - 1, center + 8, 2, 4);
          g.fillRect(center + 2, center + 8, 2, 4);
        },
      },
      // Peace symbol (☮️)
      {
        icon: '☮️',
        draw: (g) => {
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, center, 12);
          g.fillStyle(0x8800ff, 1);
          g.fillCircle(center, center, 10);
          g.fillStyle(0xffffff, 1);
          g.fillRect(center - 1, center - 10, 2, 20);
          g.fillTriangle(center, center, center - 7, center + 7, center, center + 10);
          g.fillTriangle(center, center, center + 7, center + 7, center, center + 10);
        },
      },
      // Gun (🔫)
      {
        icon: '🔫',
        draw: (g) => {
          g.fillStyle(0x444444, 1);
          g.fillRect(6, 12, 16, 8);
          g.fillRect(10, 18, 6, 8);
          g.fillStyle(0xff00ff, 1);
          g.fillRect(22, 14, 6, 4);
        },
      },
      // Wind/Dash (💨)
      {
        icon: '💨',
        draw: (g) => {
          g.lineStyle(3, 0x88ccff, 1);
          g.lineBetween(6, 10, 26, 10);
          g.lineBetween(8, 16, 24, 16);
          g.lineBetween(10, 22, 22, 22);
          g.fillStyle(0x88ccff, 1);
          g.fillCircle(26, 10, 3);
          g.fillCircle(24, 16, 2);
          g.fillCircle(22, 22, 2);
        },
      },
      // Tornado (🌪️)
      {
        icon: '🌪️',
        draw: (g) => {
          g.fillStyle(0x88aacc, 1);
          g.fillEllipse(center, 8, 16, 6);
          g.fillEllipse(center, 14, 12, 5);
          g.fillEllipse(center, 20, 8, 4);
          g.fillEllipse(center, 25, 4, 3);
          g.fillStyle(0xaaccee, 0.5);
          g.fillEllipse(center - 2, 8, 6, 3);
        },
      },
      // Masks (🎭)
      {
        icon: '🎭',
        draw: (g) => {
          // Happy mask
          g.fillStyle(0xffffff, 1);
          g.fillEllipse(10, center, 8, 10);
          g.fillStyle(0x000000, 1);
          g.fillCircle(8, center - 2, 2);
          g.fillCircle(12, center - 2, 2);
          g.beginPath();
          g.arc(10, center + 2, 4, 0, Math.PI, false);
          g.strokePath();
          // Sad mask
          g.fillStyle(0xffffff, 1);
          g.fillEllipse(22, center, 8, 10);
          g.fillStyle(0x000000, 1);
          g.fillCircle(20, center - 2, 2);
          g.fillCircle(24, center - 2, 2);
          g.beginPath();
          g.arc(22, center + 4, 4, Math.PI, 0, false);
          g.strokePath();
        },
      },
      // Volcano (🌋)
      {
        icon: '🌋',
        draw: (g) => {
          g.fillStyle(0x884422, 1);
          g.fillTriangle(center, 6, 4, 28, 28, 28);
          g.fillStyle(0xff4400, 1);
          g.fillRect(center - 4, 4, 8, 8);
          g.fillStyle(0xffaa00, 1);
          g.fillCircle(center, 6, 4);
          g.fillCircle(center - 3, 2, 2);
          g.fillCircle(center + 3, 2, 2);
        },
      },
      // Ghost (👻)
      {
        icon: '👻',
        draw: (g) => {
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center, 12, 10);
          g.fillRect(center - 10, 12, 20, 14);
          g.fillCircle(center - 6, 26, 4);
          g.fillCircle(center + 6, 26, 4);
          g.fillStyle(0x000000, 1);
          g.fillCircle(center - 4, 12, 3);
          g.fillCircle(center + 4, 12, 3);
          g.fillEllipse(center, 18, 6, 3);
        },
      },
    ];

    // Generate each badge texture
    badges.forEach(({ icon, draw }) => {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      draw(graphics);
      graphics.generateTexture(`badge_${icon}`, size, size);
      graphics.destroy();
    });

    // Also create a default/unknown badge
    const defaultBadge = this.make.graphics({ x: 0, y: 0 });
    defaultBadge.fillStyle(0x444444, 1);
    defaultBadge.fillCircle(center, center, 12);
    defaultBadge.fillStyle(0xffffff, 1);
    defaultBadge.fillRect(center - 2, center - 8, 4, 10);
    defaultBadge.fillCircle(center, center + 6, 2);
    defaultBadge.generateTexture('badge_default', size, size);
    defaultBadge.destroy();
  }

  /** Helper to draw a star shape */
  private drawStar(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    points: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    const step = Math.PI / points;
    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.closePath();
    graphics.fillPath();
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
