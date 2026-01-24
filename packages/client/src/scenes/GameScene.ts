import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BLOCK_SIZE, PLAY_AREA_WIDTH, FRAME_WIDTH } from '@bamster/shared';
import type { GameMode } from './MenuScene';
import { Bamster } from '../entities/Bamster';
import { Block } from '../entities/Block';
import { Laser } from '../entities/Laser';
import { PowerUp } from '../entities/PowerUp';
import { BlockSpawner } from '../systems/BlockSpawner';
import { InputManager } from '../systems/InputManager';

// 80s color palette
const COLORS = {
  background: 0x0a0a1a,
  frameDark: 0x1a0a2e,
  frameLight: 0x3d1a5c,
  frameNeon: 0xff00ff,
  panelBg: 0x120824,
  textNeon: 0x00ffff,
  textPink: 0xff00ff,
  textYellow: 0xffff00,
  ground: 0x2a1a3e,
};

interface GameSceneData {
  mode: GameMode;
}

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'single';
  private inputManager!: InputManager;
  private blockSpawner!: BlockSpawner;

  // Game objects
  private players: Bamster[] = [];
  private blockGroup!: Phaser.Physics.Arcade.Group;
  private laserGroup!: Phaser.Physics.Arcade.Group;
  private powerUpGroup!: Phaser.Physics.Arcade.Group;

  // Ground
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  // UI
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private healthTexts: Phaser.GameObjects.Text[] = [];

  // Game state
  private isGameOver: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.mode = data.mode || 'single';
    this.isGameOver = false;
    this.players = [];
    this.scoreTexts = [];
    this.healthTexts = [];
  }

  create(): void {
    // Draw retro background and frame
    this.createRetroFrame();

    // Create physics groups
    this.blockGroup = this.physics.add.group();
    this.laserGroup = this.physics.add.group({
      allowGravity: false,
    });
    this.powerUpGroup = this.physics.add.group({
      allowGravity: false,
    });

    // Create ground (platform at bottom of play area)
    this.ground = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(
      PLAY_AREA_WIDTH / 2,
      GAME_HEIGHT - BLOCK_SIZE / 2,
      PLAY_AREA_WIDTH,
      BLOCK_SIZE,
      COLORS.ground
    );
    this.physics.add.existing(groundRect, true);
    this.ground.add(groundRect);

    // Create input manager
    this.inputManager = new InputManager(this);

    // Create block spawner
    this.blockSpawner = new BlockSpawner(
      this,
      this.blockGroup,
      this.powerUpGroup
    );

    // Create players based on mode (they'll stand on the ground)
    this.createPlayers();

    // Setup collisions
    this.setupCollisions();

    // Create UI (now in side panel)
    this.createUI();

    // Start spawning blocks
    this.blockSpawner.start();
  }

  private createRetroFrame(): void {
    const graphics = this.add.graphics();

    // Dark background
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Play area background (slightly lighter)
    graphics.fillStyle(0x0f0f2a, 1);
    graphics.fillRect(FRAME_WIDTH, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH * 2, GAME_HEIGHT - FRAME_WIDTH * 2);

    // Side panel background
    graphics.fillStyle(COLORS.panelBg, 1);
    graphics.fillRect(PLAY_AREA_WIDTH, 0, GAME_WIDTH - PLAY_AREA_WIDTH, GAME_HEIGHT);

    // Outer frame - neon glow effect
    graphics.lineStyle(FRAME_WIDTH, COLORS.frameNeon, 0.8);
    graphics.strokeRect(2, 2, PLAY_AREA_WIDTH - 4, GAME_HEIGHT - 4);

    // Inner frame highlight
    graphics.lineStyle(2, COLORS.frameLight, 1);
    graphics.strokeRect(FRAME_WIDTH + 2, FRAME_WIDTH + 2, PLAY_AREA_WIDTH - FRAME_WIDTH * 2 - 4, GAME_HEIGHT - FRAME_WIDTH * 2 - 4);

    // Panel divider with neon line
    graphics.lineStyle(3, COLORS.frameNeon, 0.6);
    graphics.lineBetween(PLAY_AREA_WIDTH, 0, PLAY_AREA_WIDTH, GAME_HEIGHT);

    // Decorative corner accents
    const cornerSize = 20;
    graphics.lineStyle(2, COLORS.textNeon, 1);
    // Top-left
    graphics.lineBetween(FRAME_WIDTH, FRAME_WIDTH + cornerSize, FRAME_WIDTH, FRAME_WIDTH);
    graphics.lineBetween(FRAME_WIDTH, FRAME_WIDTH, FRAME_WIDTH + cornerSize, FRAME_WIDTH);
    // Top-right of play area
    graphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH - cornerSize, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH);
    graphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH + cornerSize);
    // Bottom-left
    graphics.lineBetween(FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH - cornerSize, FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);
    graphics.lineBetween(FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH, FRAME_WIDTH + cornerSize, GAME_HEIGHT - FRAME_WIDTH);
    // Bottom-right of play area
    graphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH - cornerSize, GAME_HEIGHT - FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);
    graphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH - cornerSize, PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);

    // Panel title
    const titleText = this.add.text(PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2, 30, 'BAMSTER', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 2,
    });
    titleText.setOrigin(0.5);

    // Decorative line under title
    graphics.lineStyle(2, COLORS.textNeon, 0.8);
    graphics.lineBetween(PLAY_AREA_WIDTH + 20, 55, GAME_WIDTH - 20, 55);
  }

  private createPlayers(): void {
    // Player 1 - position within play area
    const player1 = new Bamster(
      this,
      PLAY_AREA_WIDTH / 4,
      GAME_HEIGHT - 100,
      'player1',
      this.laserGroup
    );
    this.players.push(player1);

    // Player 2 for local multiplayer
    if (this.mode === 'local') {
      const player2 = new Bamster(
        this,
        (PLAY_AREA_WIDTH * 3) / 4,
        GAME_HEIGHT - 100,
        'player2',
        this.laserGroup
      );
      player2.setTint(0xaaaaff); // Slightly different color
      this.players.push(player2);
    }
  }

  private setupCollisions(): void {
    // Players stand on resting blocks
    this.physics.add.collider(
      this.players,
      this.blockGroup,
      (playerObj, blockObj) => this.handlePlayerBlockCollision(playerObj as Bamster, blockObj as Block),
      (playerObj, blockObj) => this.shouldPlayerBlockCollide(playerObj as Bamster, blockObj as Block),
      this
    );

    // Players stand on ground
    this.physics.add.collider(this.players, this.ground);

    // Blocks land on ground
    this.physics.add.collider(
      this.blockGroup,
      this.ground,
      (blockObj) => this.handleBlockGroundCollision(blockObj as Block),
      undefined,
      this
    );

    // Blocks stack on each other
    this.physics.add.collider(
      this.blockGroup,
      this.blockGroup,
      (block1Obj, block2Obj) => this.handleBlockBlockCollision(block1Obj as Block, block2Obj as Block),
      (block1Obj, block2Obj) => this.shouldBlocksCollide(block1Obj as Block, block2Obj as Block),
      this
    );

    // Lasers hit blocks
    this.physics.add.overlap(
      this.laserGroup,
      this.blockGroup,
      (laserObj, blockObj) => this.handleLaserBlockCollision(laserObj as Laser, blockObj as Block),
      undefined,
      this
    );

    // Players collect power-ups
    this.physics.add.overlap(
      this.players,
      this.powerUpGroup,
      (playerObj, powerUpObj) => this.handlePlayerPowerUpCollision(playerObj as Bamster, powerUpObj as PowerUp),
      undefined,
      this
    );

    // Falling blocks hurt players
    this.physics.add.overlap(
      this.players,
      this.blockGroup,
      (playerObj, blockObj) => this.handleFallingBlockHit(playerObj as Bamster, blockObj as Block),
      (playerObj, blockObj) => this.shouldFallingBlockHurt(playerObj as Bamster, blockObj as Block),
      this
    );
  }

  private shouldPlayerBlockCollide(_player: Bamster, block: Block): boolean {
    // Only stand on resting blocks - falling blocks pass through (and hurt!)
    return block.isResting;
  }

  private handlePlayerBlockCollision(_player: Bamster, _block: Block): void {
    // Collision is handled - player can stand on block
    // Damage from falling blocks is handled separately via overlap
  }

  private shouldFallingBlockHurt(player: Bamster, block: Block): boolean {
    // Only falling (non-resting) blocks can hurt
    if (block.isResting) return false;

    // Only hurt if block is above the player (hitting from top)
    // Block must be mostly above the player's head
    const playerTop = player.y - 20;
    const blockBottom = block.y + BLOCK_SIZE / 2;

    return blockBottom < playerTop + 15; // Block is above player
  }

  private handleFallingBlockHit(player: Bamster, block: Block): void {
    if (!player.isAlive || block.isResting) return;

    // Double-check block is above player
    const playerTop = player.y - 20;
    const blockBottom = block.y + BLOCK_SIZE / 2;
    if (blockBottom >= playerTop + 15) return; // Not from above

    const died = player.takeDamage();
    if (died) {
      this.checkGameOver();
    }
  }

  private handleBlockGroundCollision(block: Block): void {
    this.blockSpawner.landBlockOnGround(block);
  }

  private shouldBlocksCollide(block1: Block, block2: Block): boolean {
    // Only collide if one is resting and the other is falling
    if (block1.isResting === block2.isResting) return false;

    const fallingBlock = block1.isResting ? block2 : block1;
    const restingBlock = block1.isResting ? block1 : block2;

    // Only collide if falling block is above and moving down onto resting block
    // Check they're in the same column (within tolerance)
    const dx = Math.abs(fallingBlock.x - restingBlock.x);
    if (dx > BLOCK_SIZE * 0.8) return false;

    // Falling block must be above the resting block
    return fallingBlock.y < restingBlock.y;
  }

  private handleBlockBlockCollision(block1: Block, block2: Block): void {
    const fallingBlock = block1.isResting ? block2 : block1;
    const restingBlock = block1.isResting ? block1 : block2;

    // Prevent double-processing
    if (fallingBlock.isResting) return;

    this.blockSpawner.checkBlockLanding(fallingBlock, restingBlock);
  }

  private handleLaserBlockCollision(laser: Laser, block: Block): void {
    if (!laser.hitBlock(block.blockId)) {
      return; // Already hit this block
    }

    // Find the player who shot this laser
    const shooter = this.players.find((p) => p.playerId === laser.ownerId);

    // Damage the cluster (merged blocks share HP)
    const clusterDestroyed = this.blockSpawner.damageCluster(block.clusterId);

    if (clusterDestroyed) {
      // Destroy entire cluster
      const { score } = this.blockSpawner.destroyCluster(block.clusterId);

      // Award points with combo bonus
      if (shooter) {
        shooter.addScore(score);
        this.showScorePopup(block.x, block.y, score);
      }
    } else {
      // Cluster took damage but isn't destroyed yet
      // Show small hit indicator
      this.showHitPopup(block.x, block.y);
    }
  }

  private showHitPopup(x: number, y: number): void {
    const text = this.add.text(x, y - 10, '★', {
      fontSize: '16px',
      color: '#ffff00',
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 300,
      onComplete: () => text.destroy(),
    });
  }

  private handlePlayerPowerUpCollision(player: Bamster, powerUp: PowerUp): void {
    // Apply power-up effect
    switch (powerUp.powerUpType) {
      case 'corn':
        player.collectCorn();
        break;
      case 'sneakers':
        player.collectSneakers();
        break;
      case 'rapid':
      case 'spread':
      case 'piercing':
        player.collectWeapon(powerUp.powerUpType);
        break;
    }

    // Show pickup text
    this.showPowerUpText(powerUp.x, powerUp.y, powerUp.powerUpType);

    // Remove power-up
    powerUp.collect();
  }

  private showScorePopup(x: number, y: number, score: number): void {
    const text = this.add.text(x, y, `+${score}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showPowerUpText(x: number, y: number, type: string): void {
    const names: Record<string, string> = {
      corn: 'HEALTH+',
      sneakers: 'JUMP BOOST!',
      rapid: 'RAPID FIRE!',
      spread: 'SPREAD SHOT!',
      piercing: 'PIERCING!',
    };

    const text = this.add.text(x, y, names[type] || type, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private createUI(): void {
    const panelX = PLAY_AREA_WIDTH + 20;
    const panelCenterX = PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2;

    // Player 1 UI in side panel
    this.add.text(panelCenterX, 80, 'PLAYER 1', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.scoreTexts.push(
      this.add.text(panelX, 105, 'SCORE: 0', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
      })
    );
    this.healthTexts.push(
      this.add.text(panelX, 135, 'HEALTH: 1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff4444',
      })
    );

    // Player 2 UI for local multiplayer
    if (this.mode === 'local') {
      // Divider
      const graphics = this.add.graphics();
      graphics.lineStyle(1, COLORS.textNeon, 0.5);
      graphics.lineBetween(PLAY_AREA_WIDTH + 20, 180, GAME_WIDTH - 20, 180);

      this.add.text(panelCenterX, 200, 'PLAYER 2', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff88ff',
      }).setOrigin(0.5);

      this.scoreTexts.push(
        this.add.text(panelX, 225, 'SCORE: 0', {
          fontSize: '20px',
          fontFamily: 'monospace',
          color: '#ffff00',
        })
      );
      this.healthTexts.push(
        this.add.text(panelX, 255, 'HEALTH: 1', {
          fontSize: '16px',
          fontFamily: 'monospace',
          color: '#ff4444',
        })
      );
    }

    // Controls hint at bottom of panel
    const controlsY = GAME_HEIGHT - 120;
    this.add.text(panelCenterX, controlsY, 'CONTROLS', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);
    this.add.text(panelCenterX, controlsY + 20, '← → MOVE', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);
    this.add.text(panelCenterX, controlsY + 35, '↑ / W JUMP', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);
    this.add.text(panelCenterX, controlsY + 50, 'SPACE SHOOT', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private updateUI(): void {
    this.players.forEach((player, index) => {
      if (this.scoreTexts[index]) {
        this.scoreTexts[index].setText(`SCORE: ${player.score}`);
      }
      if (this.healthTexts[index]) {
        this.healthTexts[index].setText(`HEALTH: ${player.health}`);
      }
    });
  }

  private checkGameOver(): void {
    const alivePlayers = this.players.filter((p) => p.isAlive);

    if (alivePlayers.length === 0) {
      this.gameOver();
    } else if (this.mode === 'local' && alivePlayers.length === 1) {
      // In local multiplayer, game ends when one player remains
      this.gameOver(alivePlayers[0]);
    }
  }

  private gameOver(winner?: Bamster): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.blockSpawner.stop();

    // Determine final scores
    const scores = this.players.map((p) => ({
      playerId: p.playerId,
      score: p.score,
      isAlive: p.isAlive,
    }));

    this.scene.start('GameOverScene', {
      mode: this.mode,
      scores,
      winner: winner?.playerId,
    });
  }

  private checkCrushed(): void {
    // Check if any player is crushed by blocks stacking too high
    this.players.forEach((player) => {
      if (!player.isAlive) return;

      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      if (!playerBody.blocked.down && !playerBody.touching.down) return;

      // Check if there's a block directly above the player
      const blocksAbove = this.blockGroup.children.getArray().filter((b) => {
        const block = b as Block;
        if (!block.isResting) return false;

        const dx = Math.abs(block.x - player.x);
        const dy = player.y - block.y;

        return dx < BLOCK_SIZE && dy > 0 && dy < BLOCK_SIZE * 1.5;
      });

      if (blocksAbove.length > 0) {
        // Player is being crushed
        const died = player.takeDamage();
        if (died) {
          this.checkGameOver();
        }
      }
    });
  }

  update(): void {
    if (this.isGameOver) return;

    // Handle input for each player
    this.handlePlayerInput();

    // Update players
    this.players.forEach((player) => player.update());

    // Update lasers
    this.laserGroup.children.each((laser) => {
      (laser as Laser).update();
      return true;
    });

    // Update power-ups
    this.powerUpGroup.children.each((powerUp) => {
      (powerUp as PowerUp).update();
      return true;
    });

    // Update blocks (for HP indicators)
    this.blockGroup.children.each((block) => {
      (block as Block).update();
      return true;
    });

    // Check for crushed players
    this.checkCrushed();

    // Check if players fell off
    this.players.forEach((player) => {
      if (!player.isAlive) {
        this.checkGameOver();
      }
    });

    // Update UI
    this.updateUI();
  }

  private handlePlayerInput(): void {
    // Player 1
    const player1 = this.players[0];
    if (player1 && player1.isAlive) {
      const input1 = this.inputManager.getPlayer1Input();

      if (input1.left) {
        player1.moveLeft();
      } else if (input1.right) {
        player1.moveRight();
      } else {
        player1.stopMoving();
      }

      if (input1.jump) {
        player1.jump();
      }

      if (input1.shoot) {
        player1.shoot();
      }
    }

    // Player 2 (local multiplayer only)
    if (this.mode === 'local') {
      const player2 = this.players[1];
      if (player2 && player2.isAlive) {
        const input2 = this.inputManager.getPlayer2Input();

        if (input2.left) {
          player2.moveLeft();
        } else if (input2.right) {
          player2.moveRight();
        } else {
          player2.stopMoving();
        }

        if (input2.jump) {
          player2.jump();
        }

        if (input2.shoot) {
          player2.shoot();
        }
      }
    }
  }
}
