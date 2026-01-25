import Phaser from 'phaser';
import { gameConfig } from './config/game.config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { SettingsScene } from './scenes/SettingsScene';
import { AudioSettingsScene } from './scenes/AudioSettingsScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { TutorialScene } from './scenes/TutorialScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { loadKeyBindings, keyEventToString } from './systems/KeyBindings';

const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, MenuScene, LobbyScene, SettingsScene, AudioSettingsScene, AchievementsScene, TutorialScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Screenshot functionality - configurable key (default: P)
function takeScreenshot(): void {
  game.renderer.snapshot((image) => {
    // Create download link
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `bamster-screenshot-${timestamp}.png`;
    link.href = (image as HTMLImageElement).src;
    link.click();
  });
}

// Global key handler for screenshots
window.addEventListener('keydown', (event) => {
  const bindings = loadKeyBindings();
  const pressedKey = keyEventToString(event);

  if (pressedKey === bindings.screenshot) {
    event.preventDefault();
    takeScreenshot();
  }
});
