import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from '@bamster/shared';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Min/max ensures game doesn't get too small or pixelated
    min: {
      width: GAME_WIDTH / 2,
      height: GAME_HEIGHT / 2,
    },
    max: {
      width: GAME_WIDTH * 2,
      height: GAME_HEIGHT * 2,
    },
  },
  pixelArt: true,
  // Enable touch input for mobile
  input: {
    activePointers: 3, // Support multi-touch
    touch: {
      target: undefined, // Use parent element
      capture: true,
    },
  },
  // Audio settings
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  // Performance optimizations
  render: {
    antialias: false, // Better for pixel art
    pixelArt: true,
    roundPixels: true, // Prevent sub-pixel rendering artifacts
  },
};
