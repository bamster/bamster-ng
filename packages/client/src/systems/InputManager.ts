import Phaser from 'phaser';

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private shootKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Player 2 keys
  private p2Keys!: {
    I: Phaser.Input.Keyboard.Key;
    J: Phaser.Input.Keyboard.Key;
    K: Phaser.Input.Keyboard.Key;
    L: Phaser.Input.Keyboard.Key;
    U: Phaser.Input.Keyboard.Key;
  };

  // Mouse/touch input
  private isMouseDown: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupInputs();
  }

  private setupInputs(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Cursor keys (arrows)
    this.cursors = keyboard.createCursorKeys();

    // WASD keys
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Shoot key (Z)
    this.shootKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Space key for jump
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Player 2 keys
    this.p2Keys = {
      I: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      J: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      K: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      L: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      U: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U),
    };

    // Mouse input
    this.scene.input.on('pointerdown', () => {
      this.isMouseDown = true;
    });

    this.scene.input.on('pointerup', () => {
      this.isMouseDown = false;
    });
  }

  getPlayer1Input(): PlayerInputState {
    return {
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      jump:
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey),
      shoot: this.shootKey.isDown || this.isMouseDown,
    };
  }

  getPlayer2Input(): PlayerInputState {
    return {
      left: this.p2Keys.J.isDown,
      right: this.p2Keys.L.isDown,
      jump: Phaser.Input.Keyboard.JustDown(this.p2Keys.I),
      shoot: this.p2Keys.U.isDown,
    };
  }

  isJumpJustPressed(playerId: 'player1' | 'player2'): boolean {
    if (playerId === 'player1') {
      return (
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.W) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey)
      );
    } else {
      return Phaser.Input.Keyboard.JustDown(this.p2Keys.I);
    }
  }
}
