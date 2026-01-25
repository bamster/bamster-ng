import Phaser from 'phaser';
import { gameConfig } from './config/game.config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LobbyScene } from './scenes/LobbyScene';
import { SettingsScene } from './scenes/SettingsScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { TutorialScene } from './scenes/TutorialScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: [BootScene, MenuScene, LobbyScene, SettingsScene, AchievementsScene, TutorialScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
