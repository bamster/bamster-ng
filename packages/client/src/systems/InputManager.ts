import Phaser from 'phaser';
import { GAME_HEIGHT, PLAY_AREA_WIDTH } from '@bamster/shared';
import { loadKeyBindings, type GameKeyBindings } from './KeyBindings';

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private bindings: GameKeyBindings;

  // Player 1 keys (configurable)
  private p1Left!: Phaser.Input.Keyboard.Key;
  private p1Right!: Phaser.Input.Keyboard.Key;
  private p1Jump!: Phaser.Input.Keyboard.Key;
  private p1Shoot!: Phaser.Input.Keyboard.Key;

  // WASD as alternate player 1 keys (enabled unless conflicting with P2)
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Track which WASD keys are disabled due to P2 conflicts
  private wasdDisabled: { W: boolean; A: boolean; S: boolean; D: boolean } = {
    W: false,
    A: false,
    S: false,
    D: false,
  };

  // Player 2 keys (configurable)
  private p2Left!: Phaser.Input.Keyboard.Key;
  private p2Right!: Phaser.Input.Keyboard.Key;
  private p2Jump!: Phaser.Input.Keyboard.Key;
  private p2Shoot!: Phaser.Input.Keyboard.Key;

  // Mouse/touch input
  private isMouseDown: boolean = false;

  // Touch controls (virtual joystick)
  private isTouchDevice: boolean = false;
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickPointer?: Phaser.Input.Pointer;
  private joystickDelta: { x: number; y: number } = { x: 0, y: 0 };
  private joystickRadius: number = 50;
  private joystickDeadzone: number = 10;

  // Touch buttons
  private jumpButton?: Phaser.GameObjects.Arc;
  private shootButton?: Phaser.GameObjects.Arc;
  private shootPressed: boolean = false;
  private jumpJustPressed: boolean = false;

  // Event system controls
  private mirrorMode: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bindings = loadKeyBindings();
    this.setupInputs();

    // Detect touch device
    this.isTouchDevice = this.scene.sys.game.device.input.touch;

    if (this.isTouchDevice) {
      this.setupTouchControls();
    }
  }

  private getKeyCode(key: string): number {
    const KeyCodes = Phaser.Input.Keyboard.KeyCodes;
    // Check if it's a direct KeyCode name
    if (key in KeyCodes) {
      return (KeyCodes as Record<string, number>)[key];
    }
    // Single letter keys (A-Z)
    if (key.length === 1) {
      const charCode = key.charCodeAt(0);
      if (charCode >= 65 && charCode <= 90) {
        return charCode;
      }
      // Handle raw punctuation (backwards compatibility for old bindings)
      const punctuationMap: Record<string, number> = {
        '.': KeyCodes.PERIOD,
        ',': KeyCodes.COMMA,
        ';': KeyCodes.SEMICOLON,
        "'": KeyCodes.QUOTES,
        '[': KeyCodes.OPEN_BRACKET,
        ']': KeyCodes.CLOSED_BRACKET,
        '\\': KeyCodes.BACK_SLASH,
        '/': KeyCodes.FORWARD_SLASH,
        '`': KeyCodes.BACKTICK,
        '-': KeyCodes.MINUS,
        '=': KeyCodes.PLUS,
      };
      if (key in punctuationMap) {
        return punctuationMap[key];
      }
    }
    return 0;
  }

  private setupInputs(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Player 1 configurable keys
    this.p1Left = keyboard.addKey(this.getKeyCode(this.bindings.player1.left));
    this.p1Right = keyboard.addKey(this.getKeyCode(this.bindings.player1.right));
    this.p1Jump = keyboard.addKey(this.getKeyCode(this.bindings.player1.jump));
    this.p1Shoot = keyboard.addKey(this.getKeyCode(this.bindings.player1.shoot));

    // WASD as alternate keys (available unless conflicting with P2 bindings)
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Check for WASD conflicts with Player 2 bindings
    const p2Keys = Object.values(this.bindings.player2);
    this.wasdDisabled = {
      W: p2Keys.includes('W'),
      A: p2Keys.includes('A'),
      S: p2Keys.includes('S'),
      D: p2Keys.includes('D'),
    };

    // Player 2 configurable keys
    this.p2Left = keyboard.addKey(this.getKeyCode(this.bindings.player2.left));
    this.p2Right = keyboard.addKey(this.getKeyCode(this.bindings.player2.right));
    this.p2Jump = keyboard.addKey(this.getKeyCode(this.bindings.player2.jump));
    this.p2Shoot = keyboard.addKey(this.getKeyCode(this.bindings.player2.shoot));

    // Mouse input (only for non-touch devices to avoid conflicts)
    if (!this.scene.sys.game.device.input.touch) {
      this.scene.input.on('pointerdown', () => {
        this.isMouseDown = true;
      });

      this.scene.input.on('pointerup', () => {
        this.isMouseDown = false;
      });
    }
  }

  private setupTouchControls(): void {
    // Create joystick on the left side
    const joystickX = 100;
    const joystickY = GAME_HEIGHT - 120;

    // Joystick base (outer circle)
    this.joystickBase = this.scene.add.circle(joystickX, joystickY, this.joystickRadius, 0x333366, 0.5);
    this.joystickBase.setStrokeStyle(3, 0x00ffff, 0.8);
    this.joystickBase.setDepth(1000);
    this.joystickBase.setScrollFactor(0);

    // Joystick thumb (inner circle)
    this.joystickThumb = this.scene.add.circle(joystickX, joystickY, 25, 0x00ffff, 0.7);
    this.joystickThumb.setStrokeStyle(2, 0xffffff, 1);
    this.joystickThumb.setDepth(1001);
    this.joystickThumb.setScrollFactor(0);

    // Jump button (top right of play area)
    const jumpX = PLAY_AREA_WIDTH - 80;
    const jumpY = GAME_HEIGHT - 180;
    this.jumpButton = this.scene.add.circle(jumpX, jumpY, 40, 0x333366, 0.5);
    this.jumpButton.setStrokeStyle(3, 0xff00ff, 0.8);
    this.jumpButton.setDepth(1000);
    this.jumpButton.setScrollFactor(0);
    this.jumpButton.setInteractive();

    // Jump label
    const jumpLabel = this.scene.add.text(jumpX, jumpY, 'JUMP', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    });
    jumpLabel.setOrigin(0.5);
    jumpLabel.setDepth(1001);
    jumpLabel.setScrollFactor(0);

    // Shoot button (bottom right of play area)
    const shootX = PLAY_AREA_WIDTH - 80;
    const shootY = GAME_HEIGHT - 80;
    this.shootButton = this.scene.add.circle(shootX, shootY, 40, 0x333366, 0.5);
    this.shootButton.setStrokeStyle(3, 0xffff00, 0.8);
    this.shootButton.setDepth(1000);
    this.shootButton.setScrollFactor(0);
    this.shootButton.setInteractive();

    // Shoot label
    const shootLabel = this.scene.add.text(shootX, shootY, 'FIRE', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
    });
    shootLabel.setOrigin(0.5);
    shootLabel.setDepth(1001);
    shootLabel.setScrollFactor(0);

    // Setup touch handlers for joystick
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if touch is on jump button
      if (this.jumpButton && this.isPointerOnButton(pointer, this.jumpButton)) {
        this.jumpJustPressed = true;
        this.jumpButton.setFillStyle(0xff00ff, 0.7);
        return;
      }

      // Check if touch is on shoot button
      if (this.shootButton && this.isPointerOnButton(pointer, this.shootButton)) {
        this.shootPressed = true;
        this.shootButton.setFillStyle(0xffff00, 0.7);
        return;
      }

      // Check if touch is near joystick area (left side of screen)
      if (pointer.x < PLAY_AREA_WIDTH / 2 && !this.joystickPointer) {
        this.joystickPointer = pointer;
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Check if releasing jump button - reset visual only
      if (this.jumpButton && this.isPointerOnButton(pointer, this.jumpButton)) {
        this.jumpButton.setFillStyle(0x333366, 0.5);
      }

      // Check if releasing shoot button
      if (this.shootButton && this.isPointerOnButton(pointer, this.shootButton)) {
        this.shootPressed = false;
        this.shootButton.setFillStyle(0x333366, 0.5);
      }

      // Release joystick
      if (this.joystickPointer && pointer.id === this.joystickPointer.id) {
        this.resetJoystick();
      }
    });
  }

  private isPointerOnButton(pointer: Phaser.Input.Pointer, button: Phaser.GameObjects.Arc): boolean {
    const dx = pointer.x - button.x;
    const dy = pointer.y - button.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= button.radius;
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickThumb) return;

    const dx = pointer.x - this.joystickBase.x;
    const dy = pointer.y - this.joystickBase.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Clamp to joystick radius
    const clampedDistance = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    // Update thumb position
    const thumbX = this.joystickBase.x + Math.cos(angle) * clampedDistance;
    const thumbY = this.joystickBase.y + Math.sin(angle) * clampedDistance;
    this.joystickThumb.setPosition(thumbX, thumbY);

    // Calculate normalized delta (-1 to 1)
    if (distance > this.joystickDeadzone) {
      this.joystickDelta.x = (clampedDistance / this.joystickRadius) * Math.cos(angle);
      this.joystickDelta.y = (clampedDistance / this.joystickRadius) * Math.sin(angle);
    } else {
      this.joystickDelta.x = 0;
      this.joystickDelta.y = 0;
    }
  }

  private resetJoystick(): void {
    this.joystickPointer = undefined;
    this.joystickDelta = { x: 0, y: 0 };

    // Reset thumb position to center
    if (this.joystickBase && this.joystickThumb) {
      this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
  }

  getPlayer1Input(): PlayerInputState {
    // Touch controls (joystick)
    const touchLeft = this.joystickDelta.x < -0.3;
    const touchRight = this.joystickDelta.x > 0.3;
    const touchJump = this.jumpJustPressed;
    const touchShoot = this.shootPressed;

    // Reset jump just pressed flag after reading
    this.jumpJustPressed = false;

    // Base input states (WASD only if not conflicting with P2)
    const wasdLeft = !this.wasdDisabled.A && this.wasd.A.isDown;
    const wasdRight = !this.wasdDisabled.D && this.wasd.D.isDown;
    const leftInput = this.p1Left.isDown || wasdLeft || touchLeft;
    const rightInput = this.p1Right.isDown || wasdRight || touchRight;

    // WASD jump only if not conflicting with P2
    const wasdJump = !this.wasdDisabled.W && Phaser.Input.Keyboard.JustDown(this.wasd.W);

    // Apply mirror mode (swap left/right)
    return {
      left: this.mirrorMode ? rightInput : leftInput,
      right: this.mirrorMode ? leftInput : rightInput,
      jump: Phaser.Input.Keyboard.JustDown(this.p1Jump) || wasdJump || touchJump,
      shoot: this.p1Shoot.isDown || this.isMouseDown || touchShoot,
    };
  }

  getPlayer2Input(): PlayerInputState {
    // Base input states
    const leftInput = this.p2Left.isDown;
    const rightInput = this.p2Right.isDown;

    // Apply mirror mode (swap left/right)
    return {
      left: this.mirrorMode ? rightInput : leftInput,
      right: this.mirrorMode ? leftInput : rightInput,
      jump: Phaser.Input.Keyboard.JustDown(this.p2Jump),
      shoot: this.p2Shoot.isDown,
    };
  }

  isJumpJustPressed(playerId: 'player1' | 'player2'): boolean {
    if (playerId === 'player1') {
      const wasdJump = !this.wasdDisabled.W && Phaser.Input.Keyboard.JustDown(this.wasd.W);
      return Phaser.Input.Keyboard.JustDown(this.p1Jump) || wasdJump;
    } else {
      return Phaser.Input.Keyboard.JustDown(this.p2Jump);
    }
  }

  // Reload bindings (call after settings change)
  reloadBindings(): void {
    this.bindings = loadKeyBindings();
    // Update WASD conflict detection
    const p2Keys = Object.values(this.bindings.player2);
    this.wasdDisabled = {
      W: p2Keys.includes('W'),
      A: p2Keys.includes('A'),
      S: p2Keys.includes('S'),
      D: p2Keys.includes('D'),
    };
    // Note: Keys would need to be re-added, but that requires scene restart
    // For now, bindings take effect on next scene start
  }

  // Set mirror mode (for Mirror Mode event - reverses left/right)
  setMirrorMode(enabled: boolean): void {
    this.mirrorMode = enabled;
  }

  // Check if mirror mode is active
  isMirrorModeActive(): boolean {
    return this.mirrorMode;
  }
}
