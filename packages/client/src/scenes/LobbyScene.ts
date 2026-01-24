import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@bamster/shared';
import { NetworkManager, type NetworkState } from '../systems/NetworkManager';

// 80s color palette
const COLORS = {
  background: 0x0a0a1a,
  neonPink: 0xff00ff,
  neonCyan: 0x00ffff,
  neonYellow: 0xffff00,
  neonGreen: 0x00ff00,
  darkPurple: 0x2a0a4a,
  panelBg: 0x120824,
};

type LobbyMode = 'menu' | 'quickmatch' | 'create' | 'join';

export class LobbyScene extends Phaser.Scene {
  private networkManager?: NetworkManager;
  private lobbyMode: LobbyMode = 'menu';
  private roomCode: string = '';
  private statusText?: Phaser.GameObjects.Text;
  private roomCodeText?: Phaser.GameObjects.Text;
  private roomCodeInput: string = '';
  private inputText?: Phaser.GameObjects.Text;
  private inputCursor?: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Container[] = [];
  private playerCountText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(): void {
    this.lobbyMode = 'menu';
    this.roomCode = '';
    this.roomCodeInput = '';
    this.networkManager = undefined;
    this.buttons = [];
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.showMainMenu();

    // Setup keyboard for room code input
    this.input.keyboard?.on('keydown', this.handleKeyInput, this);

    // ESC to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.lobbyMode === 'menu') {
        this.scene.start('MenuScene');
      } else {
        this.cancelAndReturn();
      }
    });
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.background, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Add scanlines effect
    for (let i = 0; i < GAME_HEIGHT; i += 4) {
      graphics.fillStyle(0x000000, 0.1);
      graphics.fillRect(0, i, GAME_WIDTH, 2);
    }

    // Grid lines (80s style)
    graphics.lineStyle(1, COLORS.neonPink, 0.15);
    for (let x = 0; x < GAME_WIDTH; x += 40) {
      graphics.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      graphics.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createTitle(): void {
    const titleShadow = this.add.text(GAME_WIDTH / 2 + 3, 53, 'ONLINE PLAY', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#330033',
    });
    titleShadow.setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, 50, 'ONLINE PLAY', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff00ff',
      stroke: '#ff88ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);
  }

  private clearButtons(): void {
    this.buttons.forEach((btn) => btn.destroy());
    this.buttons = [];
    this.statusText?.destroy();
    this.roomCodeText?.destroy();
    this.inputText?.destroy();
    this.inputCursor?.destroy();
    this.playerCountText?.destroy();
  }

  private showMainMenu(): void {
    this.clearButtons();
    this.lobbyMode = 'menu';

    // Disconnect if connected
    this.networkManager?.disconnect();
    this.networkManager = undefined;

    const subtitle = this.add.text(GAME_WIDTH / 2, 110, 'Choose your battle mode', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    subtitle.setOrigin(0.5);
    this.buttons.push(subtitle as unknown as Phaser.GameObjects.Container);

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 200, '⚡ QUICK MATCH', 'Find an opponent instantly', () => {
        this.startQuickMatch();
      })
    );

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 290, '🏠 CREATE ROOM', 'Get a code to share with a friend', () => {
        this.createPrivateRoom();
      })
    );

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 380, '🔗 JOIN ROOM', 'Enter a room code', () => {
        this.showJoinRoom();
      })
    );

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 490, '← BACK TO MENU', '', () => {
        this.scene.start('MenuScene');
      })
    );

    // Hint text
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'PRESS ESC TO GO BACK', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666666',
    });
    hint.setOrigin(0.5);
    this.buttons.push(hint as unknown as Phaser.GameObjects.Container);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    subtitle: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const height = subtitle ? 60 : 45;
    const bg = this.add.rectangle(0, 0, 320, height, COLORS.darkPurple);
    bg.setStrokeStyle(2, COLORS.neonPink);

    const label = this.add.text(0, subtitle ? -10 : 0, text, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    if (subtitle) {
      const sub = this.add.text(0, 12, subtitle, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#888888',
      });
      sub.setOrigin(0.5);
      container.add(sub);
    }

    container.setSize(320, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0x4a1a6a);
      bg.setStrokeStyle(3, COLORS.neonCyan);
      label.setColor('#00ffff');
    });

    container.on('pointerout', () => {
      bg.setFillStyle(COLORS.darkPurple);
      bg.setStrokeStyle(2, COLORS.neonPink);
      label.setColor('#ffffff');
    });

    container.on('pointerdown', onClick);

    return container;
  }

  private startQuickMatch(): void {
    this.clearButtons();
    this.lobbyMode = 'quickmatch';

    this.statusText = this.add.text(GAME_WIDTH / 2, 200, 'SEARCHING FOR OPPONENT...', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.statusText.setOrigin(0.5);

    // Pulsing animation
    this.tweens.add({
      targets: this.statusText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Loading spinner dots
    const dots = this.add.text(GAME_WIDTH / 2, 250, '...', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    dots.setOrigin(0.5);
    this.buttons.push(dots as unknown as Phaser.GameObjects.Container);

    this.time.addEvent({
      delay: 300,
      callback: () => {
        const dotCount = (dots.text.length % 3) + 1;
        dots.setText('.'.repeat(dotCount));
      },
      loop: true,
    });

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 400, '✕ CANCEL', '', () => {
        this.cancelAndReturn();
      })
    );

    // Connect to quick match
    this.networkManager = new NetworkManager();
    this.setupNetworkCallbacks();

    this.networkManager.quickMatch().catch((error) => {
      console.error('Quick match failed:', error);
      this.showError('Connection failed. Please try again.');
    });
  }

  private createPrivateRoom(): void {
    this.clearButtons();
    this.lobbyMode = 'create';

    this.statusText = this.add.text(GAME_WIDTH / 2, 180, 'CREATING ROOM...', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.statusText.setOrigin(0.5);

    // Connect and create room
    this.networkManager = new NetworkManager();
    this.setupNetworkCallbacks();

    this.networkManager.createPrivateRoom().catch((error) => {
      console.error('Create room failed:', error);
      this.showError('Failed to create room. Please try again.');
    });
  }

  private showRoomCreated(): void {
    if (!this.networkManager) return;

    this.roomCode = this.networkManager.getRoomId() || 'ERROR';

    this.statusText?.destroy();
    this.statusText = this.add.text(GAME_WIDTH / 2, 160, 'ROOM CREATED!', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ff00',
    });
    this.statusText.setOrigin(0.5);

    // Room code label
    const codeLabel = this.add.text(GAME_WIDTH / 2, 210, 'ROOM CODE:', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    codeLabel.setOrigin(0.5);
    this.buttons.push(codeLabel as unknown as Phaser.GameObjects.Container);

    // Room code display (large, easy to read)
    const codeBox = this.add.rectangle(GAME_WIDTH / 2, 270, 300, 60, COLORS.panelBg);
    codeBox.setStrokeStyle(3, COLORS.neonYellow);
    this.buttons.push(codeBox as unknown as Phaser.GameObjects.Container);

    this.roomCodeText = this.add.text(GAME_WIDTH / 2, 270, this.roomCode.toUpperCase(), {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffff00',
    });
    this.roomCodeText.setOrigin(0.5);

    // Copy hint
    const copyHint = this.add.text(GAME_WIDTH / 2, 320, 'Share this code with your friend!', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    copyHint.setOrigin(0.5);
    this.buttons.push(copyHint as unknown as Phaser.GameObjects.Container);

    // Waiting status
    this.playerCountText = this.add.text(GAME_WIDTH / 2, 380, 'Waiting for opponent...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    this.playerCountText.setOrigin(0.5);

    // Pulsing animation
    this.tweens.add({
      targets: this.playerCountText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Copy button
    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 460, '📋 COPY CODE', '', () => {
        navigator.clipboard.writeText(this.roomCode).then(() => {
          copyHint.setText('Copied to clipboard!');
          copyHint.setColor('#00ff00');
          this.time.delayedCall(2000, () => {
            copyHint.setText('Share this code with your friend!');
            copyHint.setColor('#00ffff');
          });
        });
      })
    );

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 540, '✕ CANCEL', '', () => {
        this.cancelAndReturn();
      })
    );
  }

  private showJoinRoom(): void {
    this.clearButtons();
    this.lobbyMode = 'join';
    this.roomCodeInput = '';

    this.statusText = this.add.text(GAME_WIDTH / 2, 180, 'JOIN A ROOM', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.statusText.setOrigin(0.5);

    // Input label
    const inputLabel = this.add.text(GAME_WIDTH / 2, 230, 'ENTER ROOM CODE:', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    inputLabel.setOrigin(0.5);
    this.buttons.push(inputLabel as unknown as Phaser.GameObjects.Container);

    // Input box
    const inputBox = this.add.rectangle(GAME_WIDTH / 2, 290, 300, 60, COLORS.panelBg);
    inputBox.setStrokeStyle(3, COLORS.neonCyan);
    this.buttons.push(inputBox as unknown as Phaser.GameObjects.Container);

    // Input text
    this.inputText = this.add.text(GAME_WIDTH / 2, 290, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.inputText.setOrigin(0.5);

    // Blinking cursor
    this.inputCursor = this.add.text(GAME_WIDTH / 2, 290, '_', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.inputCursor.setOrigin(0.5);

    this.tweens.add({
      targets: this.inputCursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Hint
    const hint = this.add.text(GAME_WIDTH / 2, 340, 'Type the code and press ENTER to join', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666666',
    });
    hint.setOrigin(0.5);
    this.buttons.push(hint as unknown as Phaser.GameObjects.Container);

    // Join button
    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 420, '→ JOIN', '', () => {
        this.attemptJoin();
      })
    );

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 500, '← BACK', '', () => {
        this.showMainMenu();
      })
    );
  }

  private handleKeyInput(event: KeyboardEvent): void {
    if (this.lobbyMode !== 'join') return;

    if (event.key === 'Enter') {
      this.attemptJoin();
    } else if (event.key === 'Backspace') {
      this.roomCodeInput = this.roomCodeInput.slice(0, -1);
      this.updateInputDisplay();
    } else if (event.key.length === 1 && this.roomCodeInput.length < 12) {
      // Only allow alphanumeric characters
      if (/^[a-zA-Z0-9]$/.test(event.key)) {
        this.roomCodeInput += event.key.toUpperCase();
        this.updateInputDisplay();
      }
    }
  }

  private updateInputDisplay(): void {
    if (this.inputText) {
      this.inputText.setText(this.roomCodeInput);
      // Position cursor after text
      const textWidth = this.inputText.width;
      if (this.inputCursor) {
        this.inputCursor.setX(GAME_WIDTH / 2 + textWidth / 2 + 5);
      }
    }
  }

  private attemptJoin(): void {
    if (this.roomCodeInput.length === 0) {
      this.showError('Please enter a room code');
      return;
    }

    this.clearButtons();
    this.lobbyMode = 'join';

    this.statusText = this.add.text(GAME_WIDTH / 2, 250, 'JOINING ROOM...', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ffff',
    });
    this.statusText.setOrigin(0.5);

    this.tweens.add({
      targets: this.statusText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 400, '✕ CANCEL', '', () => {
        this.cancelAndReturn();
      })
    );

    // Connect to the room
    this.networkManager = new NetworkManager();
    this.setupNetworkCallbacks();

    this.networkManager.joinPrivateRoom(this.roomCodeInput.toLowerCase()).catch((error) => {
      console.error('Join room failed:', error);
      this.showError('Room not found. Check the code and try again.');
    });
  }

  private setupNetworkCallbacks(): void {
    if (!this.networkManager) return;

    this.networkManager.setOnConnected(() => {
      if (this.lobbyMode === 'create') {
        this.showRoomCreated();
      }
      // Send ready signal
      this.networkManager?.sendReady();
    });

    this.networkManager.setOnStateChange((state: NetworkState) => {
      // Update player count display
      const playerCount = state.players.size;
      if (this.playerCountText) {
        if (playerCount >= 2) {
          this.playerCountText.setText('Opponent joined! Starting...');
          this.playerCountText.setColor('#00ff00');
        } else {
          this.playerCountText.setText('Waiting for opponent...');
        }
      }

      // Check if game should start (2 players and running)
      if (state.isRunning && state.players.size >= 2) {
        // Transfer to game scene with the active network manager
        this.scene.start('GameScene', {
          mode: 'online',
          networkManager: this.networkManager,
          localPlayerId: this.networkManager?.getLocalPlayerId(),
        });
      }
    });

    this.networkManager.setOnDisconnected(() => {
      this.showError('Disconnected from server');
    });

    this.networkManager.setOnError((error) => {
      console.error('Network error:', error);
    });
  }

  private showError(message: string): void {
    this.clearButtons();

    const errorText = this.add.text(GAME_WIDTH / 2, 250, message, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ff4444',
    });
    errorText.setOrigin(0.5);
    this.buttons.push(errorText as unknown as Phaser.GameObjects.Container);

    this.buttons.push(
      this.createButton(GAME_WIDTH / 2, 350, '← TRY AGAIN', '', () => {
        this.showMainMenu();
      })
    );
  }

  private cancelAndReturn(): void {
    this.networkManager?.disconnect();
    this.networkManager = undefined;
    this.showMainMenu();
  }
}
