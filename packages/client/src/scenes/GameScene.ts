import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCK_SIZE,
  PLAY_AREA_WIDTH,
  FRAME_WIDTH,
  BAMSTER_SPEED,
  BAMSTER_JUMP_VELOCITY,
  GRAVITY,
  BAMSTER_STARTING_HEALTH,
} from '@bamster/shared';
import type { BlockColor } from '@bamster/shared';
import type { GameMode } from './MenuScene';
import { Bamster } from '../entities/Bamster';
import { Block } from '../entities/Block';
import { Laser } from '../entities/Laser';
import { PowerUp } from '../entities/PowerUp';
import { BlockSpawner } from '../systems/BlockSpawner';
import { EventManager } from '../systems/EventManager';
import { InputManager } from '../systems/InputManager';
import {
  NetworkManager,
  type NetworkState,
  type PlayerNetState,
  type BlockNetState,
} from '../systems/NetworkManager';
import { getSound } from '../systems/SoundManager';
import { getDebugManager, isDebugMode } from '../systems/DebugManager';
import { getGameSettings, DIFFICULTY_CONFIGS } from './SettingsScene';

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
  networkManager?: NetworkManager;
  localPlayerId?: string;
}

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'single';
  private inputManager!: InputManager;
  private blockSpawner!: BlockSpawner;
  private eventManager!: EventManager;

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
  private heartContainers: Phaser.GameObjects.Container[] = [];
  private powerUpIndicators: Phaser.GameObjects.Container[] = [];
  private maxHearts: number = BAMSTER_STARTING_HEALTH;
  private highScore: number = 0;

  // Combo system
  private comboCount: number = 0;
  private comboTimer?: Phaser.Time.TimerEvent;
  private comboText?: Phaser.GameObjects.Text;
  private comboTimeout: number = 2000; // Reset combo after 2 seconds

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

  // Parallax background layers
  private parallaxStars: { x: number; y: number; size: number; alpha: number; speed: number }[] = [];
  private parallaxGridOffset: number = 0;
  private starGraphics?: Phaser.GameObjects.Graphics;
  private gridGraphics?: Phaser.GameObjects.Graphics;

  // Input prediction state for local player
  private predictedX: number = 0;
  private predictedY: number = 0;
  private predictedVx: number = 0;
  private predictedVy: number = 0;
  private predictionInitialized: boolean = false;

  // Interpolation buffer for remote players (latency compensation)
  private playerInterpolationBuffers: Map<string, Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    timestamp: number;
  }>> = new Map();
  private readonly INTERPOLATION_DELAY = 100; // ms - how far behind to render remote players
  private readonly MAX_BUFFER_SIZE = 10; // max states to keep in buffer

  // Shrink Ray event state
  private shrinkRayActive: boolean = false;
  private shrinkRayOffset: number = 0; // How much the walls have moved inward
  private shrinkRayMaxOffset: number = 100; // Maximum shrink amount (pixels from each side)
  private shrinkRayWalls?: Phaser.GameObjects.Graphics;

  // Lights Out event state
  private lightsOutOverlay?: Phaser.GameObjects.Graphics;

  // Ghost Blocks event state
  private ghostBlocksActive: boolean = false;

  // Earthquake event state
  private earthquakeTimer?: Phaser.Time.TimerEvent;

  // Floor is Lava event state
  private floorIsLavaActive: boolean = false;
  private lavaGraphics?: Phaser.GameObjects.Graphics;
  private lavaDamageTimer?: Phaser.Time.TimerEvent;
  private lavaParticleEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  // Debug mode UI
  private debugLabel?: Phaser.GameObjects.Text;

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
    this.heartContainers = [];
    this.powerUpIndicators = [];
    // Set maxHearts based on difficulty
    const settings = getGameSettings();
    this.maxHearts = DIFFICULTY_CONFIGS[settings.difficulty].startingHealth;
    // Load high score from localStorage
    const savedHighScore = localStorage.getItem('bamster_highscore');
    this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;

    // Reset network state (or use provided from LobbyScene)
    this.networkManager = data.networkManager;
    this.localPlayerId = data.localPlayerId;
    this.networkState = undefined;
    this.isWaitingForPlayers = false;
    this.connectionOverlay = undefined;
    this.networkPlayers = new Map();
    this.networkBlocks = new Map();
    this.networkLasers = new Map();
    this.networkPowerUps = new Map();

    // Reset prediction state
    this.predictedX = 0;
    this.predictedY = 0;
    this.predictedVx = 0;
    this.predictedVy = 0;
    this.predictionInitialized = false;

    // Reset interpolation buffers
    this.playerInterpolationBuffers = new Map();

    // Reset combo state
    this.comboCount = 0;
    this.comboTimer = undefined;
    this.comboText = undefined;

    // Reset parallax state
    this.parallaxStars = [];
    this.parallaxGridOffset = 0;
    this.starGraphics = undefined;
    this.gridGraphics = undefined;
  }

  create(): void {
    // Create parallax background layers (deepest first)
    this.createParallaxBackground();

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

    // Get difficulty settings
    const settings = getGameSettings();
    const difficultyConfig = DIFFICULTY_CONFIGS[settings.difficulty];

    // Create block spawner (local modes only) with difficulty config
    this.blockSpawner = new BlockSpawner(
      this,
      this.blockGroup,
      this.powerUpGroup,
      difficultyConfig
    );

    // Create players based on mode (they'll stand on the ground)
    this.createPlayers();

    // Set score callback for BlockSpawner to check player score (for guaranteed power-up at 200 pts)
    this.blockSpawner.setScoreCallback(() => {
      // Return highest player score
      return Math.max(...this.players.map((p) => p.score), 0);
    });

    // Setup collisions
    this.setupCollisions();

    // Create UI (now in side panel)
    this.createUI();

    // Create event manager for random gameplay events
    this.eventManager = new EventManager(this);
    this.registerGameEvents();
    // Position event UI in the sidebar
    const panelCenterX = PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2;
    this.eventManager.createUI(panelCenterX, GAME_HEIGHT - 200);
    this.eventManager.start();

    // Start spawning blocks
    this.blockSpawner.start();

    // Start background music
    getSound().startMusic();

    // Setup pause key
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());

    // Setup debug mode toggle (F3)
    this.input.keyboard?.on('keydown-F3', () => this.toggleDebugMode());

    // Create debug indicator (hidden by default, shown if debug mode active)
    this.createDebugIndicator();
  }

  private togglePause(): void {
    if (this.isGameOver) return;

    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /** Create the DEBUG indicator label (hidden by default) */
  private createDebugIndicator(): void {
    this.debugLabel = this.add.text(PLAY_AREA_WIDTH - 10, 10, 'DEBUG', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.debugLabel.setOrigin(1, 0); // Right-aligned
    this.debugLabel.setDepth(200);
    this.debugLabel.setVisible(isDebugMode());
  }

  /** Toggle debug mode and update all blocks' HP visibility */
  private toggleDebugMode(): void {
    const debugManager = getDebugManager();
    const newState = debugManager.toggle();

    // Update debug label visibility
    if (this.debugLabel) {
      this.debugLabel.setVisible(newState);
    }

    // Update all existing blocks to show/hide HP
    this.blockGroup.getChildren().forEach((child) => {
      if (child instanceof Block) {
        child.updateDebugDisplay(newState);
      }
    });
  }

  private pauseGame(): void {
    this.isPaused = true;
    this.physics.pause();
    this.blockSpawner.stop();
    this.eventManager?.pause();

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
    this.eventManager?.resume();

    // Remove pause overlay
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = undefined;
    }
  }

  private createParallaxBackground(): void {
    // Create distant star field (very slow parallax)
    const starGraphics = this.add.graphics();
    starGraphics.setDepth(-30);

    // Generate random stars with varying sizes and speeds
    for (let i = 0; i < 60; i++) {
      const star = {
        x: Phaser.Math.Between(FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH),
        y: Phaser.Math.Between(FRAME_WIDTH, GAME_HEIGHT - FRAME_WIDTH),
        size: Phaser.Math.FloatBetween(0.5, 2),
        alpha: Phaser.Math.FloatBetween(0.2, 0.7),
        speed: Phaser.Math.FloatBetween(0.1, 0.4), // Slow drift speed
      };
      this.parallaxStars.push(star);
    }

    // Draw initial stars
    this.drawParallaxStars(starGraphics);

    // Store reference for updates
    this.starGraphics = starGraphics;

    // Create moving grid layer (medium parallax)
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(-20);

    // Draw initial grid
    this.drawParallaxGrid(this.gridGraphics);
  }

  private drawParallaxStars(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();

    // Twinkling effect using time
    const time = this.time.now * 0.001;

    this.parallaxStars.forEach((star, index) => {
      // Subtle twinkle by varying alpha
      const twinkle = Math.sin(time * 2 + index) * 0.2 + 0.8;
      const alpha = star.alpha * twinkle;

      // Neon star colors (cyan, magenta, white)
      const colors = [0x00ffff, 0xff00ff, 0xffffff, 0x8844ff];
      const color = colors[index % colors.length];

      graphics.fillStyle(color, alpha);
      graphics.fillCircle(star.x, star.y, star.size);

      // Add glow for larger stars
      if (star.size > 1.2) {
        graphics.fillStyle(color, alpha * 0.3);
        graphics.fillCircle(star.x, star.y, star.size * 2);
      }
    });
  }

  private drawParallaxGrid(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();

    const gridSpacing = 60;
    const playAreaLeft = FRAME_WIDTH;
    const playAreaRight = PLAY_AREA_WIDTH - FRAME_WIDTH;
    const playAreaTop = FRAME_WIDTH;
    const playAreaBottom = GAME_HEIGHT - FRAME_WIDTH;

    // Offset for animation
    const offset = this.parallaxGridOffset % gridSpacing;

    // Vertical lines (moving slowly left)
    graphics.lineStyle(1, COLORS.frameNeon, 0.08);
    for (let x = playAreaLeft - offset; x <= playAreaRight; x += gridSpacing) {
      if (x >= playAreaLeft && x <= playAreaRight) {
        graphics.lineBetween(x, playAreaTop, x, playAreaBottom);
      }
    }

    // Horizontal lines (static, perspective effect)
    for (let y = playAreaTop; y <= playAreaBottom; y += gridSpacing) {
      // Lines get brighter toward bottom for depth
      const depth = (y - playAreaTop) / (playAreaBottom - playAreaTop);
      graphics.lineStyle(1, COLORS.frameNeon, 0.04 + depth * 0.06);
      graphics.lineBetween(playAreaLeft, y, playAreaRight, y);
    }
  }

  private updateParallax(): void {
    // Update star positions (slow drift upward)
    const deltaTime = this.game.loop.delta / 1000;

    this.parallaxStars.forEach((star) => {
      star.y -= star.speed * 20 * deltaTime;

      // Wrap around when off screen
      if (star.y < FRAME_WIDTH) {
        star.y = GAME_HEIGHT - FRAME_WIDTH;
        star.x = Phaser.Math.Between(FRAME_WIDTH, PLAY_AREA_WIDTH - FRAME_WIDTH);
      }
    });

    // Redraw stars with twinkling
    if (this.starGraphics) {
      this.drawParallaxStars(this.starGraphics);
    }

    // Update grid offset (slow horizontal scroll)
    this.parallaxGridOffset += 15 * deltaTime;

    // Redraw grid
    if (this.gridGraphics) {
      this.drawParallaxGrid(this.gridGraphics);
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
    const titleText = this.add.text(PLAY_AREA_WIDTH + (GAME_WIDTH - PLAY_AREA_WIDTH) / 2, 30, 'BAMster', {
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
    // Setup pause/quit key for online mode
    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.isGameOver) {
        this.networkManager?.disconnect();
        this.scene.start('MenuScene');
      }
    });

    // If we already have a networkManager from LobbyScene, use it
    if (this.networkManager && this.localPlayerId) {
      // Game is already connected, set up listeners and start immediately
      this.setupNetworkListeners();
      this.createOnlineUI();
      return;
    }

    // Fallback: create new connection (legacy path, not from lobby)
    this.showConnectionOverlay('CONNECTING...');
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
  }

  private setupNetworkListeners(): void {
    if (!this.networkManager) return;

    this.networkManager.setOnStateChange((state) => {
      this.networkState = state;

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
    if (isLocal && this.predictionInitialized) {
      // Use predicted position for local player for responsive feel
      // Blend between prediction and server state to correct drift
      const correctionFactor = 0.1; // How much to correct per frame
      this.predictedX = Phaser.Math.Linear(this.predictedX, state.x, correctionFactor);
      this.predictedY = Phaser.Math.Linear(this.predictedY, state.y, correctionFactor);
      this.predictedVx = Phaser.Math.Linear(this.predictedVx, state.vx, correctionFactor);
      this.predictedVy = Phaser.Math.Linear(this.predictedVy, state.vy, correctionFactor);

      container.x = this.predictedX;
      container.y = this.predictedY;
    } else if (isLocal) {
      // No prediction yet, use server state directly
      container.x = state.x;
      container.y = state.y;
    } else {
      // Use interpolation buffer for remote players for smooth movement
      const position = this.getInterpolatedPosition(state);
      container.x = position.x;
      container.y = position.y;
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

  private addToInterpolationBuffer(state: PlayerNetState): void {
    const playerId = state.id;
    if (!this.playerInterpolationBuffers.has(playerId)) {
      this.playerInterpolationBuffers.set(playerId, []);
    }

    const buffer = this.playerInterpolationBuffers.get(playerId)!;
    buffer.push({
      x: state.x,
      y: state.y,
      vx: state.vx,
      vy: state.vy,
      timestamp: Date.now(),
    });

    // Keep buffer size limited
    while (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift();
    }
  }

  private getInterpolatedPosition(state: PlayerNetState): { x: number; y: number } {
    const playerId = state.id;

    // Add current state to buffer
    this.addToInterpolationBuffer(state);

    const buffer = this.playerInterpolationBuffers.get(playerId);
    if (!buffer || buffer.length < 2) {
      // Not enough data, use current state
      return { x: state.x, y: state.y };
    }

    // Calculate render time (current time minus interpolation delay)
    const renderTime = Date.now() - this.INTERPOLATION_DELAY;

    // Find two states to interpolate between
    let beforeState = buffer[0];
    let afterState = buffer[1];

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
        beforeState = buffer[i];
        afterState = buffer[i + 1];
        break;
      }
    }

    // If render time is after all buffered states, extrapolate using velocity
    if (renderTime > buffer[buffer.length - 1].timestamp) {
      const lastState = buffer[buffer.length - 1];
      const timeSinceLastUpdate = (renderTime - lastState.timestamp) / 1000;

      // Limit extrapolation to avoid wild jumps
      const maxExtrapolationTime = 0.1; // 100ms max extrapolation
      const extrapolationTime = Math.min(timeSinceLastUpdate, maxExtrapolationTime);

      return {
        x: lastState.x + lastState.vx * extrapolationTime,
        y: lastState.y + lastState.vy * extrapolationTime,
      };
    }

    // Interpolate between states
    const timeDiff = afterState.timestamp - beforeState.timestamp;
    if (timeDiff === 0) {
      return { x: state.x, y: state.y };
    }

    const t = (renderTime - beforeState.timestamp) / timeDiff;
    const clampedT = Math.max(0, Math.min(1, t));

    return {
      x: Phaser.Math.Linear(beforeState.x, afterState.x, clampedT),
      y: Phaser.Math.Linear(beforeState.y, afterState.y, clampedT),
    };
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

    // Apply input prediction locally for responsive feel
    this.applyInputPrediction(input);

    // Send input to server
    this.networkManager?.sendInput({
      left: input.left,
      right: input.right,
      jump: input.jump,
      shoot: input.shoot,
    });
  }

  private applyInputPrediction(input: { left: boolean; right: boolean; jump: boolean; shoot: boolean }): void {
    // Initialize prediction from server state if not done yet
    if (!this.predictionInitialized && this.networkState && this.localPlayerId) {
      const localPlayer = this.networkState.players.get(this.localPlayerId);
      if (localPlayer) {
        this.predictedX = localPlayer.x;
        this.predictedY = localPlayer.y;
        this.predictedVx = localPlayer.vx;
        this.predictedVy = localPlayer.vy;
        this.predictionInitialized = true;
      }
      return;
    }

    if (!this.predictionInitialized) return;

    const deltaTime = this.game.loop.delta / 1000; // Convert to seconds

    // Apply horizontal input to velocity
    if (input.left) {
      this.predictedVx = -BAMSTER_SPEED;
    } else if (input.right) {
      this.predictedVx = BAMSTER_SPEED;
    } else {
      this.predictedVx = 0;
    }

    // Apply gravity
    this.predictedVy += GRAVITY * deltaTime;

    // Apply jump if grounded (simple ground check)
    const groundY = GAME_HEIGHT - BLOCK_SIZE - 26; // Approximate ground position
    if (input.jump && this.predictedY >= groundY - 5) {
      this.predictedVy = BAMSTER_JUMP_VELOCITY;
    }

    // Update predicted position
    this.predictedX += this.predictedVx * deltaTime;
    this.predictedY += this.predictedVy * deltaTime;

    // Clamp to play area bounds
    const halfWidth = 28; // Approximate player half-width
    this.predictedX = Math.max(
      FRAME_WIDTH + halfWidth,
      Math.min(PLAY_AREA_WIDTH - FRAME_WIDTH - halfWidth, this.predictedX)
    );

    // Clamp to ground
    if (this.predictedY > groundY) {
      this.predictedY = groundY;
      this.predictedVy = 0;
    }
  }

  // ============================================
  // End Online Multiplayer Methods
  // ============================================

  private createPlayers(): void {
    // Get difficulty settings for starting health
    const settings = getGameSettings();
    const difficultyConfig = DIFFICULTY_CONFIGS[settings.difficulty];

    // Player 1 - position within play area
    const player1 = new Bamster(
      this,
      PLAY_AREA_WIDTH / 4,
      GAME_HEIGHT - 100,
      'player1',
      this.laserGroup
    );
    player1.health = difficultyConfig.startingHealth;
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
      player2.health = difficultyConfig.startingHealth;
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
    if (!player.isAlive || player.isDying || block.isResting) return;

    // Block must be moving downward
    const blockBody = block.body as Phaser.Physics.Arcade.Body;
    if (blockBody.velocity.y <= 0) return;

    const died = player.takeDamage();
    if (died) {
      this.checkGameOver();
    }

    // Visual feedback for damage
    this.showDamageEffect(player.x, player.y);

    // Destroy the block that hit the player
    this.createBlockExplosion(block.x, block.y, block.color);
    getSound().play('hit');
    block.destroyBlock();
  }

  private showDamageEffect(x: number, y: number): void {
    // Camera shake
    this.cameras.main.shake(150, 0.01);

    // Red flash overlay
    const flashOverlay = this.add.rectangle(
      PLAY_AREA_WIDTH / 2,
      GAME_HEIGHT / 2,
      PLAY_AREA_WIDTH,
      GAME_HEIGHT,
      0xff0000,
      0.3
    );
    flashOverlay.setDepth(90);
    this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 200,
      onComplete: () => flashOverlay.destroy(),
    });

    // Floating damage indicator
    const damageText = this.add.text(x, y - 20, '-1 ♥', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 3,
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(95);

    this.tweens.add({
      targets: damageText,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => damageText.destroy(),
    });
  }

  private handleBlockGroundCollision(block: Block): void {
    this.blockSpawner.landBlockOnGround(block);
  }

  private shouldBlocksCollide(block1: Block, block2: Block): boolean {
    // Ghost Blocks event: falling blocks pass through each other
    if (this.ghostBlocksActive) return false;

    // Only collide if one is resting and the other is falling
    if (block1.isResting === block2.isResting) return false;

    const fallingBlock = block1.isResting ? block2 : block1;
    const restingBlock = block1.isResting ? block1 : block2;

    // Check they're in the same column (within tolerance)
    const dx = Math.abs(fallingBlock.x - restingBlock.x);
    if (dx > BLOCK_SIZE * 0.8) return false;

    // Check relative position based on gravity direction
    const gravityFlipped = this.blockSpawner.isGravityFlipped();

    if (gravityFlipped) {
      // Falling block must be BELOW the resting block (falling upward)
      return fallingBlock.y > restingBlock.y;
    } else {
      // Falling block must be ABOVE the resting block (falling downward)
      return fallingBlock.y < restingBlock.y;
    }
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

      // Increment combo and apply multiplier
      this.incrementCombo();
      const comboMultiplier = 1 + (this.comboCount - 1) * 0.25; // 1x, 1.25x, 1.5x, 1.75x, 2x...

      // Apply double points event if active
      const eventMultiplier = this.isEventActive('double_points') ? 2 : 1;
      const finalScore = Math.floor(score * comboMultiplier * eventMultiplier);

      // Award points with combo bonus
      if (shooter) {
        shooter.addScore(finalScore);
        this.showScorePopup(block.x, block.y, finalScore);
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

  private incrementCombo(): void {
    this.comboCount++;

    // Reset combo timer
    if (this.comboTimer) {
      this.comboTimer.destroy();
    }
    this.comboTimer = this.time.delayedCall(this.comboTimeout, () => {
      this.resetCombo();
    });

    // Screen shake on big combos
    if (this.comboCount >= 5) {
      this.triggerComboShake();
    }

    // Update combo display
    this.updateComboDisplay();
  }

  private triggerComboShake(): void {
    // Intensity increases with combo level
    let intensity = 0.005;
    let duration = 100;

    if (this.comboCount >= 20) {
      intensity = 0.02;
      duration = 200;
    } else if (this.comboCount >= 15) {
      intensity = 0.015;
      duration = 180;
    } else if (this.comboCount >= 10) {
      intensity = 0.01;
      duration = 150;
    }

    this.cameras.main.shake(duration, intensity);
  }

  private resetCombo(): void {
    if (this.comboCount > 0) {
      this.comboCount = 0;
      this.updateComboDisplay();
    }
  }

  private updateComboDisplay(): void {
    if (!this.comboText) return;

    if (this.comboCount <= 1) {
      // Hide combo for single hits
      this.comboText.setVisible(false);
    } else {
      // Show combo counter
      this.comboText.setText(`${this.comboCount}x COMBO!`);
      this.comboText.setVisible(true);

      // Color based on combo level
      if (this.comboCount >= 10) {
        this.comboText.setColor('#ff0000'); // Red for 10+
      } else if (this.comboCount >= 5) {
        this.comboText.setColor('#ffff00'); // Yellow for 5+
      } else {
        this.comboText.setColor('#ff00ff'); // Pink for 2-4
      }

      // Pulse animation
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
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
      case 'bomb':
        this.handleBombPowerUp(player);
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
      bomb: 'ROW CLEAR!',
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

  private handleBombPowerUp(player: Bamster): void {
    // Destroy bottom row of blocks
    const { count, score, blocks } = this.blockSpawner.destroyBottomRow();

    if (count > 0) {
      // Play explosion sound
      getSound().play('explosion');

      // Create particle effects for each destroyed block
      blocks.forEach((block) => {
        this.createBlockExplosion(block.x, block.y, block.color);
      });

      // Camera shake for big effect
      this.cameras.main.shake(200, 0.015);

      // Award points to player
      player.addScore(score);
      this.showScorePopup(PLAY_AREA_WIDTH / 2, GAME_HEIGHT - 100, score);
    }
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

    // Combo counter (starts hidden)
    this.comboText = this.add.text(panelCenterX, 115, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    this.comboText.setOrigin(0.5);
    this.comboText.setVisible(false);

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

    // Heart icons for Player 1
    const heartContainer1 = this.add.container(panelX, 185);
    this.createHeartDisplay(heartContainer1);
    this.heartContainers.push(heartContainer1);
    this.healthTexts.push(
      this.add.text(panelX + 120, 185, '', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ff4444',
      })
    );

    // Power-up indicators for Player 1
    const powerUpContainer1 = this.add.container(panelX, 210);
    this.powerUpIndicators.push(powerUpContainer1);

    // Player 2 UI for local multiplayer
    if (this.mode === 'local') {
      // Divider
      const graphics = this.add.graphics();
      graphics.lineStyle(1, COLORS.textNeon, 0.5);
      graphics.lineBetween(PLAY_AREA_WIDTH + 20, 250, GAME_WIDTH - 20, 250);

      this.add.text(panelCenterX, 270, 'PLAYER 2', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff88ff',
      }).setOrigin(0.5);

      this.scoreTexts.push(
        this.add.text(panelX, 295, 'SCORE: 0', {
          fontSize: '20px',
          fontFamily: 'monospace',
          color: '#ffff00',
        })
      );

      // Heart icons for Player 2
      const heartContainer2 = this.add.container(panelX, 325);
      this.createHeartDisplay(heartContainer2);
      this.heartContainers.push(heartContainer2);
      this.healthTexts.push(
        this.add.text(panelX + 120, 325, '', {
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#ff4444',
        })
      );

      // Power-up indicators for Player 2
      const powerUpContainer2 = this.add.container(panelX, 350);
      this.powerUpIndicators.push(powerUpContainer2);
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

      // Update heart display
      if (this.heartContainers[index]) {
        this.updateHeartDisplay(this.heartContainers[index], player.health);
      }

      // Update health text (show extra lives beyond max hearts)
      if (this.healthTexts[index]) {
        if (player.health > this.maxHearts) {
          this.healthTexts[index].setText(`+${player.health - this.maxHearts}`);
        } else {
          this.healthTexts[index].setText('');
        }
      }

      // Update power-up indicators
      if (this.powerUpIndicators[index]) {
        this.updatePowerUpIndicator(this.powerUpIndicators[index], player);
      }
    });
  }

  private createHeartDisplay(container: Phaser.GameObjects.Container): void {
    const heartSpacing = 22;
    for (let i = 0; i < this.maxHearts; i++) {
      const heart = this.add.sprite(i * heartSpacing, 0, 'heart');
      heart.setName(`heart_${i}`);
      container.add(heart);
    }
  }

  private updateHeartDisplay(container: Phaser.GameObjects.Container, health: number): void {
    for (let i = 0; i < this.maxHearts; i++) {
      const heart = container.getByName(`heart_${i}`) as Phaser.GameObjects.Sprite;
      if (heart) {
        if (i < health) {
          // Full heart
          heart.setTexture('heart');
          heart.setAlpha(1);
        } else {
          // Empty heart
          heart.setTexture('heart_empty');
          heart.setAlpha(0.5);
        }
      }
    }
  }

  private updatePowerUpIndicator(container: Phaser.GameObjects.Container, player: Bamster): void {
    // Clear existing indicators
    container.removeAll(true);

    let yOffset = 0;
    const barWidth = 80;
    const barHeight = 10;
    const spacing = 28;

    // Show sneakers power-up with timer
    if (player.hasSneakers()) {
      const remaining = player.getSneakersTimeRemaining();
      this.createPowerUpBar(container, 0, yOffset, 'JUMP+', remaining, 0x88ffff, barWidth, barHeight);
      yOffset += spacing;
    }

    // Show weapon power-up with timer
    if (player.hasWeaponPowerUp()) {
      const weaponLabels: Record<string, string> = {
        rapid: 'RAPID',
        spread: 'SPREAD',
        piercing: 'PIERCE',
      };
      const weaponColors: Record<string, number> = {
        rapid: 0xff8888,
        spread: 0x88ff88,
        piercing: 0xaa88ff,
      };
      const remaining = player.getWeaponTimeRemaining();
      const label = weaponLabels[player.weaponType] || 'WEAPON';
      const color = weaponColors[player.weaponType] || 0xffffff;
      this.createPowerUpBar(container, 0, yOffset, label, remaining, color, barWidth, barHeight);
      yOffset += spacing;
    }
  }

  private createPowerUpBar(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    remainingFraction: number,
    color: number,
    width: number,
    height: number
  ): void {
    // Label
    const labelText = this.add.text(x, y, label, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    container.add(labelText);

    // Timer bar background
    const barY = y + 12;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x333333, 1);
    barBg.fillRect(x, barY, width, height);
    barBg.lineStyle(1, color, 0.5);
    barBg.strokeRect(x, barY, width, height);
    container.add(barBg);

    // Timer bar fill
    const fillWidth = Math.max(0, remainingFraction * (width - 2));
    if (fillWidth > 0) {
      const barFill = this.add.graphics();
      barFill.fillStyle(color, 0.8);
      barFill.fillRect(x + 1, barY + 1, fillWidth, height - 2);
      container.add(barFill);
    }
  }

  private checkGameOver(): void {
    // Players that are still playing (not dead or dying)
    const activePlayers = this.players.filter((p) => p.isAlive && !p.isDying);
    // Players currently in death animation
    const dyingPlayers = this.players.filter((p) => p.isDying && p.isAlive);

    if (activePlayers.length === 0) {
      if (dyingPlayers.length > 0) {
        // Wait for death animations to complete before showing game over
        // Check again when the dying player's animation completes
        this.time.delayedCall(1600, () => {
          if (!this.isGameOver) {
            this.gameOver();
          }
        });
      } else {
        this.gameOver();
      }
    } else if (this.mode === 'local' && activePlayers.length === 1 && dyingPlayers.length === 0) {
      // In local multiplayer, game ends when one player remains (and no one is dying)
      this.gameOver(activePlayers[0]);
    } else if (this.mode === 'local' && activePlayers.length === 1 && dyingPlayers.length > 0) {
      // Wait for dying player's animation before declaring winner
      this.time.delayedCall(1600, () => {
        if (!this.isGameOver) {
          const winner = this.players.find((p) => p.isAlive && !p.isDying);
          this.gameOver(winner);
        }
      });
    }
  }

  private gameOver(winner?: Bamster): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.blockSpawner.stop();
    this.eventManager?.stop();
    getSound().stopMusic();

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
      if (!player.isAlive || player.isDying) return;

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
        if (player.isAlive && !player.isDying) {
          player.die();
        }
      });
      this.checkGameOver();
    }
  }

  update(): void {
    if (this.isGameOver || this.isPaused) return;

    // Update parallax background (runs for all modes)
    this.updateParallax();

    // Handle online mode differently
    if (this.mode === 'online') {
      this.handleOnlineInput();
      this.syncNetworkState();
      return;
    }

    // Handle input for each player
    this.handlePlayerInput();

    // Update event manager (random events)
    this.eventManager?.update(this.game.loop.delta);

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
    if (player1 && player1.isAlive && !player1.isDying) {
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
      if (player2 && player2.isAlive && !player2.isDying) {
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

  /**
   * Register available game events
   * Each event has: id, name, icon, duration, onStart, onEnd, (optional) onUpdate
   */
  private registerGameEvents(): void {
    // Double Points event - 2x score multiplier
    this.eventManager.registerEvent({
      id: 'double_points',
      name: 'DOUBLE POINTS',
      icon: '2X',
      duration: 10000, // 10 seconds
      onStart: (_scene) => {
        // Double points is handled by checking if this event is active during scoring
        // The actual multiplier application happens in handleLaserBlockCollision
      },
      onEnd: (_scene) => {
        // Points return to normal automatically
      },
    });

    // Freeze Frame event - blocks pause mid-air
    this.eventManager.registerEvent({
      id: 'freeze_frame',
      name: 'FREEZE FRAME',
      icon: '❄️',
      duration: 8000, // 8 seconds
      onStart: (scene) => {
        // Pause all falling blocks
        const gameScene = scene as GameScene;
        gameScene.blockGroup.children.each((block) => {
          const b = block as Block;
          if (!b.isResting) {
            const body = b.body as Phaser.Physics.Arcade.Body;
            (b as Block & { savedVelocityY?: number }).savedVelocityY = body.velocity.y;
            body.setVelocityY(0);
          }
          return true;
        });
      },
      onEnd: (scene) => {
        // Resume falling blocks
        const gameScene = scene as GameScene;
        gameScene.blockGroup.children.each((block) => {
          const b = block as Block;
          if (!b.isResting) {
            const savedVel = (b as Block & { savedVelocityY?: number }).savedVelocityY;
            if (savedVel !== undefined) {
              const body = b.body as Phaser.Physics.Arcade.Body;
              body.setVelocityY(savedVel);
            }
          }
          return true;
        });
      },
    });

    // Power-Up Shower event - only power-ups spawn
    this.eventManager.registerEvent({
      id: 'powerup_shower',
      name: 'POWER-UP SHOWER',
      icon: '🎁',
      duration: 10000, // 10 seconds
      onStart: (_scene) => {
        // Enable power-up only mode in block spawner
        this.blockSpawner.setPowerUpOnlyMode(true);
      },
      onEnd: (_scene) => {
        // Disable power-up only mode
        this.blockSpawner.setPowerUpOnlyMode(false);
      },
    });

    // Mirror Mode event - controls are reversed
    this.eventManager.registerEvent({
      id: 'mirror_mode',
      name: 'MIRROR MODE',
      icon: '🪞',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        // Enable mirror mode in input manager
        this.inputManager.setMirrorMode(true);
      },
      onEnd: (_scene) => {
        // Disable mirror mode
        this.inputManager.setMirrorMode(false);
      },
    });

    // Block Rain event - blocks fall 2.5x faster
    this.eventManager.registerEvent({
      id: 'block_rain',
      name: 'BLOCK RAIN',
      icon: '⚡',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        // Speed up block falling
        this.blockSpawner.setFallSpeedMultiplier(2.5);
      },
      onEnd: (_scene) => {
        // Reset to normal speed
        this.blockSpawner.setFallSpeedMultiplier(1.0);
      },
    });

    // Unlimited Ammo event - rapid fire with no cooldown
    this.eventManager.registerEvent({
      id: 'unlimited_ammo',
      name: 'UNLIMITED AMMO',
      icon: '🔫',
      duration: 15000, // 15 seconds
      onStart: (_scene) => {
        // Enable unlimited ammo for all players
        this.players.forEach((player) => {
          player.unlimitedAmmo = true;
        });
      },
      onEnd: (_scene) => {
        // Disable unlimited ammo
        this.players.forEach((player) => {
          player.unlimitedAmmo = false;
        });
      },
    });

    // Shrink Ray event - play area narrows
    this.eventManager.registerEvent({
      id: 'shrink_ray',
      name: 'SHRINK RAY',
      icon: '📐',
      duration: 25000, // 25 seconds
      onStart: (_scene) => {
        this.startShrinkRay();
      },
      onEnd: (_scene) => {
        this.endShrinkRay();
      },
      onUpdate: (_scene, delta) => {
        this.updateShrinkRay(delta);
      },
    });

    // Rainbow Rush event - all blocks same color
    this.eventManager.registerEvent({
      id: 'rainbow_rush',
      name: 'RAINBOW RUSH',
      icon: '🌈',
      duration: 30000, // 30 seconds
      onStart: (_scene) => {
        // Pick a random color and lock it
        const colors: BlockColor[] = ['magenta', 'cyan', 'lime', 'orange', 'violet'];
        const randomColor = colors[Phaser.Math.Between(0, colors.length - 1)];
        this.blockSpawner.setFixedBlockColor(randomColor);
      },
      onEnd: (_scene) => {
        // Return to random colors
        this.blockSpawner.setFixedBlockColor(null);
      },
    });

    // Super Bamster event - invincibility + double jump
    this.eventManager.registerEvent({
      id: 'super_bamster',
      name: 'SUPER BAMster',
      icon: '⭐',
      duration: 15000, // 15 seconds
      onStart: (_scene) => {
        // Enable invincibility and double jump for all players
        this.players.forEach((player) => {
          player.invincible = true;
          player.jumpPower = 2.0; // Double jump height
          // Add glowing effect
          player.setTint(0xffff00); // Golden glow
        });
      },
      onEnd: (_scene) => {
        // Remove invincibility and restore normal jump
        this.players.forEach((player) => {
          player.invincible = false;
          // Only reset jump if sneakers aren't active
          if (!player.hasSneakers()) {
            player.jumpPower = 1.0;
          }
          player.clearTint();
        });
      },
    });

    // Lights Out event - screen goes dark
    this.eventManager.registerEvent({
      id: 'lights_out',
      name: 'LIGHTS OUT',
      icon: '🌑',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        this.startLightsOut();
      },
      onEnd: (_scene) => {
        this.endLightsOut();
      },
    });

    // Laser Frenzy event - lasers bounce off walls
    this.eventManager.registerEvent({
      id: 'laser_frenzy',
      name: 'LASER FRENZY',
      icon: '💥',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        // Enable bouncing for existing lasers
        this.laserGroup.children.each((child) => {
          const laser = child as Laser;
          laser.bouncing = true;
          return true;
        });
      },
      onEnd: (_scene) => {
        // Disable bouncing for existing lasers
        this.laserGroup.children.each((child) => {
          const laser = child as Laser;
          laser.bouncing = false;
          return true;
        });
      },
      onUpdate: (_scene, _delta) => {
        // Enable bouncing for any newly spawned lasers
        this.laserGroup.children.each((child) => {
          const laser = child as Laser;
          if (!laser.bouncing) {
            laser.bouncing = true;
          }
          return true;
        });
      },
    });

    // Gravity Flip event - blocks fall upward
    this.eventManager.registerEvent({
      id: 'gravity_flip',
      name: 'GRAVITY FLIP',
      icon: '🔄',
      duration: 25000, // 25 seconds
      onStart: (_scene) => {
        this.blockSpawner.setGravityFlipped(true);
      },
      onEnd: (_scene) => {
        this.blockSpawner.setGravityFlipped(false);
      },
      onUpdate: (_scene, _delta) => {
        // Check for blocks that need to land on ceiling
        this.blockGroup.children.each((child) => {
          const block = child as Block;
          if (!block.isResting && block.y <= FRAME_WIDTH + BLOCK_SIZE / 2) {
            this.blockSpawner.landBlockOnCeiling(block);
          }
          return true;
        });
      },
    });

    // Ghost Blocks event - blocks pass through each other
    this.eventManager.registerEvent({
      id: 'ghost_blocks',
      name: 'GHOST BLOCKS',
      icon: '👻',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        this.ghostBlocksActive = true;
        // Make all falling blocks semi-transparent
        this.blockGroup.children.each((child) => {
          const block = child as Block;
          if (!block.isResting) {
            block.setAlpha(0.5);
          }
          return true;
        });
      },
      onEnd: (_scene) => {
        this.ghostBlocksActive = false;
        // Restore opacity for all blocks
        this.blockGroup.children.each((child) => {
          const block = child as Block;
          block.setAlpha(1);
          return true;
        });
      },
      onUpdate: (_scene, _delta) => {
        // Make newly spawned falling blocks semi-transparent
        this.blockGroup.children.each((child) => {
          const block = child as Block;
          if (!block.isResting && block.alpha > 0.5) {
            block.setAlpha(0.5);
          }
          return true;
        });
      },
    });

    // Earthquake event - screen shakes, blocks can topple
    this.eventManager.registerEvent({
      id: 'earthquake',
      name: 'EARTHQUAKE',
      icon: '🌋',
      duration: 15000, // 15 seconds
      onStart: (_scene) => {
        this.startEarthquake();
      },
      onEnd: (_scene) => {
        this.endEarthquake();
      },
      onUpdate: (_scene, _delta) => {
        // Continuous camera shake
        this.cameras.main.shake(100, 0.003);
      },
    });

    // Giant Block event - spawns a massive block cluster
    this.eventManager.registerEvent({
      id: 'giant_block',
      name: 'GIANT BLOCK',
      icon: '🟫',
      duration: 3000, // Short duration - just for announcement
      onStart: (_scene) => {
        this.spawnGiantBlock();
      },
      onEnd: (_scene) => {
        // Nothing to clean up
      },
    });

    // Floor is Lava event - floor becomes dangerous
    this.eventManager.registerEvent({
      id: 'floor_is_lava',
      name: 'FLOOR IS LAVA',
      icon: '🌋',
      duration: 20000, // 20 seconds
      onStart: (_scene) => {
        this.startFloorIsLava();
      },
      onEnd: (_scene) => {
        this.endFloorIsLava();
      },
      onUpdate: (_scene, delta) => {
        this.updateFloorIsLava(delta);
      },
    });
  }

  /**
   * Check if a specific event is currently active
   */
  isEventActive(eventId: string): boolean {
    const activeEvent = this.eventManager?.getActiveEvent();
    return activeEvent?.id === eventId;
  }

  /**
   * Get the event manager (for external access if needed)
   */
  getEventManager(): EventManager | undefined {
    return this.eventManager;
  }

  /**
   * Start the Shrink Ray event - walls begin moving inward
   */
  private startShrinkRay(): void {
    this.shrinkRayActive = true;
    this.shrinkRayOffset = 0;

    // Create visual walls if they don't exist
    if (!this.shrinkRayWalls) {
      this.shrinkRayWalls = this.add.graphics();
      this.shrinkRayWalls.setDepth(99); // Just below frame
    }
  }

  /**
   * End the Shrink Ray event - restore normal play area
   */
  private endShrinkRay(): void {
    this.shrinkRayActive = false;

    // Animate walls back out
    this.tweens.add({
      targets: this,
      shrinkRayOffset: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.drawShrinkRayWalls();
      },
      onComplete: () => {
        // Clean up
        if (this.shrinkRayWalls) {
          this.shrinkRayWalls.destroy();
          this.shrinkRayWalls = undefined;
        }
      },
    });
  }

  /**
   * Update Shrink Ray effect each frame
   */
  private updateShrinkRay(delta: number): void {
    if (!this.shrinkRayActive) return;

    // Gradually increase shrink over first 2 seconds
    const shrinkSpeed = this.shrinkRayMaxOffset / 2000; // Full shrink in 2 seconds
    if (this.shrinkRayOffset < this.shrinkRayMaxOffset) {
      this.shrinkRayOffset = Math.min(
        this.shrinkRayOffset + shrinkSpeed * delta,
        this.shrinkRayMaxOffset
      );
    }

    // Draw the visual walls
    this.drawShrinkRayWalls();

    // Get effective bounds
    const leftBound = FRAME_WIDTH + this.shrinkRayOffset;
    const rightBound = PLAY_AREA_WIDTH - FRAME_WIDTH - this.shrinkRayOffset;

    // Crush blocks outside bounds
    this.blockGroup.children.each((child) => {
      const block = child as Block;
      if (block.active) {
        // Check if block center is outside the narrowed area
        if (block.x < leftBound || block.x > rightBound) {
          // Crush the block with visual effect
          this.crushBlock(block);
        }
      }
      return true;
    });

    // Constrain players to narrowed area
    this.players.forEach((player) => {
      const halfWidth = 16;
      if (player.x < leftBound + halfWidth) {
        player.x = leftBound + halfWidth;
        player.setVelocityX(0);
      } else if (player.x > rightBound - halfWidth) {
        player.x = rightBound - halfWidth;
        player.setVelocityX(0);
      }
    });
  }

  /**
   * Draw the shrink ray visual walls
   */
  private drawShrinkRayWalls(): void {
    if (!this.shrinkRayWalls) return;

    this.shrinkRayWalls.clear();

    // Semi-transparent danger zone walls
    const alpha = 0.7;
    const dangerColor = 0xff0066; // Neon pink

    // Left wall
    this.shrinkRayWalls.fillStyle(dangerColor, alpha);
    this.shrinkRayWalls.fillRect(
      FRAME_WIDTH,
      FRAME_WIDTH,
      this.shrinkRayOffset,
      GAME_HEIGHT - FRAME_WIDTH * 2
    );

    // Right wall
    this.shrinkRayWalls.fillRect(
      PLAY_AREA_WIDTH - FRAME_WIDTH - this.shrinkRayOffset,
      FRAME_WIDTH,
      this.shrinkRayOffset,
      GAME_HEIGHT - FRAME_WIDTH * 2
    );

    // Glowing edge lines
    this.shrinkRayWalls.lineStyle(2, 0xff00ff, 1);
    // Left edge
    this.shrinkRayWalls.lineBetween(
      FRAME_WIDTH + this.shrinkRayOffset,
      FRAME_WIDTH,
      FRAME_WIDTH + this.shrinkRayOffset,
      GAME_HEIGHT - FRAME_WIDTH
    );
    // Right edge
    this.shrinkRayWalls.lineBetween(
      PLAY_AREA_WIDTH - FRAME_WIDTH - this.shrinkRayOffset,
      FRAME_WIDTH,
      PLAY_AREA_WIDTH - FRAME_WIDTH - this.shrinkRayOffset,
      GAME_HEIGHT - FRAME_WIDTH
    );
  }

  /**
   * Crush a block (used by Shrink Ray event)
   */
  private crushBlock(block: Block): void {
    // Play crush sound (use explosion since blockBreak doesn't exist)
    getSound().play('explosion');

    // Visual crush effect - squeeze and fade
    this.tweens.add({
      targets: block,
      scaleX: 0,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        block.destroy();
      },
    });
  }

  /**
   * Get the effective left boundary (accounts for shrink ray)
   */
  getEffectiveLeftBound(): number {
    return FRAME_WIDTH + this.shrinkRayOffset;
  }

  /**
   * Get the effective right boundary (accounts for shrink ray)
   */
  getEffectiveRightBound(): number {
    return PLAY_AREA_WIDTH - FRAME_WIDTH - this.shrinkRayOffset;
  }

  /**
   * Start the Lights Out event - darken screen, add glow effects
   */
  private startLightsOut(): void {
    // Create dark overlay
    this.lightsOutOverlay = this.add.graphics();
    this.lightsOutOverlay.setDepth(90); // Below UI but above most game elements

    // Semi-transparent dark overlay over play area
    this.lightsOutOverlay.fillStyle(0x000000, 0.85);
    this.lightsOutOverlay.fillRect(
      FRAME_WIDTH,
      FRAME_WIDTH,
      PLAY_AREA_WIDTH - FRAME_WIDTH * 2,
      GAME_HEIGHT - FRAME_WIDTH * 2
    );

    // Fade in the darkness
    this.lightsOutOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.lightsOutOverlay,
      alpha: 1,
      duration: 500,
      ease: 'Quad.easeIn',
    });

    // Make blocks barely visible (dark tint)
    this.blockGroup.children.each((child) => {
      const block = child as Block;
      block.setTint(0x333333);
      return true;
    });

    // Make players glow brightly
    this.players.forEach((player) => {
      player.setTint(0x00ffff); // Cyan glow
    });

    // Make power-ups glow
    this.powerUpGroup.children.each((child) => {
      (child as PowerUp).setTint(0xff00ff); // Magenta glow
      return true;
    });
  }

  /**
   * End the Lights Out event - restore normal visibility
   */
  private endLightsOut(): void {
    // Fade out and destroy overlay
    if (this.lightsOutOverlay) {
      this.tweens.add({
        targets: this.lightsOutOverlay,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.lightsOutOverlay) {
            this.lightsOutOverlay.destroy();
            this.lightsOutOverlay = undefined;
          }
        },
      });
    }

    // Restore block colors
    this.blockGroup.children.each((child) => {
      const block = child as Block;
      block.clearTint();
      return true;
    });

    // Restore player colors (unless another event is affecting them)
    this.players.forEach((player) => {
      if (!player.invincible) {
        player.clearTint();
      }
    });

    // Restore power-up colors
    this.powerUpGroup.children.each((child) => {
      (child as PowerUp).clearTint();
      return true;
    });
  }

  /**
   * Start the Earthquake event
   */
  private startEarthquake(): void {
    // Start periodic block destabilization
    this.earthquakeTimer = this.time.addEvent({
      delay: 1500, // Every 1.5 seconds
      callback: () => this.destabilizeRandomBlock(),
      loop: true,
    });

    // Initial big shake
    this.cameras.main.shake(500, 0.01);
  }

  /**
   * End the Earthquake event
   */
  private endEarthquake(): void {
    if (this.earthquakeTimer) {
      this.earthquakeTimer.destroy();
      this.earthquakeTimer = undefined;
    }
  }

  /**
   * Destabilize a random resting block during earthquake
   */
  private destabilizeRandomBlock(): void {
    const restingBlocks = this.blockGroup.children
      .getArray()
      .filter((b) => (b as Block).isResting && b.active) as Block[];

    if (restingBlocks.length === 0) return;

    // Pick a random block to destabilize
    const block = Phaser.Utils.Array.GetRandom(restingBlocks);

    // Make it fall again with slight horizontal movement
    block.isResting = false;
    const body = block.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);

    // Random horizontal nudge
    const nudgeX = Phaser.Math.Between(-50, 50);
    body.setVelocity(nudgeX, this.blockSpawner.isGravityFlipped() ? -100 : 100);

    // Visual wobble effect
    this.tweens.add({
      targets: block,
      angle: { from: -5, to: 5 },
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        block.setAngle(0);
      },
    });
  }

  /**
   * Spawn a giant block cluster (2x2 or 3x3)
   */
  private spawnGiantBlock(): void {
    // Decide on size: 2x2 (75%) or 3x3 (25%)
    const is3x3 = Math.random() < 0.25;
    const size = is3x3 ? 3 : 2;

    // Pick a random color
    const colors: BlockColor[] = ['magenta', 'cyan', 'lime', 'orange', 'violet'];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];

    // Calculate grid position - ensure giant block fits within play area
    const usableWidth = PLAY_AREA_WIDTH - FRAME_WIDTH * 2;
    const gridColumns = Math.floor(usableWidth / BLOCK_SIZE);
    const maxColumn = gridColumns - size;
    const startColumn = Phaser.Math.Between(0, maxColumn);

    // Spawn position
    const startX = FRAME_WIDTH + startColumn * BLOCK_SIZE + BLOCK_SIZE / 2;
    const startY = this.blockSpawner.isGravityFlipped()
      ? GAME_HEIGHT + BLOCK_SIZE
      : -BLOCK_SIZE * size;

    // Create blocks in a grid pattern
    const blocks: Block[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const x = startX + col * BLOCK_SIZE;
        const y = startY + row * BLOCK_SIZE;

        const block = new Block(this, x, y, color);
        block.setFallSpeed(this.blockSpawner.isGravityFlipped() ? -100 : 100);
        this.blockGroup.add(block);
        blocks.push(block);
      }
    }

    // Add visual effect - make them pulse/glow
    blocks.forEach((block) => {
      block.setTint(0xffffff);
      this.tweens.add({
        targets: block,
        alpha: { from: 1, to: 0.7 },
        duration: 200,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          block.clearTint();
          block.setAlpha(1);
        },
      });
    });

    // Play sound
    getSound().play('powerup');
  }

  /**
   * Start Floor is Lava event - floor becomes dangerous
   */
  private startFloorIsLava(): void {
    this.floorIsLavaActive = true;

    // Create lava visual graphics
    if (!this.lavaGraphics) {
      this.lavaGraphics = this.add.graphics();
      this.lavaGraphics.setDepth(5); // Below blocks but above background
    }

    // Create particle emitter for lava bubbles/sparks
    this.lavaParticleEmitter = this.add.particles(0, 0, 'particle', {
      x: { min: FRAME_WIDTH, max: PLAY_AREA_WIDTH - FRAME_WIDTH },
      y: GAME_HEIGHT - BLOCK_SIZE / 2,
      lifespan: 600,
      speed: { min: 30, max: 80 },
      angle: { min: 250, max: 290 }, // Upward
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff4400, 0xff6600, 0xffaa00, 0xff0000],
      frequency: 80,
      emitting: true,
    });
    this.lavaParticleEmitter.setDepth(6);

    // Start damage timer - checks every 500ms for blocks/players on floor
    this.lavaDamageTimer = this.time.addEvent({
      delay: 500,
      callback: () => this.applyLavaDamage(),
      loop: true,
    });

    // Play warning sound
    getSound().play('damage');

    // Flash warning
    this.cameras.main.flash(200, 255, 100, 0);
  }

  /**
   * End Floor is Lava event - restore normal floor
   */
  private endFloorIsLava(): void {
    this.floorIsLavaActive = false;

    // Clean up lava graphics with fade out
    if (this.lavaGraphics) {
      this.tweens.add({
        targets: this.lavaGraphics,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.lavaGraphics?.destroy();
          this.lavaGraphics = undefined;
        },
      });
    }

    // Stop particle emitter
    if (this.lavaParticleEmitter) {
      this.lavaParticleEmitter.stop();
      this.time.delayedCall(600, () => {
        this.lavaParticleEmitter?.destroy();
        this.lavaParticleEmitter = undefined;
      });
    }

    // Stop damage timer
    if (this.lavaDamageTimer) {
      this.lavaDamageTimer.destroy();
      this.lavaDamageTimer = undefined;
    }
  }

  /**
   * Update Floor is Lava visual effect each frame
   */
  private updateFloorIsLava(_delta: number): void {
    if (!this.floorIsLavaActive || !this.lavaGraphics) return;

    this.lavaGraphics.clear();

    // Animated lava floor
    const time = this.time.now / 200;
    const floorY = GAME_HEIGHT - BLOCK_SIZE;
    const floorHeight = BLOCK_SIZE;

    // Draw base lava color with gradient
    for (let i = 0; i < floorHeight; i++) {
      const gradientAlpha = 0.6 + (i / floorHeight) * 0.3;
      const r = 255;
      const g = Math.floor(50 + Math.sin(time + i * 0.1) * 30);
      const b = 0;
      const color = (r << 16) | (g << 8) | b;
      this.lavaGraphics.fillStyle(color, gradientAlpha);
      this.lavaGraphics.fillRect(FRAME_WIDTH, floorY + i, PLAY_AREA_WIDTH - FRAME_WIDTH * 2, 1);
    }

    // Add animated "bubbles" (circles)
    this.lavaGraphics.fillStyle(0xffaa00, 0.8);
    for (let i = 0; i < 5; i++) {
      const bubbleX = FRAME_WIDTH + 50 + Math.sin(time + i * 2) * 30 + i * 100;
      const bubbleY = floorY + 10 + Math.sin(time * 1.5 + i) * 5;
      const bubbleSize = 5 + Math.sin(time * 2 + i) * 2;
      this.lavaGraphics.fillCircle(bubbleX, bubbleY, bubbleSize);
    }

    // Glowing top edge
    this.lavaGraphics.lineStyle(3, 0xffff00, 0.8 + Math.sin(time * 3) * 0.2);
    this.lavaGraphics.lineBetween(FRAME_WIDTH, floorY, PLAY_AREA_WIDTH - FRAME_WIDTH, floorY);
  }

  /**
   * Apply lava damage to blocks and players touching the floor
   */
  private applyLavaDamage(): void {
    if (!this.floorIsLavaActive) return;

    const floorY = GAME_HEIGHT - BLOCK_SIZE;

    // Damage blocks on the floor
    const blocksToDestroy: Block[] = [];
    this.blockGroup.children.each((child) => {
      const block = child as Block;
      if (block.active && block.isResting) {
        // Check if block is touching the floor (bottom row)
        if (block.y >= floorY - BLOCK_SIZE / 2) {
          blocksToDestroy.push(block);
        }
      }
      return true;
    });

    // Destroy floor-level blocks with melting effect
    blocksToDestroy.forEach((block) => {
      // Visual melt effect
      this.tweens.add({
        targets: block,
        scaleY: 0.3,
        alpha: 0,
        tint: 0xff4400,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          block.destroy();
        },
      });
    });

    // Damage players touching the floor
    this.players.forEach((player) => {
      if (player.isAlive && !player.isDying) {
        const body = player.body as Phaser.Physics.Arcade.Body;
        // Check if player is on the floor
        if (body.blocked.down || body.touching.down) {
          if (player.y >= floorY - 30) {
            player.takeDamage();
            // Visual feedback - flash red
            player.setTint(0xff0000);
            this.time.delayedCall(100, () => player.clearTint());
          }
        }
      }
    });
  }
}
