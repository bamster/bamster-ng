import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import type { GameMode } from './MenuScene';

interface PlayerScore {
  playerId: string;
  score: number;
  isAlive: boolean;
}

interface GameOverData {
  mode: GameMode;
  scores: PlayerScore[];
  winner?: string;
}

// 80s color palette
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  neonGreen: 0x39ff14,
  darkPurple: 0x2a0a4a,
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { mode, scores, winner } = data;

    // Dark 80s background
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 0.95);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Add scanlines
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      graphics.fillStyle(0x000000, 0.15);
      graphics.fillRect(0, i, GAME_WIDTH, 2);
    }

    // Grid effect
    graphics.lineStyle(1, COLORS.neonPink, 0.1);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Game Over title with neon effect
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 4, 84, 'GAME OVER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 80, 'GAME OVER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ff0066',
      stroke: '#ff88aa',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Glowing effect
    const titleGlow = this.add.text(GAME_WIDTH / 2, 80, 'GAME OVER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ff0066',
    });
    titleGlow.setOrigin(0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Pulsing glow animation
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.5,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Winner announcement (for local multiplayer)
    let yPos = 160;
    if (mode === 'local' && winner) {
      const winnerNum = winner === 'player1' ? '1' : '2';
      const winnerText = this.add.text(
        GAME_WIDTH / 2,
        yPos,
        `★ PLAYER ${winnerNum} WINS! ★`,
        {
          fontSize: '28px',
          fontFamily: 'monospace',
          color: '#ffff00',
          stroke: '#ff8800',
          strokeThickness: 2,
        }
      );
      winnerText.setOrigin(0.5);

      // Flash effect
      this.tweens.add({
        targets: winnerText,
        alpha: 0.7,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      yPos += 60;
    }

    // Display scores
    yPos = mode === 'local' ? 230 : 180;

    scores.forEach((playerScore, index) => {
      const playerLabel = mode === 'local' ? `PLAYER ${index + 1}` : 'FINAL';
      const color = playerScore.isAlive ? '#39ff14' : '#ff4466';

      // Player label
      this.add.text(GAME_WIDTH / 2, yPos, playerLabel, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#888899',
      }).setOrigin(0.5);

      // Score with neon effect
      const scoreText = this.add.text(
        GAME_WIDTH / 2,
        yPos + 30,
        `${playerScore.score}`,
        {
          fontSize: '48px',
          fontFamily: 'monospace',
          color: color,
          stroke: '#000000',
          strokeThickness: 4,
        }
      );
      scoreText.setOrigin(0.5);

      yPos += 80;
    });

    // High score (single player)
    if (mode === 'single') {
      const highScore = this.getHighScore();
      const currentScore = scores[0]?.score || 0;

      if (currentScore > highScore) {
        this.setHighScore(currentScore);

        const newHighText = this.add.text(
          GAME_WIDTH / 2,
          yPos + 10,
          '★ NEW HIGH SCORE! ★',
          {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffff00',
            stroke: '#ff8800',
            strokeThickness: 2,
          }
        );
        newHighText.setOrigin(0.5);

        // Rainbow color cycling
        let colorIndex = 0;
        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#39ff14'];
        this.time.addEvent({
          delay: 200,
          callback: () => {
            colorIndex = (colorIndex + 1) % colors.length;
            newHighText.setColor(colors[colorIndex]);
          },
          loop: true,
        });

        this.tweens.add({
          targets: newHighText,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.add.text(GAME_WIDTH / 2, yPos + 10, `HIGH SCORE: ${highScore}`, {
          fontSize: '18px',
          fontFamily: 'monospace',
          color: '#666688',
        }).setOrigin(0.5);
      }
      yPos += 50;
    }

    // Buttons
    const buttonY = Math.max(yPos + 50, 420);

    this.createButton(GAME_WIDTH / 2, buttonY, '► PLAY AGAIN', () => {
      this.scene.start('GameScene', { mode });
    });

    this.createButton(GAME_WIDTH / 2, buttonY + 55, '► MAIN MENU', () => {
      this.scene.start('MenuScene');
    });

    // Press any key hint
    const hintText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 40,
      'PRESS SPACE TO PLAY AGAIN  •  ESC FOR MENU',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#444466',
      }
    );
    hintText.setOrigin(0.5);

    // Keyboard shortcuts
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('GameScene', { mode });
    });

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });

    // Fade in
    this.cameras.main.fadeIn(300);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 240, 42, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(240, 42);
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

  private getHighScore(): number {
    const stored = localStorage.getItem('bamster_highscore');
    return stored ? parseInt(stored, 10) : 0;
  }

  private setHighScore(score: number): void {
    localStorage.setItem('bamster_highscore', score.toString());
  }
}
