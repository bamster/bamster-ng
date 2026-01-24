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

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { mode, scores, winner } = data;

    // Semi-transparent overlay
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.7
    );

    // Game Over title
    const title = this.add.text(GAME_WIDTH / 2, 100, 'GAME OVER', {
      fontSize: '56px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 8,
    });
    title.setOrigin(0.5);

    // Winner announcement (for local multiplayer)
    if (mode === 'local' && winner) {
      const winnerNum = winner === 'player1' ? '1' : '2';
      const winnerText = this.add.text(
        GAME_WIDTH / 2,
        170,
        `Player ${winnerNum} Wins!`,
        {
          fontSize: '32px',
          fontFamily: 'Arial',
          color: '#ffdd44',
          stroke: '#000000',
          strokeThickness: 4,
        }
      );
      winnerText.setOrigin(0.5);
    }

    // Display scores
    let yPos = mode === 'local' ? 230 : 200;

    scores.forEach((playerScore, index) => {
      const playerLabel = mode === 'local' ? `Player ${index + 1}` : 'Final';
      const color = playerScore.isAlive ? '#44ff44' : '#ff4444';

      const scoreText = this.add.text(
        GAME_WIDTH / 2,
        yPos,
        `${playerLabel} Score: ${playerScore.score}`,
        {
          fontSize: '28px',
          fontFamily: 'Arial',
          color: color,
          stroke: '#000000',
          strokeThickness: 3,
        }
      );
      scoreText.setOrigin(0.5);
      yPos += 50;
    });

    // High score (single player)
    if (mode === 'single') {
      const highScore = this.getHighScore();
      const currentScore = scores[0]?.score || 0;

      if (currentScore > highScore) {
        this.setHighScore(currentScore);
        const newHighText = this.add.text(
          GAME_WIDTH / 2,
          yPos + 20,
          'NEW HIGH SCORE!',
          {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3,
          }
        );
        newHighText.setOrigin(0.5);

        // Animate the new high score text
        this.tweens.add({
          targets: newHighText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      } else {
        const highScoreText = this.add.text(
          GAME_WIDTH / 2,
          yPos + 20,
          `High Score: ${highScore}`,
          {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
          }
        );
        highScoreText.setOrigin(0.5);
      }
      yPos += 60;
    }

    // Buttons
    const buttonY = Math.max(yPos + 40, 400);

    this.createButton(GAME_WIDTH / 2, buttonY, 'Play Again', () => {
      this.scene.start('GameScene', { mode });
    });

    this.createButton(GAME_WIDTH / 2, buttonY + 60, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });

    // Press any key hint
    const hintText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 40,
      'Press SPACE to play again',
      {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#888888',
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

    const bg = this.add.rectangle(0, 0, 200, 40, 0x4444aa);
    bg.setStrokeStyle(3, 0x6666cc);

    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(200, 40);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0x6666cc);
    });

    container.on('pointerout', () => {
      bg.setFillStyle(0x4444aa);
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
