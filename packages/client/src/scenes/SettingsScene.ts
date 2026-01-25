import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { loadKeyBindings, getKeyDisplayName, type GameKeyBindings } from '../systems/KeyBindings';

// 80s color palette (matching other scenes)
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  darkPurple: 0x2a0a4a,
  panelBg: 0x120824,
};

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  blockFallSpeed: number;
  blockSpawnInterval: number;
  startingHealth: number;
  blockSpawnIntervalMin: number;
  label: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    blockFallSpeed: 80,
    blockSpawnInterval: 1600,
    blockSpawnIntervalMin: 600,
    startingHealth: 5,
    label: 'EASY',
  },
  normal: {
    blockFallSpeed: 120,
    blockSpawnInterval: 1200,
    blockSpawnIntervalMin: 400,
    startingHealth: 3,
    label: 'NORMAL',
  },
  hard: {
    blockFallSpeed: 160,
    blockSpawnInterval: 800,
    blockSpawnIntervalMin: 250,
    startingHealth: 2,
    label: 'HARD',
  },
};

interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  difficulty: Difficulty;
  debugMode: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  difficulty: 'normal',
  debugMode: false,
};

export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private sliderGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    // Load saved settings
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

    // Title with chrome/neon effect
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 53, 'SETTINGS', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 50, 'SETTINGS', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Graphics for sliders
    this.sliderGraphics = this.add.graphics();

    // Volume section
    this.add.text(GAME_WIDTH / 2, 110, '─── AUDIO ───', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    // Volume sliders
    this.createSlider(GAME_WIDTH / 2, 150, 'MASTER VOLUME', 'masterVolume');
    this.createSlider(GAME_WIDTH / 2, 200, 'MUSIC VOLUME', 'musicVolume');
    this.createSlider(GAME_WIDTH / 2, 250, 'SFX VOLUME', 'sfxVolume');

    // Difficulty section
    this.add.text(GAME_WIDTH / 2, 300, '─── DIFFICULTY ───', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.createDifficultySelector(GAME_WIDTH / 2, 340);

    // Controls section
    this.add.text(GAME_WIDTH / 2, 390, '─── CONTROLS ───', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    // Load key bindings
    const bindings: GameKeyBindings = loadKeyBindings();

    // Controls display using actual bindings
    const controlsData = [
      { action: 'MOVE LEFT', key: `${getKeyDisplayName(bindings.player1.left)} / A` },
      { action: 'MOVE RIGHT', key: `${getKeyDisplayName(bindings.player1.right)} / D` },
      { action: 'JUMP', key: `${getKeyDisplayName(bindings.player1.jump)} / W` },
      { action: 'SHOOT', key: getKeyDisplayName(bindings.player1.shoot) },
      { action: 'PAUSE', key: 'ESC / P' },
    ];

    let controlY = 430;
    controlsData.forEach((control) => {
      this.add.text(GAME_WIDTH / 2 - 120, controlY, control.action, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#888888',
      });
      this.add.text(GAME_WIDTH / 2 + 60, controlY, control.key, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffff00',
      });
      controlY += 28;
    });

    // Player 2 controls
    const p2Keys = `${getKeyDisplayName(bindings.player2.left)}${getKeyDisplayName(bindings.player2.jump)}${getKeyDisplayName(bindings.player2.right)} + ${getKeyDisplayName(bindings.player2.shoot)} (shoot)`;
    this.add.text(GAME_WIDTH / 2, controlY + 20, `PLAYER 2: ${p2Keys}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 60, '◄ BACK TO MENU', () => {
      this.saveSettings();
      this.scene.start('MenuScene');
    });

    // Render initial slider states
    this.renderSliders();
  }

  private createSlider(
    x: number,
    y: number,
    label: string,
    settingKey: keyof GameSettings
  ): void {
    const sliderWidth = 200;
    const sliderHeight = 20;
    const sliderX = x - sliderWidth / 2;

    // Label
    this.add.text(x, y - 20, label, {
      fontSize: '14px',
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
    const settingKey = hitZone.getData('settingKey') as 'masterVolume' | 'musicVolume' | 'sfxVolume';
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

    const sliderWidth = 200;
    const sliderHeight = 12;
    const handleWidth = 8;

    const sliders: { key: 'masterVolume' | 'musicVolume' | 'sfxVolume'; y: number }[] = [
      { key: 'masterVolume', y: 150 },
      { key: 'musicVolume', y: 200 },
      { key: 'sfxVolume', y: 250 },
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
      const percentText = this.add.text(GAME_WIDTH / 2 + 120, y, `${Math.round(value * 100)}%`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffff00',
      });
      percentText.setOrigin(0, 0.5);
      percentText.setData('isPercentage', true);
    });
  }

  private difficultyButtons: Phaser.GameObjects.Container[] = [];

  private createDifficultySelector(x: number, y: number): void {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
    const buttonWidth = 90;
    const spacing = 10;
    const totalWidth = difficulties.length * buttonWidth + (difficulties.length - 1) * spacing;
    let startX = x - totalWidth / 2 + buttonWidth / 2;

    difficulties.forEach((difficulty) => {
      const config = DIFFICULTY_CONFIGS[difficulty];
      const container = this.add.container(startX, y);

      const bg = this.add.rectangle(0, 0, buttonWidth, 35, COLORS.darkPurple);
      bg.setStrokeStyle(2, COLORS.neonPink);

      const label = this.add.text(0, 0, config.label, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      container.add([bg, label]);
      container.setSize(buttonWidth, 35);
      container.setInteractive({ useHandCursor: true });
      container.setData('difficulty', difficulty);
      container.setData('bg', bg);
      container.setData('label', label);

      container.on('pointerover', () => {
        if (this.settings.difficulty !== difficulty) {
          bg.setFillStyle(0x4a1a6a);
        }
      });

      container.on('pointerout', () => {
        if (this.settings.difficulty !== difficulty) {
          bg.setFillStyle(COLORS.darkPurple);
        }
      });

      container.on('pointerdown', () => {
        this.settings.difficulty = difficulty;
        this.updateDifficultyButtons();
      });

      this.difficultyButtons.push(container);
      startX += buttonWidth + spacing;
    });

    // Set initial button states
    this.updateDifficultyButtons();
  }

  private updateDifficultyButtons(): void {
    this.difficultyButtons.forEach((container) => {
      const difficulty = container.getData('difficulty') as Difficulty;
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      const label = container.getData('label') as Phaser.GameObjects.Text;

      if (this.settings.difficulty === difficulty) {
        bg.setFillStyle(0x4a1a6a);
        bg.setStrokeStyle(3, COLORS.neonCyan);
        label.setColor('#00ffff');
      } else {
        bg.setFillStyle(COLORS.darkPurple);
        bg.setStrokeStyle(2, COLORS.neonPink);
        label.setColor('#ffffff');
      }
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

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('bamster_settings');
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('bamster_settings', JSON.stringify(this.settings));
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Helper to get current settings from anywhere
export function getGameSettings(): GameSettings {
  try {
    const saved = localStorage.getItem('bamster_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore
  }
  return { ...DEFAULT_SETTINGS };
}

// Check if debug mode is enabled (from settings or URL param)
export function isDebugMode(): boolean {
  // Check URL parameter first (takes precedence)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      return true;
    }
  }
  return getGameSettings().debugMode;
}

// Toggle debug mode and save to settings
export function toggleDebugMode(): boolean {
  const settings = getGameSettings();
  settings.debugMode = !settings.debugMode;
  try {
    localStorage.setItem('bamster_settings', JSON.stringify(settings));
  } catch {
    // Ignore localStorage errors
  }
  return settings.debugMode;
}
