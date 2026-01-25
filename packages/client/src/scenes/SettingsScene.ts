import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import {
  loadKeyBindings,
  saveKeyBindings,
  resetKeyBindings,
  getKeyDisplayName,
  keyEventToString,
  type GameKeyBindings,
  type PlayerKeyBindings,
} from '../systems/KeyBindings';

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
export type SpriteStyle = 'modern' | 'legacy';

export interface DifficultyConfig {
  blockFallSpeed: number;
  blockSpawnInterval: number;
  startingHealth: number;
  blockSpawnIntervalMin: number;
  comboTimeout: number; // ms - time before combo resets
  label: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    blockFallSpeed: 80,
    blockSpawnInterval: 1600,
    blockSpawnIntervalMin: 600,
    startingHealth: 5,
    comboTimeout: 3000, // 3 seconds - more forgiving
    label: 'EASY',
  },
  normal: {
    blockFallSpeed: 120,
    blockSpawnInterval: 1200,
    blockSpawnIntervalMin: 400,
    startingHealth: 3,
    comboTimeout: 2000, // 2 seconds - balanced
    label: 'NORMAL',
  },
  hard: {
    blockFallSpeed: 160,
    blockSpawnInterval: 800,
    blockSpawnIntervalMin: 250,
    startingHealth: 2,
    comboTimeout: 1500, // 1.5 seconds - challenging
    label: 'HARD',
  },
};

interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  difficulty: Difficulty;
  debugMode: boolean;
  spriteStyle: SpriteStyle;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  difficulty: 'normal',
  debugMode: false,
  spriteStyle: 'modern',
};

export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings = { ...DEFAULT_SETTINGS };


  // Key binding state
  private keyBindings!: GameKeyBindings;
  private waitingForKey: { player: 'player1' | 'player2'; action: keyof PlayerKeyBindings } | { global: 'screenshot' } | null = null;
  private keyBindingTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private keyBindingOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    // Load saved settings
    this.loadSettings();

    // Load key bindings
    this.keyBindings = loadKeyBindings();
    this.keyBindingTexts.clear();
    this.waitingForKey = null;

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

    // Audio settings button (opens sub-menu)
    this.createMenuButton(GAME_WIDTH / 2, 115, 'AUDIO SETTINGS ►', () => {
      this.saveSettings();
      this.scene.start('AudioSettingsScene');
    });

    // Difficulty section
    this.add.text(GAME_WIDTH / 2, 170, '─── DIFFICULTY ───', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.createDifficultySelector(GAME_WIDTH / 2, 210);

    // Sprite style section
    this.add.text(GAME_WIDTH / 2, 265, '─── SPRITE STYLE ───', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.createSpriteStyleSelector(GAME_WIDTH / 2, 305);

    // Controls section
    this.add.text(GAME_WIDTH / 2, 360, '─── CONTROLS (click to rebind) ───', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    // Player 1 controls
    this.add.text(GAME_WIDTH / 2 - 180, 395, 'P1:', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    this.createKeyBinding(GAME_WIDTH / 2 - 110, 395, 'LEFT', 'player1', 'left');
    this.createKeyBinding(GAME_WIDTH / 2 - 35, 395, 'RIGHT', 'player1', 'right');
    this.createKeyBinding(GAME_WIDTH / 2 + 40, 395, 'JUMP', 'player1', 'jump');
    this.createKeyBinding(GAME_WIDTH / 2 + 125, 395, 'SHOOT', 'player1', 'shoot');

    // Player 2 controls
    this.add.text(GAME_WIDTH / 2 - 180, 445, 'P2:', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.createKeyBinding(GAME_WIDTH / 2 - 110, 445, 'LEFT', 'player2', 'left');
    this.createKeyBinding(GAME_WIDTH / 2 - 35, 445, 'RIGHT', 'player2', 'right');
    this.createKeyBinding(GAME_WIDTH / 2 + 40, 445, 'JUMP', 'player2', 'jump');
    this.createKeyBinding(GAME_WIDTH / 2 + 125, 445, 'SHOOT', 'player2', 'shoot');

    // Screenshot key binding
    this.add.text(GAME_WIDTH / 2 - 180, 480, 'SCREENSHOT:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffff00',
    });
    this.createGlobalKeyBinding(GAME_WIDTH / 2 - 60, 480, 'screenshot');

    // Reset to defaults button
    this.createSmallButton(GAME_WIDTH / 2, 515, 'RESET CONTROLS', () => {
      this.keyBindings = resetKeyBindings();
      this.updateAllKeyBindingTexts();
    });

    // Setup keyboard listener for rebinding
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.waitingForKey) {
        event.preventDefault();
        const keyStr = keyEventToString(event);

        // ESC cancels rebinding
        if (keyStr === 'ESC') {
          this.hideKeyBindingOverlay();
          this.waitingForKey = null;
          return;
        }

        // Handle global bindings (like screenshot)
        if ('global' in this.waitingForKey) {
          this.keyBindings[this.waitingForKey.global] = keyStr;
        } else {
          this.keyBindings[this.waitingForKey.player][this.waitingForKey.action] = keyStr;
        }
        saveKeyBindings(this.keyBindings);
        this.updateAllKeyBindingTexts();
        this.hideKeyBindingOverlay();
        this.waitingForKey = null;
      }
    });

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 60, '◄ BACK TO MENU', () => {
      this.saveSettings();
      this.scene.start('MenuScene');
    });
  }


  private createMenuButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 280, 40, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(280, 40);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0x4a1a6a);
      bg.setStrokeStyle(3, COLORS.neonCyan);
      label.setColor('#00ffff');
    });

    container.on('pointerout', () => {
      bg.setFillStyle(COLORS.darkPurple);
      bg.setStrokeStyle(2, COLORS.neonPink);
      label.setColor('#ffffff');
    });

    container.on('pointerdown', onClick);

    return container;
  }

  private difficultyButtons: Phaser.GameObjects.Container[] = [];

  private createDifficultySelector(x: number, y: number): void {
    // Clear old button references (important for scene restart)
    this.difficultyButtons = [];

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

  private spriteStyleButtons: Phaser.GameObjects.Container[] = [];

  private createSpriteStyleSelector(x: number, y: number): void {
    this.spriteStyleButtons = [];

    const styles: { style: SpriteStyle; label: string }[] = [
      { style: 'modern', label: 'MODERN' },
      { style: 'legacy', label: 'LEGACY' },
    ];
    const buttonWidth = 120;
    const spacing = 20;
    const totalWidth = styles.length * buttonWidth + (styles.length - 1) * spacing;
    let startX = x - totalWidth / 2 + buttonWidth / 2;

    styles.forEach(({ style, label }) => {
      const container = this.add.container(startX, y);

      const bg = this.add.rectangle(0, 0, buttonWidth, 35, COLORS.darkPurple);
      bg.setStrokeStyle(2, COLORS.neonPink);

      const labelText = this.add.text(0, 0, label, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
      });
      labelText.setOrigin(0.5);

      container.add([bg, labelText]);
      container.setSize(buttonWidth, 35);
      container.setInteractive({ useHandCursor: true });
      container.setData('style', style);
      container.setData('bg', bg);
      container.setData('label', labelText);

      container.on('pointerover', () => {
        if (this.settings.spriteStyle !== style) {
          bg.setFillStyle(0x4a1a6a);
        }
      });

      container.on('pointerout', () => {
        if (this.settings.spriteStyle !== style) {
          bg.setFillStyle(COLORS.darkPurple);
        }
      });

      container.on('pointerdown', () => {
        this.settings.spriteStyle = style;
        this.updateSpriteStyleButtons();
      });

      this.spriteStyleButtons.push(container);
      startX += buttonWidth + spacing;
    });

    this.updateSpriteStyleButtons();
  }

  private updateSpriteStyleButtons(): void {
    this.spriteStyleButtons.forEach((container) => {
      const style = container.getData('style') as SpriteStyle;
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      const label = container.getData('label') as Phaser.GameObjects.Text;

      if (this.settings.spriteStyle === style) {
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

  private createKeyBinding(
    x: number,
    y: number,
    label: string,
    player: 'player1' | 'player2',
    action: keyof PlayerKeyBindings
  ): void {
    // Label above the key
    this.add.text(x, y - 12, label, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // Key display (clickable)
    const keyText = this.add.text(x, y + 8, getKeyDisplayName(this.keyBindings[player][action]), {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
      backgroundColor: '#2a0a4a',
      padding: { x: 8, y: 4 },
    });
    keyText.setOrigin(0.5);
    keyText.setInteractive({ useHandCursor: true });

    // Store reference for updates
    this.keyBindingTexts.set(`${player}_${action}`, keyText);

    // Hover effects
    keyText.on('pointerover', () => {
      keyText.setStyle({ color: '#00ffff', backgroundColor: '#4a1a6a' });
    });
    keyText.on('pointerout', () => {
      keyText.setStyle({ color: '#ffff00', backgroundColor: '#2a0a4a' });
    });

    // Click to rebind
    keyText.on('pointerdown', () => {
      this.waitingForKey = { player, action };
      this.showKeyBindingOverlay(label);
    });
  }

  private createGlobalKeyBinding(
    x: number,
    y: number,
    binding: 'screenshot'
  ): void {
    // Key display (clickable)
    const keyText = this.add.text(x, y, getKeyDisplayName(this.keyBindings[binding]), {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
      backgroundColor: '#2a0a4a',
      padding: { x: 8, y: 4 },
    });
    keyText.setOrigin(0, 0.5);
    keyText.setInteractive({ useHandCursor: true });

    // Store reference for updates
    this.keyBindingTexts.set(`global_${binding}`, keyText);

    // Hover effects
    keyText.on('pointerover', () => {
      keyText.setStyle({ color: '#00ffff', backgroundColor: '#4a1a6a' });
    });
    keyText.on('pointerout', () => {
      keyText.setStyle({ color: '#ffff00', backgroundColor: '#2a0a4a' });
    });

    // Click to rebind
    keyText.on('pointerdown', () => {
      this.waitingForKey = { global: binding };
      this.showKeyBindingOverlay('SCREENSHOT');
    });
  }

  private updateAllKeyBindingTexts(): void {
    this.keyBindingTexts.forEach((text, key) => {
      if (key.startsWith('global_')) {
        const binding = key.replace('global_', '') as 'screenshot';
        text.setText(getKeyDisplayName(this.keyBindings[binding]));
      } else {
        const [player, action] = key.split('_') as ['player1' | 'player2', keyof PlayerKeyBindings];
        text.setText(getKeyDisplayName(this.keyBindings[player][action]));
      }
    });
  }

  private showKeyBindingOverlay(actionName: string): void {
    this.hideKeyBindingOverlay();

    this.keyBindingOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.keyBindingOverlay.setDepth(100);

    // Dark overlay background
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
    this.keyBindingOverlay.add(bg);

    // Prompt box
    const box = this.add.rectangle(0, 0, 300, 100, COLORS.darkPurple);
    box.setStrokeStyle(3, COLORS.neonCyan);
    this.keyBindingOverlay.add(box);

    // Prompt text
    const prompt = this.add.text(0, -20, `Press key for ${actionName}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    prompt.setOrigin(0.5);
    this.keyBindingOverlay.add(prompt);

    const hint = this.add.text(0, 15, '(ESC to cancel)', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    hint.setOrigin(0.5);
    this.keyBindingOverlay.add(hint);

    // Pulsing animation
    this.tweens.add({
      targets: box,
      alpha: { from: 1, to: 0.7 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private hideKeyBindingOverlay(): void {
    if (this.keyBindingOverlay) {
      this.keyBindingOverlay.destroy();
      this.keyBindingOverlay = undefined;
    }
  }

  private createSmallButton(x: number, y: number, text: string, onClick: () => void): void {
    const btn = this.add.text(x, y, text, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
      backgroundColor: '#1a0a2e',
      padding: { x: 10, y: 5 },
    });
    btn.setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btn.setStyle({ color: '#00ffff', backgroundColor: '#2a1a4e' });
    });
    btn.on('pointerout', () => {
      btn.setStyle({ color: '#888888', backgroundColor: '#1a0a2e' });
    });
    btn.on('pointerdown', onClick);
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

// Get current sprite style setting
export function getSpriteStyle(): SpriteStyle {
  return getGameSettings().spriteStyle;
}
