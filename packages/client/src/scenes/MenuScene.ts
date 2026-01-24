import Phaser from 'phaser';
import { GAME_WIDTH } from '@bamster/shared';

export type GameMode = 'single' | 'local' | 'online';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Title
    const title = this.add.text(GAME_WIDTH / 2, 100, 'BAMster', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 8,
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(GAME_WIDTH / 2, 160, 'Hamster vs Blocks!', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    subtitle.setOrigin(0.5);

    // BAMster preview
    const bamster = this.add.image(GAME_WIDTH / 2, 250, 'bamster');
    bamster.setScale(3);

    // Menu buttons
    this.createButton(GAME_WIDTH / 2, 360, 'Single Player', () => {
      this.startGame('single');
    });

    this.createButton(GAME_WIDTH / 2, 420, 'Local Multiplayer', () => {
      this.startGame('local');
    });

    this.createButton(GAME_WIDTH / 2, 480, 'Online Play', () => {
      this.startGame('online');
    });

    // Controls help
    const controlsText = [
      'Controls:',
      'Arrow Keys / WASD: Move',
      'Space / Up: Jump',
      'Z / Left Click: Shoot',
    ].join('\n');

    const controls = this.add.text(GAME_WIDTH / 2, 560, controlsText, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
      align: 'center',
    });
    controls.setOrigin(0.5);

    // Animate title
    this.tweens.add({
      targets: title,
      y: 110,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 240, 45, 0x4444aa);
    bg.setStrokeStyle(3, 0x6666cc);

    const label = this.add.text(0, 0, text, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(240, 45);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0x6666cc);
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    container.on('pointerout', () => {
      bg.setFillStyle(0x4444aa);
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

  private startGame(mode: GameMode): void {
    this.scene.start('GameScene', { mode });
  }
}
