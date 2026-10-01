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
    fontFamily: 'monospace',
    color: '#330033',
  }).setOrigin(0.5);

  const glow = scene.add.text(GAME_WIDTH / 2, y, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'monospace',
    color: '#ff00ff',
    stroke: '#ff00ff',
    strokeThickness: 8,
  }).setOrigin(0.5).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);

  const title = scene.add.text(GAME_WIDTH / 2, y, text, {
    fontSize: `${fontSize}px`,
    fontFamily: 'monospace',
    color: '#ff66ff',
    stroke: '#ff00ff',
    strokeThickness: 2,
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
