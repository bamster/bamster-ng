import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BLOCK_SIZE, PLAY_AREA_WIDTH, FRAME_WIDTH } from '@bamster/shared';
import type { GameMode } from './MenuScene';
import { Bamster } from '../entities/Bamster';
import { Block } from '../entities/Block';
import { Laser } from '../entities/Laser';
import { PowerUp } from '../entities/PowerUp';
import { BlockSpawner } from '../systems/BlockSpawner';
import { InputManager } from '../systems/InputManager';
import {
  NetworkManager,
  type NetworkState,
  type PlayerNetState,
  type BlockNetState,
} from '../systems/NetworkManager';
import { getSound } from '../systems/SoundManager';

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
  private highScore: number = 0;

  // Game state
  private isGameOver: boolean = false;
  private isPaused: boolean = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  // Online multiplayer
  private networkManager?: NetworkManager;
  private localPlayerId?: string;
  private networkState?: NetworkState;
  private isWaitingForPlayers: boolean = false;
  private connectionOverlay?: Phaser.GameObjects.Container;

  // Network entity maps (for syncing server state to visual objects)
  private networkPlayers: Map<string, Phaser.GameObjects.Container> = new Map();
  private networkBlocks: Map<string, Phaser.GameObjects.Container> = new Map();
  private networkLasers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private networkPowerUps: Map<string, Phaser.GameObjects.Sprite> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.mode = data.mode || 'single';
    this.isGameOver = false;
    this.isPaused = false;
    this.players = [];
    this.scoreTexts = [];
    this.healthTexts = [];
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('bamster_highscore');
    this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;

    // Reset network state
    this.networkManager = undefined;
    this.localPlayerId = undefined;
    this.networkState = undefined;
    this.isWaitingForPlayers = false;
    this.connectionOverlay = undefined;
    this.networkPlayers = new Map();
    this.networkBlocks = new Map();
    this.networkLasers = new Map();
    this.networkPowerUps = new Map();
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

    // Handle online mode differently
    if (this.mode === 'online') {
      this.setupOnlineMode();
      return;
    }

    // Create block spawner (local modes only)
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

    // Setup pause key
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
  }

  private togglePause(): void {
    if (this.isGameOver) return;

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  private pauseGame(): void {
    this.isPaused = true;
    this.physics.pause();
    this.blockSpawner.stop();

    // Create pause overlay
    this.pauseOverlay = this.add.container(0, 0);
    this.pauseOverlay.setDepth(100);

    // Dark overlay
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.7
    );
    this.pauseOverlay.add(overlay);

    // Scanlines effect
    const graphics = this.add.graphics();
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      graphics.fillStyle(0x000000, 0.1);
      graphics.fillRect(0, i, GAME_WIDTH, 2);
    }
    this.pauseOverlay.add(graphics);

    // Pause title
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 153, 'PAUSED', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#220022',
    });
    titleShadow.setOrigin(0.5);
    this.pauseOverlay.add(titleShadow);

    const title = this.add.text(GAME_WIDTH / 2, 150, 'PAUSED', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);
    this.pauseOverlay.add(title);

    // Pulsing animation
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Resume button
    this.createPauseButton(GAME_WIDTH / 2, 280, '► RESUME', () => this.resumeGame());

    // Restart button
    this.createPauseButton(GAME_WIDTH / 2, 340, '► RESTART', () => {
      this.scene.restart({ mode: this.mode });
    });

    // Quit button
    this.createPauseButton(GAME_WIDTH / 2, 400, '► QUIT TO MENU', () => {
      this.scene.start('MenuScene');
    });

    // Hint text
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'PRESS ESC OR P TO RESUME', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    });
    hint.setOrigin(0.5);
    this.pauseOverlay.add(hint);
  }

  private createPauseButton(x: number, y: number, text: string, onClick: () => void): void {
    if (!this.pauseOverlay) return;

    const bg = this.add.rectangle(x, y, 240, 42, COLORS.panelBg);
    bg.setStrokeStyle(2, COLORS.frameNeon);
    this.pauseOverlay.add(bg);

    const label = this.add.text(x, y, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);
    this.pauseOverlay.add(label);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a1a6a);
      bg.setStrokeStyle(3, COLORS.textNeon);
      label.setColor('#00ffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(COLORS.panelBg);
      bg.setStrokeStyle(2, COLORS.frameNeon);
      label.setColor('#ffffff');
    });

    bg.on('pointerdown', onClick);
  }

  private resumeGame(): void {
    this.isPaused = false;
    this.physics.resume();
    this.blockSpawner.start();

    // Remove pause overlay
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = undefined;
    }
  }

  private createRetroFrame(): void {
    // Background graphics (low depth, behind everything)
    const bgGraphics = this.add.graphics();
    bgGraphics.setDepth(-10);

    // Dark background
    bgGraphics.fillStyle(COLORS.background, 1);
    bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Play area background (slightly lighter)
    bgGraphics.fillStyle(0x0f0f2a, 1);
    bgGraphics.fillRect(FRAME_WIDTH, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH * 2, GAME_HEIGHT - FRAME_WIDTH * 2);

    // Side panel background
    bgGraphics.fillStyle(COLORS.panelBg, 1);
    bgGraphics.fillRect(PLAY_AREA_WIDTH, 0, GAME_WIDTH - PLAY_AREA_WIDTH, GAME_HEIGHT);

    // Frame graphics (high depth, on top of ground and other elements)
    const frameGraphics = this.add.graphics();
    frameGraphics.setDepth(100);

    // Outer frame - neon glow effect
    frameGraphics.lineStyle(FRAME_WIDTH, COLORS.frameNeon, 0.8);
    frameGraphics.strokeRect(2, 2, PLAY_AREA_WIDTH - 4, GAME_HEIGHT - 4);

    // Inner frame highlight
    frameGraphics.lineStyle(2, COLORS.frameLight, 1);
    frameGraphics.strokeRect(FRAME_WIDTH + 2, FRAME_WIDTH + 2, PLAY_AREA_WIDTH - FRAME_WIDTH * 2 - 4, GAME_HEIGHT - FRAME_WIDTH * 2 - 4);

    // Panel divider with neon line
    frameGraphics.lineStyle(3, COLORS.frameNeon, 0.6);
    frameGraphics.lineBetween(PLAY_AREA_WIDTH, 0, PLAY_AREA_WIDTH, GAME_HEIGHT);

    // Decorative corner accents
    const cornerSize = 20;
    frameGraphics.lineStyle(2, COLORS.textNeon, 1);
    // Top-left
    frameGraphics.lineBetween(FRAME_WIDTH, FRAME_WIDTH + cornerSize, FRAME_WIDTH, FRAME_WIDTH);
    frameGraphics.lineBetween(FRAME_WIDTH, FRAME_WIDTH, FRAME_WIDTH + cornerSize, FRAME_WIDTH);
    // Top-right of play area
    frameGraphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH - cornerSize, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH);
    frameGraphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, FRAME_WIDTH + cornerSize);
    // Bottom-left
    frameGraphics.lineBetween(FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH - cornerSize, FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);
    frameGraphics.lineBetween(FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH, FRAME_WIDTH + cornerSize, GAME_HEIGHT - FRAME_WIDTH);
    // Bottom-right of play area
    frameGraphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH - cornerSize, GAME_HEIGHT - FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);
    frameGraphics.lineBetween(PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH - cornerSize, PLAY_AREA_WIDTH - FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH);

    // Panel title
    const titleText = this.add.text(PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2, 30, 'BAMSTER', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 2,
    });
    titleText.setOrigin(0.5);

    // Decorative line under title (use bgGraphics for panel decorations, they're behind UI elements)
    bgGraphics.lineStyle(2, COLORS.textNeon, 0.8);
    bgGraphics.lineBetween(PLAY_AREA_WIDTH + 20, 55, GAME_WIDTH - 20, 55);
  }

  // ============================================
  // Online Multiplayer Methods
  // ============================================

  private setupOnlineMode(): void {
    this.showConnectionOverlay('CONNECTING...');

    // Create network manager and connect
    this.networkManager = new NetworkManager();

    this.networkManager.setOnConnected((playerId) => {
      this.localPlayerId = playerId;
      this.isWaitingForPlayers = true;
      this.updateConnectionOverlay('WAITING FOR OPPONENT...');

      // Send ready signal
      this.networkManager?.sendReady();
    });

    this.networkManager.setOnStateChange((state) => {
      this.networkState = state;

      // Check if game has started (2 players and running)
      if (state.isRunning && this.isWaitingForPlayers) {
        this.isWaitingForPlayers = false;
        this.hideConnectionOverlay();
        this.createOnlineUI();
      }

      // Check for game over
      if (state.isGameOver && !this.isGameOver) {
        this.handleOnlineGameOver(state.winnerId);
      }
    });

    this.networkManager.setOnDisconnected(() => {
      if (!this.isGameOver) {
        this.showConnectionOverlay('DISCONNECTED');
        this.time.delayedCall(2000, () => {
          this.scene.start('MenuScene');
        });
      }
    });

    this.networkManager.setOnError((error) => {
      console.error('Network error:', error);
      this.showConnectionOverlay('CONNECTION FAILED');
      this.time.delayedCall(2000, () => {
        this.scene.start('MenuScene');
      });
    });

    // Start connection
    this.networkManager.quickMatch().catch((error) => {
      console.error('Failed to connect:', error);
    });

    // Setup pause/quit key for online mode
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isGameOver) {
        this.networkManager?.disconnect();
        this.scene.start('MenuScene');
      }
    });
  }

  private showConnectionOverlay(message: string): void {
    if (this.connectionOverlay) {
      this.connectionOverlay.destroy(true);
    }

    this.connectionOverlay = this.add.container(0, 0);
    this.connectionOverlay.setDepth(200);

    // Semi-transparent background
    const bg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.8
    );
    this.connectionOverlay.add(bg);

    // Message text
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, message, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#00ffff',
      stroke: '#004444',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setName('message');
    this.connectionOverlay.add(text);

    // Pulsing animation
    this.tweens.add({
      targets: text,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private updateConnectionOverlay(message: string): void {
    if (this.connectionOverlay) {
      const text = this.connectionOverlay.getByName('message') as Phaser.GameObjects.Text;
      if (text) {
        text.setText(message);
      }
    }
  }

  private hideConnectionOverlay(): void {
    if (this.connectionOverlay) {
      this.connectionOverlay.destroy(true);
      this.connectionOverlay = undefined;
    }
  }

  private createOnlineUI(): void {
    const panelX = PLAY_AREA_WIDTH + 20;
    const panelCenterX = PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2;

    // Online mode indicator
    this.add.text(panelCenterX, 70, 'ONLINE MATCH', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#00ff00',
    }).setOrigin(0.5);

    // Room ID display
    const roomId = this.networkManager?.getRoomId() || '';
    this.add.text(panelCenterX, 90, `ROOM: ${roomId.slice(0, 8)}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    // Player 1 (You) UI
    const isFirstPlayer = this.getPlayerIndex() === 0;
    this.add.text(panelCenterX, 130, isFirstPlayer ? 'YOU (P1)' : 'OPPONENT (P1)', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: isFirstPlayer ? '#00ffff' : '#ff88ff',
    }).setOrigin(0.5);

    this.scoreTexts.push(
      this.add.text(panelX, 155, 'SCORE: 0', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
      })
    );
    this.healthTexts.push(
      this.add.text(panelX, 185, 'HEALTH: 3', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff4444',
      })
    );

    // Divider
    const graphics = this.add.graphics();
    graphics.lineStyle(1, COLORS.textNeon, 0.5);
    graphics.lineBetween(PLAY_AREA_WIDTH + 20, 230, GAME_WIDTH - 20, 230);

    // Player 2 UI
    this.add.text(panelCenterX, 250, isFirstPlayer ? 'OPPONENT (P2)' : 'YOU (P2)', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: isFirstPlayer ? '#ff88ff' : '#00ffff',
    }).setOrigin(0.5);

    this.scoreTexts.push(
      this.add.text(panelX, 275, 'SCORE: 0', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
      })
    );
    this.healthTexts.push(
      this.add.text(panelX, 305, 'HEALTH: 3', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff4444',
      })
    );

    // Controls hint
    const controlsY = GAME_HEIGHT - 100;
    this.add.text(panelCenterX, controlsY, 'ESC TO QUIT', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private getPlayerIndex(): number {
    if (!this.networkState || !this.localPlayerId) return 0;
    const playerIds = Array.from(this.networkState.players.keys());
    return playerIds.indexOf(this.localPlayerId);
  }

  private handleOnlineGameOver(winnerId: string): void {
    this.isGameOver = true;

    // Disconnect from server
    this.networkManager?.disconnect();

    // Determine scores from network state
    const scores: Array<{ playerId: string; score: number; isAlive: boolean }> = [];
    this.networkState?.players.forEach((player, id) => {
      scores.push({
        playerId: id,
        score: player.score,
        isAlive: player.isAlive,
      });
    });

    // Did local player win?
    const localWon = winnerId === this.localPlayerId;

    this.scene.start('GameOverScene', {
      mode: this.mode,
      scores,
      winner: winnerId,
      isOnline: true,
      localWon,
    });
  }

  private syncNetworkState(): void {
    if (!this.networkState) return;

    // Sync players
    this.syncNetworkPlayers();

    // Sync blocks
    this.syncNetworkBlocks();

    // Sync lasers
    this.syncNetworkLasers();

    // Sync power-ups
    this.syncNetworkPowerUps();

    // Update UI from network state
    this.updateOnlineUI();
  }

  private syncNetworkPlayers(): void {
    if (!this.networkState) return;

    const currentIds = new Set(this.networkState.players.keys());

    // Remove players that no longer exist
    this.networkPlayers.forEach((container, id) => {
      if (!currentIds.has(id)) {
        container.destroy(true);
        this.networkPlayers.delete(id);
      }
    });

    // Update or create players
    this.networkState.players.forEach((playerState, id) => {
      let container = this.networkPlayers.get(id);

      if (!container) {
        // Create new player visual
        container = this.createNetworkPlayer(id, playerState);
        this.networkPlayers.set(id, container);
      }

      // Update position and state
      this.updateNetworkPlayer(container, playerState, id === this.localPlayerId);
    });
  }

  private createNetworkPlayer(id: string, state: PlayerNetState): Phaser.GameObjects.Container {
    const container = this.add.container(state.x, state.y);

    // Create sprite
    const sprite = this.add.sprite(0, 0, 'bamster');
    sprite.setName('sprite');
    container.add(sprite);

    // Tint opponent differently
    if (id !== this.localPlayerId) {
      sprite.setTint(0xaaaaff);
    }

    return container;
  }

  private updateNetworkPlayer(
    container: Phaser.GameObjects.Container,
    state: PlayerNetState,
    isLocal: boolean
  ): void {
    // Smooth interpolation for remote players, direct for local
    if (isLocal) {
      container.x = state.x;
      container.y = state.y;
    } else {
      // Lerp towards server position
      container.x = Phaser.Math.Linear(container.x, state.x, 0.3);
      container.y = Phaser.Math.Linear(container.y, state.y, 0.3);
    }

    const sprite = container.getByName('sprite') as Phaser.GameObjects.Sprite;
    if (sprite) {
      // Update texture based on state
      if (!state.isAlive) {
        sprite.setVisible(false);
      } else {
        sprite.setVisible(true);
        sprite.setTexture(state.facingRight ? 'bamster' : 'bamster_left');
      }
    }
  }

  private syncNetworkBlocks(): void {
    if (!this.networkState) return;

    const currentIds = new Set(this.networkState.blocks.keys());

    // Remove blocks that no longer exist
    this.networkBlocks.forEach((container, id) => {
      if (!currentIds.has(id)) {
        container.destroy(true);
        this.networkBlocks.delete(id);
      }
    });

    // Update or create blocks
    this.networkState.blocks.forEach((blockState, id) => {
      let container = this.networkBlocks.get(id);

      if (!container) {
        // Create new block visual
        container = this.createNetworkBlock(blockState);
        this.networkBlocks.set(id, container);
      }

      // Update position
      container.x = blockState.x;
      container.y = blockState.y;
    });
  }

  private createNetworkBlock(state: BlockNetState): Phaser.GameObjects.Container {
    const container = this.add.container(state.x, state.y);

    // Create block sprite
    const sprite = this.add.sprite(0, 0, `block_${state.color}`);
    sprite.setName('sprite');
    container.add(sprite);

    return container;
  }

  private syncNetworkLasers(): void {
    if (!this.networkState) return;

    const currentIds = new Set(this.networkState.lasers.keys());

    // Remove lasers that no longer exist
    this.networkLasers.forEach((sprite, id) => {
      if (!currentIds.has(id)) {
        sprite.destroy();
        this.networkLasers.delete(id);
      }
    });

    // Update or create lasers
    this.networkState.lasers.forEach((laserState, id) => {
      let sprite = this.networkLasers.get(id);

      if (!sprite) {
        // Create new laser visual
        sprite = this.add.sprite(laserState.x, laserState.y, 'laser');
        if (laserState.isPiercing) {
          sprite.setTint(0x00ffff);
          sprite.setScale(1.5, 1);
        }
        // Set rotation based on velocity
        sprite.setRotation(Math.atan2(laserState.vy, laserState.vx));
        this.networkLasers.set(id, sprite);
      }

      // Update position
      sprite.x = laserState.x;
      sprite.y = laserState.y;
    });
  }

  private syncNetworkPowerUps(): void {
    if (!this.networkState) return;

    const currentIds = new Set(this.networkState.powerUps.keys());

    // Remove power-ups that no longer exist
    this.networkPowerUps.forEach((sprite, id) => {
      if (!currentIds.has(id)) {
        sprite.destroy();
        this.networkPowerUps.delete(id);
      }
    });

    // Update or create power-ups
    this.networkState.powerUps.forEach((powerUpState, id) => {
      let sprite = this.networkPowerUps.get(id);

      if (!sprite) {
        // Create new power-up visual
        sprite = this.add.sprite(
          powerUpState.x,
          powerUpState.y,
          `powerup_${powerUpState.powerUpType}`
        );
        sprite.setTint(0xffffaa);
        this.networkPowerUps.set(id, sprite);
      }

      // Update position
      sprite.x = powerUpState.x;
      sprite.y = powerUpState.y;
    });
  }

  private updateOnlineUI(): void {
    if (!this.networkState) return;

    const playerIds = Array.from(this.networkState.players.keys());

    playerIds.forEach((id, index) => {
      const player = this.networkState!.players.get(id);
      if (player && this.scoreTexts[index] && this.healthTexts[index]) {
        this.scoreTexts[index].setText(`SCORE: ${player.score}`);
        this.healthTexts[index].setText(`HEALTH: ${player.health}`);
      }
    });
  }

  private handleOnlineInput(): void {
    const input = this.inputManager.getPlayer1Input();

    // Send input to server
    this.networkManager?.sendInput({
      left: input.left,
      right: input.right,
      jump: input.jump,
      shoot: input.shoot,
    });
  }

  // ============================================
  // End Online Multiplayer Methods
  // ============================================

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

    // Block must be moving downward (actually falling)
    const blockBody = block.body as Phaser.Physics.Arcade.Body;
    if (blockBody.velocity.y <= 0) return false;

    // Block must be above the player's center (hitting head area)
    // and horizontally overlapping
    const blockBottom = block.y + BLOCK_SIZE / 2;
    const playerTop = player.y - 15;

    // Block bottom must be above player's upper body
    if (blockBottom > playerTop) return false;

    // Check horizontal overlap - block must be mostly over the player
    const dx = Math.abs(block.x - player.x);
    if (dx > BLOCK_SIZE * 0.7) return false;

    return true;
  }

  private handleFallingBlockHit(player: Bamster, block: Block): void {
    if (!player.isAlive || block.isResting) return;

    // Block must be moving downward
    const blockBody = block.body as Phaser.Physics.Arcade.Body;
    if (blockBody.velocity.y <= 0) return;

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
      getSound().play('explosion');

      // Emit particle effect for block destruction
      this.createBlockExplosion(block.x, block.y, block.color);

      // Award points with combo bonus
      if (shooter) {
        shooter.addScore(score);
        this.showScorePopup(block.x, block.y, score);
      }
    } else {
      // Cluster took damage but isn't destroyed yet
      getSound().play('hit');
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

  private createBlockExplosion(x: number, y: number, color: string): void {
    // Color map for particles matching block colors
    const colorMap: Record<string, number> = {
      magenta: 0xff00ff,
      cyan: 0x00ffff,
      lime: 0x39ff14,
      orange: 0xff6600,
      violet: 0xbf00ff,
    };
    const tint = colorMap[color] ?? 0xffffff;

    // Create particle emitter for this explosion
    const particles = this.add.particles(x, y, 'particle', {
      lifespan: 500,
      speed: { min: 80, max: 200 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 400,
      tint: tint,
      emitting: false,
    });
    particles.setDepth(50);
    particles.explode(12);

    // Clean up after particles finish
    this.time.delayedCall(600, () => {
      particles.destroy();
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

    // Play power-up sound
    getSound().play('powerup');

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

    // High score display
    this.add.text(panelCenterX, 70, 'HIGH SCORE', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(panelCenterX, 90, this.highScore.toString(), {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffff00',
    }).setOrigin(0.5);

    // Player 1 UI in side panel
    this.add.text(panelCenterX, 130, 'PLAYER 1', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.scoreTexts.push(
      this.add.text(panelX, 155, 'SCORE: 0', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffff00',
      })
    );
    this.healthTexts.push(
      this.add.text(panelX, 185, 'HEALTH: 1', {
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
      graphics.lineBetween(PLAY_AREA_WIDTH + 20, 230, GAME_WIDTH - 20, 230);

      this.add.text(panelCenterX, 250, 'PLAYER 2', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff88ff',
      }).setOrigin(0.5);

      this.scoreTexts.push(
        this.add.text(panelX, 275, 'SCORE: 0', {
          fontSize: '20px',
          fontFamily: 'monospace',
          color: '#ffff00',
        })
      );
      this.healthTexts.push(
        this.add.text(panelX, 305, 'HEALTH: 1', {
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

    // Check for new high score (use highest score from all players)
    const maxScore = Math.max(...scores.map((s) => s.score));
    if (maxScore > this.highScore) {
      this.highScore = maxScore;
      localStorage.setItem('bamster_highscore', this.highScore.toString());
    }

    this.scene.start('GameOverScene', {
      mode: this.mode,
      scores,
      winner: winner?.playerId,
    });
  }

  private checkCrushed(): void {
    // Check if any player is crushed by blocks stacking on top of them
    // This should only trigger when a player is truly sandwiched between ground and block
    this.players.forEach((player) => {
      if (!player.isAlive) return;

      const playerBody = player.body as Phaser.Physics.Arcade.Body;

      // Player must be blocked both below AND above to be crushed
      // This means they're truly sandwiched
      if (!playerBody.blocked.down && !playerBody.touching.down) return;
      if (!playerBody.blocked.up && !playerBody.touching.up) return;

      // Double-check there's actually a resting block directly above
      const blocksDirectlyAbove = this.blockGroup.children.getArray().filter((b) => {
        const block = b as Block;
        if (!block.isResting) return false;

        // Block must be very close horizontally (directly above)
        const dx = Math.abs(block.x - player.x);
        if (dx > BLOCK_SIZE * 0.5) return false;

        // Block must be just above the player's head
        const blockBottom = block.y + BLOCK_SIZE / 2;
        const playerTop = player.y - 20;
        const gap = playerTop - blockBottom;

        // Block bottom should be very close to or touching player top
        return gap < 5 && gap > -BLOCK_SIZE;
      });

      if (blocksDirectlyAbove.length > 0) {
        // Player is being crushed
        const died = player.takeDamage();
        if (died) {
          this.checkGameOver();
        }
      }
    });
  }

  private checkBlocksReachedTop(): void {
    // Game over if any resting block is at or above the top threshold
    const topThreshold = FRAME_WIDTH + BLOCK_SIZE * 2; // Two block heights from top

    const blocksAtTop = (this.blockGroup.children.getArray() as Block[]).filter(
      (block) => block.isResting && block.y <= topThreshold
    );

    if (blocksAtTop.length > 0) {
      // Kill all players - blocks have reached the top
      this.players.forEach((player) => {
        if (player.isAlive) {
          player.die();
        }
      });
      this.checkGameOver();
    }
  }

  update(): void {
    if (this.isGameOver || this.isPaused) return;

    // Handle online mode differently
    if (this.mode === 'online') {
      this.handleOnlineInput();
      this.syncNetworkState();
      return;
    }

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

    // Check if blocks have reached the top (game over condition)
    this.checkBlocksReachedTop();

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
