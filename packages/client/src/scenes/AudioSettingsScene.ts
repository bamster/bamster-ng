import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';

// 80s color palette (matching other scenes)
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  darkPurple: 0x2a0a4a,
};

interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

const AUDIO_STORAGE_KEY = 'bamster_settings';

export class AudioSettingsScene extends Phaser.Scene {
  private settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.8,
  };
  private sliderGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'AudioSettingsScene' });
  }

  create(): void {
    this.loadSettings();

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

    // Title
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 83, 'AUDIO SETTINGS', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 80, 'AUDIO SETTINGS', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Graphics for sliders
    this.sliderGraphics = this.add.graphics();

    // Volume sliders - centered vertically
    const startY = 180;
    const spacing = 80;

    this.createSlider(GAME_WIDTH / 2, startY, 'MASTER VOLUME', 'masterVolume');
    this.createSlider(GAME_WIDTH / 2, startY + spacing, 'MUSIC VOLUME', 'musicVolume');
    this.createSlider(GAME_WIDTH / 2, startY + spacing * 2, 'SFX VOLUME', 'sfxVolume');

    // Render initial slider states
    this.renderSliders();

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 80, '◄ BACK TO SETTINGS', () => {
      this.saveSettings();
      this.scene.start('SettingsScene');
    });
  }

  private createSlider(
    x: number,
    y: number,
    label: string,
    settingKey: keyof AudioSettings
  ): void {
    const sliderWidth = 300;
    const sliderHeight = 24;
    const sliderX = x - sliderWidth / 2;

    // Label
    this.add.text(x, y - 28, label, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Create interactive zone for the slider
    const hitZone = this.add.rectangle(x, y, sliderWidth + 20, sliderHeight + 20, 0x000000, 0);
    hitZone.setInteractive({ useHandCursor: true });

    // Store slider data
    hitZone.setData('settingKey', settingKey);
    hitZone.setData('sliderX', sliderX);
    hitZone.setData('sliderWidth', sliderWidth);
    hitZone.setData('sliderY', y);

    // Handle pointer events
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateSliderValue(hitZone, pointer.x);
    });

    hitZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.updateSliderValue(hitZone, pointer.x);
      }
    });
  }

  private updateSliderValue(hitZone: Phaser.GameObjects.Rectangle, pointerX: number): void {
    const settingKey = hitZone.getData('settingKey') as keyof AudioSettings;
    const sliderX = hitZone.getData('sliderX') as number;
    const sliderWidth = hitZone.getData('sliderWidth') as number;

    // Calculate value (0-1)
    let value = (pointerX - sliderX) / sliderWidth;
    value = Phaser.Math.Clamp(value, 0, 1);

    // Update setting
    this.settings[settingKey] = value;

    // Re-render sliders
    this.renderSliders();
  }

  private renderSliders(): void {
    this.sliderGraphics.clear();

    const sliderWidth = 300;
    const sliderHeight = 16;
    const handleWidth = 10;

    const startY = 180;
    const spacing = 80;

    const sliders: { key: keyof AudioSettings; y: number }[] = [
      { key: 'masterVolume', y: startY },
      { key: 'musicVolume', y: startY + spacing },
      { key: 'sfxVolume', y: startY + spacing * 2 },
    ];

    sliders.forEach(({ key, y }) => {
      const sliderX = GAME_WIDTH / 2 - sliderWidth / 2;
      const value = this.settings[key];

      // Slider track (background)
      this.sliderGraphics.fillStyle(COLORS.darkPurple, 1);
      this.sliderGraphics.fillRect(sliderX, y - sliderHeight / 2, sliderWidth, sliderHeight);

      // Slider track border
      this.sliderGraphics.lineStyle(2, COLORS.neonPink, 0.8);
      this.sliderGraphics.strokeRect(sliderX, y - sliderHeight / 2, sliderWidth, sliderHeight);

      // Filled portion
      const fillWidth = value * sliderWidth;
      this.sliderGraphics.fillStyle(COLORS.neonCyan, 0.6);
      this.sliderGraphics.fillRect(sliderX + 2, y - sliderHeight / 2 + 2, fillWidth - 4, sliderHeight - 4);

      // Handle
      const handleX = sliderX + fillWidth - handleWidth / 2;
      this.sliderGraphics.fillStyle(COLORS.neonYellow, 1);
      this.sliderGraphics.fillRect(handleX, y - sliderHeight / 2 - 2, handleWidth, sliderHeight + 4);
    });

    // Add percentage texts (recreate each time)
    this.children.each((child) => {
      if (child instanceof Phaser.GameObjects.Text && child.getData('isPercentage')) {
        child.destroy();
      }
      return true;
    });

    sliders.forEach(({ key, y }) => {
      const value = this.settings[key];
      const percentText = this.add.text(GAME_WIDTH / 2 + 170, y, `${Math.round(value * 100)}%`, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffff00',
      });
      percentText.setOrigin(0, 0.5);
      percentText.setData('isPercentage', true);
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 320, 50, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, 0, text, {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(320, 50);
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

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          masterVolume: parsed.masterVolume ?? 0.8,
          musicVolume: parsed.musicVolume ?? 0.7,
          sfxVolume: parsed.sfxVolume ?? 0.8,
        };
      }
    } catch {
      // Use defaults
    }
  }

  private saveSettings(): void {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      const updated = {
        ...existing,
        masterVolume: this.settings.masterVolume,
        musicVolume: this.settings.musicVolume,
        sfxVolume: this.settings.sfxVolume,
      };
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }
}
