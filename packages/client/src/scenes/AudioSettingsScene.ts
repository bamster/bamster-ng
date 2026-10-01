import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { createNeonTitle, createPanel, createRetroButton, drawRetroBackdrop } from '../ui/RetroUI';

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

    drawRetroBackdrop(this);
    createNeonTitle(this, 'AUDIO', 62, 46, '// SIGNAL MIXER');
    createPanel(this, GAME_WIDTH / 2, 280, 470, 300);

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
      this.sliderGraphics.fillRect(
        sliderX + 2,
        y - sliderHeight / 2 + 2,
        Math.max(0, fillWidth - 4),
        sliderHeight - 4
      );

      for (let tick = 0; tick <= 4; tick++) {
        const tickX = sliderX + (sliderWidth * tick) / 4;
        this.sliderGraphics.lineStyle(1, 0xffffff, 0.25);
        this.sliderGraphics.lineBetween(tickX, y + 11, tickX, y + 15);
      }

      // Handle
      const handleX = Phaser.Math.Clamp(
        sliderX + fillWidth - handleWidth / 2,
        sliderX,
        sliderX + sliderWidth - handleWidth
      );
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
    return createRetroButton(this, x, y, text, onClick, {
      width: 320,
      height: 50,
      fontSize: 19,
    });
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
