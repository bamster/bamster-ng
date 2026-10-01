import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@bamster/shared';

export const RETRO_COLORS = {
  background: 0x070714,
  panel: 0x120824,
  panelHighlight: 0x241044,
  pink: 0xff00ff,
  cyan: 0x00ffff,
  yellow: 0xffff00,
  muted: 0x8888aa,
} as const;

export function drawRetroBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(RETRO_COLORS.background, 1);
  graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Deterministic star field keeps every menu visually related without flicker.
  for (let i = 0; i < 36; i++) {
    const x = (i * 137 + 53) % GAME_WIDTH;
    const y = (i * 71 + 29) % 340;
    const color = i % 3 === 0 ? RETRO_COLORS.pink : RETRO_COLORS.cyan;
    graphics.fillStyle(color, i % 5 === 0 ? 0.65 : 0.3);
    graphics.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }

  const horizonY = 350;
  graphics.fillStyle(RETRO_COLORS.pink, 0.04);
  graphics.fillRect(0, horizonY - 10, GAME_WIDTH, 20);
  graphics.lineStyle(2, RETRO_COLORS.pink, 0.35);
  graphics.lineBetween(0, horizonY, GAME_WIDTH, horizonY);
  graphics.lineStyle(1, RETRO_COLORS.cyan, 0.14);
  graphics.lineBetween(0, horizonY + 4, GAME_WIDTH, horizonY + 4);

  // Perspective grid gives the screens depth while remaining subtle behind text.
  graphics.lineStyle(1, RETRO_COLORS.pink, 0.12);
  for (let x = -200; x <= GAME_WIDTH + 200; x += 80) {
    graphics.lineBetween(GAME_WIDTH / 2, horizonY, x, GAME_HEIGHT);
  }
  [365, 385, 412, 450, 505, 575].forEach((y) => {
    graphics.lineBetween(0, y, GAME_WIDTH, y);
  });

  // CRT scanlines unify generated graphics and text with the pixel-art look.
  for (let y = 0; y < GAME_HEIGHT; y += 4) {
    graphics.fillStyle(0x000000, 0.11);
    graphics.fillRect(0, y, GAME_WIDTH, 2);
  }

  graphics.lineStyle(2, RETRO_COLORS.cyan, 0.35);
  graphics.lineBetween(18, 18, 54, 18);
  graphics.lineBetween(18, 18, 18, 54);
  graphics.lineStyle(2, RETRO_COLORS.pink, 0.35);
  graphics.lineBetween(GAME_WIDTH - 54, GAME_HEIGHT - 18, GAME_WIDTH - 18, GAME_HEIGHT - 18);
  graphics.lineBetween(GAME_WIDTH - 18, GAME_HEIGHT - 54, GAME_WIDTH - 18, GAME_HEIGHT - 18);

  return graphics;
}

export function createNeonTitle(
  scene: Phaser.Scene,
  text: string,
  y: number = 52,
  fontSize: number = 44,
  kicker: string = '// BAMSTER SYSTEM'
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const kickerText = scene.add.text(GAME_WIDTH / 2, y - 31, kicker, {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#00ffff',
    letterSpacing: 3,
  }).setOrigin(0.5).setAlpha(0.8);

  const shadow = scene.add.text(GAME_WIDTH / 2 + 4, y + 4, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Impact, Haettenschweiler, sans-serif',
    fontStyle: 'italic',
    color: '#ff1b9c',
  }).setOrigin(0.5);

  const glow = scene.add.text(GAME_WIDTH / 2, y, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Impact, Haettenschweiler, sans-serif',
    fontStyle: 'italic',
    color: '#00ffff',
    stroke: '#00ffff',
    strokeThickness: 7,
  }).setOrigin(0.5).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);

  const title = scene.add.text(GAME_WIDTH / 2, y, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Impact, Haettenschweiler, sans-serif',
    fontStyle: 'italic',
    color: '#fff3d6',
    stroke: '#12051f',
    strokeThickness: 3,
  }).setOrigin(0.5);

  const lineWidth = Math.min(130, Math.max(60, (GAME_WIDTH - title.width) / 2 - 55));
  const leftLine = scene.add.rectangle(GAME_WIDTH / 2 - title.width / 2 - lineWidth / 2 - 24, y, lineWidth, 2, RETRO_COLORS.cyan, 0.6);
  const rightLine = scene.add.rectangle(GAME_WIDTH / 2 + title.width / 2 + lineWidth / 2 + 24, y, lineWidth, 2, RETRO_COLORS.cyan, 0.6);

  container.add([kickerText, shadow, glow, title, leftLine, rightLine]);
  return container;
}

export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = RETRO_COLORS.cyan
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(RETRO_COLORS.panel, 0.86);
  panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
  panel.lineStyle(1, color, 0.6);
  panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

  const corner = 12;
  panel.lineStyle(3, color, 0.95);
  panel.lineBetween(x - width / 2, y - height / 2 + corner, x - width / 2, y - height / 2);
  panel.lineBetween(x - width / 2, y - height / 2, x - width / 2 + corner, y - height / 2);
  panel.lineBetween(x + width / 2 - corner, y + height / 2, x + width / 2, y + height / 2);
  panel.lineBetween(x + width / 2, y + height / 2 - corner, x + width / 2, y + height / 2);
  return panel;
}

interface RetroButtonOptions {
  width?: number;
  height?: number;
  subtitle?: string;
  fontSize?: number;
  accent?: number;
}

export function createRetroButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  options: RetroButtonOptions = {}
): Phaser.GameObjects.Container {
  const width = options.width ?? 280;
  const height = options.height ?? (options.subtitle ? 60 : 46);
  const accent = options.accent ?? RETRO_COLORS.pink;
  const container = scene.add.container(x, y);
  const chamfer = 10;
  const points = [
    chamfer, 0,
    width - chamfer, 0,
    width, chamfer,
    width, height,
    chamfer, height,
    0, height - chamfer,
    0, 0,
  ];

  const shadow = scene.add.polygon(6, 6, points, RETRO_COLORS.pink, 0.42);
  const background = scene.add.polygon(0, 0, points, RETRO_COLORS.panel, 0.96);
  background.setStrokeStyle(2, accent, 0.95);

  const badgeMatch = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  const labelText = badgeMatch?.[2] ?? text;
  const hasBadge = badgeMatch !== null;
  const label = scene.add.text(hasBadge ? 15 : 0, options.subtitle ? -9 : 0, labelText, {
    fontSize: `${options.fontSize ?? 18}px`,
    fontFamily: 'monospace',
    fontStyle: 'bold',
    color: '#fff8e8',
  }).setOrigin(0.5);

  container.add([shadow, background, label]);

  if (hasBadge && badgeMatch) {
    const badgeX = -width / 2 + 34;
    const badge = scene.add.rectangle(badgeX, 0, 42, 28, 0x160b2a, 1);
    badge.setStrokeStyle(1, RETRO_COLORS.yellow, 1);
    const badgeText = scene.add.text(badgeX, 0, badgeMatch[1], {
      fontSize: '11px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffff00',
    }).setOrigin(0.5);
    container.add([badge, badgeText]);
  }

  if (options.subtitle) {
    const subtitle = scene.add.text(hasBadge ? 15 : 0, 13, options.subtitle, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#a7a0b8',
    }).setOrigin(0.5);
    container.add(subtitle);
  }

  const accentBar = scene.add.rectangle(-width / 2 + 3, 0, 5, height - 14, RETRO_COLORS.cyan, 0.9);
  container.add(accentBar);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    scene.tweens.killTweensOf(container);
    background.setFillStyle(RETRO_COLORS.cyan, 0.95);
    background.setStrokeStyle(2, 0xffffff, 1);
    label.setColor('#080713');
    accentBar.setFillStyle(RETRO_COLORS.yellow, 1);
    scene.tweens.add({ targets: container, x: x - 4, scaleX: 1.02, scaleY: 1.02, duration: 90 });
  });

  container.on('pointerout', () => {
    scene.tweens.killTweensOf(container);
    background.setFillStyle(RETRO_COLORS.panel, 0.96);
    background.setStrokeStyle(2, accent, 0.95);
    label.setColor('#fff8e8');
    accentBar.setFillStyle(RETRO_COLORS.cyan, 0.9);
    scene.tweens.add({ targets: container, x, scaleX: 1, scaleY: 1, duration: 90 });
  });

  container.on('pointerdown', () => {
    container.setScale(0.98);
    onClick();
  });

  return container;
}
