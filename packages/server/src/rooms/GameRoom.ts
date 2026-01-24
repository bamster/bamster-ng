import { Room, Client } from '@colyseus/core';
import { GameState, Player, Block, PowerUp, Laser } from '../schema/GameState';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCK_SIZE,
  BLOCK_COLORS,
  BLOCK_FALL_SPEED,
  BLOCK_SPAWN_INTERVAL,
  BAMSTER_SPEED,
  BAMSTER_JUMP_VELOCITY,
  GRAVITY,
  LASER_SPEED,
  POWERUP_SPAWN_CHANCE,
  SCORE_PER_BLOCK,
  TICK_RATE,
} from '@bamster/shared';

interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
}

export class GameRoom extends Room<GameState> {
  private tickInterval?: ReturnType<typeof setInterval>;
  private spawnInterval?: ReturnType<typeof setInterval>;
  private blockIdCounter = 0;
  private laserIdCounter = 0;
  private powerUpIdCounter = 0;
  private lastShootTime: Map<string, number> = new Map();
  private currentFallSpeed = BLOCK_FALL_SPEED;

  maxClients = 2;

  onCreate(): void {
    this.setState(new GameState());

    // Handle player input
    this.onMessage('input', (client: Client, input: PlayerInput) => {
      this.handleInput(client.sessionId, input);
    });

    // Handle ready state
    this.onMessage('ready', (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = true;
        this.checkStartGame();
      }
    });

    // Handle restart request
    this.onMessage('restart', () => {
      this.restartGame();
    });
  }

  onJoin(client: Client): void {
    console.log(`Player ${client.sessionId} joined`);

    const player = new Player();
    player.id = client.sessionId;

    // Position players on opposite sides
    const playerCount = this.state.players.size;
    player.x = playerCount === 0 ? GAME_WIDTH / 4 : (GAME_WIDTH * 3) / 4;
    player.y = GAME_HEIGHT - 100;

    this.state.players.set(client.sessionId, player);

    // Auto-start if room is full
    if (this.state.players.size >= 2) {
      this.lock();
    }
  }

  onLeave(client: Client): void {
    console.log(`Player ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);

    // End game if a player leaves
    if (this.state.isRunning) {
      this.endGame();
    }
  }

  onDispose(): void {
    this.stopGameLoop();
  }

  private checkStartGame(): void {
    const players: Player[] = [];
    this.state.players.forEach((player: Player) => {
      players.push(player);
    });
    const allReady = players.length >= 2 && players.every((p: Player) => p.isReady);

    if (allReady && !this.state.isRunning) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.state.isRunning = true;
    this.state.isGameOver = false;
    this.state.gameTime = 0;

    // Reset players
    this.state.players.forEach((player: Player) => {
      player.score = 0;
      player.health = 1;
      player.isAlive = true;
      player.weaponType = 'basic';
      player.jumpPower = 1;
    });

    // Clear existing objects
    this.state.blocks.clear();
    this.state.powerUps.clear();
    this.state.lasers.clear();

    // Start game loop
    this.startGameLoop();
  }

  private startGameLoop(): void {
    const tickMs = 1000 / TICK_RATE;

    this.tickInterval = setInterval(() => {
      this.update(tickMs / 1000);
    }, tickMs);

    this.spawnInterval = setInterval(() => {
      this.spawnBlock();
    }, BLOCK_SPAWN_INTERVAL);
  }

  private stopGameLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }
    if (this.spawnInterval) {
      clearInterval(this.spawnInterval);
      this.spawnInterval = undefined;
    }
  }

  private update(dt: number): void {
    if (!this.state.isRunning) return;

    this.state.gameTime += dt;

    // Update players
    this.state.players.forEach((player: Player) => {
      if (!player.isAlive) return;

      // Apply gravity
      player.vy += GRAVITY * dt;

      // Apply velocity
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Ground collision (simplified - use blocks in full implementation)
      if (player.y > GAME_HEIGHT - 50) {
        player.y = GAME_HEIGHT - 50;
        player.vy = 0;
      }

      // World bounds
      player.x = Math.max(24, Math.min(GAME_WIDTH - 24, player.x));

      // Check if fallen off screen
      if (player.y > GAME_HEIGHT + 100) {
        player.isAlive = false;
        this.checkGameOver();
      }
    });

    // Update blocks
    const blocksToProcess: Array<{ block: Block; id: string }> = [];
    this.state.blocks.forEach((block: Block, id: string) => {
      blocksToProcess.push({ block, id });
    });

    for (const { block, id } of blocksToProcess) {
      if (!block.isResting) {
        block.y += this.currentFallSpeed * dt;

        // Ground collision
        if (block.y > GAME_HEIGHT - BLOCK_SIZE / 2) {
          block.y = GAME_HEIGHT - BLOCK_SIZE / 2;
          block.isResting = true;
        }

        // Block-block collision
        this.state.blocks.forEach((other: Block, otherId: string) => {
          if (id === otherId || !other.isResting) return;

          const dx = Math.abs(block.x - other.x);
          const dy = block.y - other.y;

          if (dx < BLOCK_SIZE && dy > 0 && dy < BLOCK_SIZE) {
            block.y = other.y - BLOCK_SIZE;
            block.isResting = true;
            this.tryMergeBlocks(block);
          }
        });
      }
    }

    // Update lasers
    const lasersToDelete: string[] = [];
    this.state.lasers.forEach((laser: Laser, id: string) => {
      laser.x += laser.vx * dt;
      laser.y += laser.vy * dt;

      // Remove if off screen
      if (
        laser.x < -50 ||
        laser.x > GAME_WIDTH + 50 ||
        laser.y < -50 ||
        laser.y > GAME_HEIGHT + 50
      ) {
        lasersToDelete.push(id);
        return;
      }

      // Check collision with blocks
      this.state.blocks.forEach((block: Block) => {
        const dx = Math.abs(laser.x - block.x);
        const dy = Math.abs(laser.y - block.y);

        if (dx < BLOCK_SIZE / 2 + 8 && dy < BLOCK_SIZE / 2 + 4) {
          // Hit block - destroy cluster
          this.destroyCluster(block.clusterId, laser.ownerId);

          if (!laser.isPiercing) {
            lasersToDelete.push(id);
          }
        }
      });
    });
    lasersToDelete.forEach((id: string) => this.state.lasers.delete(id));

    // Update power-ups
    const powerUpsToDelete: string[] = [];
    this.state.powerUps.forEach((powerUp: PowerUp, id: string) => {
      powerUp.y += this.currentFallSpeed * 0.7 * dt;

      // Remove if off screen
      if (powerUp.y > GAME_HEIGHT + 50) {
        powerUpsToDelete.push(id);
        return;
      }

      // Check collision with players
      this.state.players.forEach((player: Player) => {
        if (!player.isAlive) return;

        const dx = Math.abs(powerUp.x - player.x);
        const dy = Math.abs(powerUp.y - player.y);

        if (dx < 30 && dy < 30) {
          this.applyPowerUp(player, powerUp.powerUpType);
          powerUpsToDelete.push(id);
        }
      });
    });
    powerUpsToDelete.forEach((id: string) => this.state.powerUps.delete(id));

    // Increase difficulty over time
    const minutes = this.state.gameTime / 60;
    this.currentFallSpeed = BLOCK_FALL_SPEED + minutes * 10;
  }

  private handleInput(playerId: string, input: PlayerInput): void {
    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return;

    // Movement
    if (input.left) {
      player.vx = -BAMSTER_SPEED;
      player.facingRight = false;
    } else if (input.right) {
      player.vx = BAMSTER_SPEED;
      player.facingRight = true;
    } else {
      player.vx = 0;
    }

    // Jump (simplified ground check)
    if (input.jump && player.y >= GAME_HEIGHT - 60) {
      player.vy = BAMSTER_JUMP_VELOCITY * player.jumpPower;
    }

    // Shoot
    if (input.shoot) {
      const now = Date.now();
      const lastShoot = this.lastShootTime.get(playerId) || 0;
      const cooldown = player.weaponType === 'rapid' ? 100 : 300;

      if (now - lastShoot > cooldown) {
        this.shoot(player);
        this.lastShootTime.set(playerId, now);
      }
    }
  }

  private shoot(player: Player): void {
    const direction = player.facingRight ? 1 : -1;
    const offsetX = player.facingRight ? 24 : -24;

    const createLaser = (angle: number): void => {
      const laser = new Laser();
      laser.id = `laser_${this.laserIdCounter++}`;
      laser.x = player.x + offsetX;
      laser.y = player.y;
      laser.ownerId = player.id;
      laser.isPiercing = player.weaponType === 'piercing';

      const angleRad = (angle * Math.PI) / 180;
      laser.vx = Math.cos(angleRad) * LASER_SPEED * direction;
      laser.vy = Math.sin(angleRad) * LASER_SPEED * (direction > 0 ? 1 : -1);

      this.state.lasers.set(laser.id, laser);
    };

    if (player.weaponType === 'spread') {
      createLaser(-15);
      createLaser(0);
      createLaser(15);
    } else {
      createLaser(0);
    }
  }

  private spawnBlock(): void {
    if (!this.state.isRunning) return;

    const gridColumns = Math.floor(GAME_WIDTH / BLOCK_SIZE);
    const column = Math.floor(Math.random() * gridColumns);
    const x = column * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = -BLOCK_SIZE;

    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      this.spawnPowerUp(x, y);
    } else {
      const block = new Block();
      block.id = `block_${this.blockIdCounter++}`;
      block.x = x;
      block.y = y;
      block.color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
      block.clusterId = block.id;

      this.state.blocks.set(block.id, block);
    }
  }

  private spawnPowerUp(x: number, y: number): void {
    const types = ['corn', 'sneakers', 'rapid', 'spread', 'piercing'];
    const powerUp = new PowerUp();
    powerUp.id = `powerup_${this.powerUpIdCounter++}`;
    powerUp.x = x;
    powerUp.y = y;
    powerUp.powerUpType = types[Math.floor(Math.random() * types.length)];

    this.state.powerUps.set(powerUp.id, powerUp);
  }

  private applyPowerUp(player: Player, type: string): void {
    switch (type) {
      case 'corn':
        player.health += 1;
        break;
      case 'sneakers':
        player.jumpPower = 1.5;
        // Reset after duration (simplified)
        setTimeout(() => {
          if (player.isAlive) player.jumpPower = 1;
        }, 30000);
        break;
      case 'rapid':
      case 'spread':
      case 'piercing':
        player.weaponType = type;
        setTimeout(() => {
          if (player.isAlive) player.weaponType = 'basic';
        }, 30000);
        break;
    }
  }

  private tryMergeBlocks(block: Block): void {
    const restingBlocks: Block[] = [];
    this.state.blocks.forEach((b: Block) => {
      if (b.isResting && b.id !== block.id) {
        restingBlocks.push(b);
      }
    });

    const adjacent = restingBlocks.filter((other: Block) => {
      if (other.color !== block.color) return false;
      const dx = Math.abs(other.x - block.x);
      const dy = Math.abs(other.y - block.y);
      return dx <= BLOCK_SIZE && dy <= BLOCK_SIZE;
    });

    if (adjacent.length > 0) {
      let targetClusterId = block.clusterId;
      for (const other of adjacent) {
        if (other.clusterId < targetClusterId) {
          targetClusterId = other.clusterId;
        }
      }

      block.clusterId = targetClusterId;
      for (const other of adjacent) {
        const oldClusterId = other.clusterId;
        restingBlocks.forEach((b: Block) => {
          if (b.clusterId === oldClusterId) {
            b.clusterId = targetClusterId;
          }
        });
      }
    }
  }

  private destroyCluster(clusterId: string, shooterId: string): void {
    const blocksInCluster: Array<{ id: string; block: Block }> = [];
    this.state.blocks.forEach((block: Block, id: string) => {
      if (block.clusterId === clusterId) {
        blocksInCluster.push({ id, block });
      }
    });

    const count = blocksInCluster.length;
    const score = count * SCORE_PER_BLOCK + (count > 1 ? count * 5 : 0);

    // Award score
    const shooter = this.state.players.get(shooterId);
    if (shooter) {
      shooter.score += score;
    }

    // Remove blocks
    blocksInCluster.forEach(({ id }) => {
      this.state.blocks.delete(id);
    });
  }

  private checkGameOver(): void {
    const alivePlayers: Player[] = [];
    this.state.players.forEach((player: Player) => {
      if (player.isAlive) {
        alivePlayers.push(player);
      }
    });

    if (alivePlayers.length <= 1) {
      this.endGame(alivePlayers[0]?.id);
    }
  }

  private endGame(winnerId?: string): void {
    this.state.isRunning = false;
    this.state.isGameOver = true;
    this.state.winnerId = winnerId || '';
    this.stopGameLoop();
  }

  private restartGame(): void {
    this.state.players.forEach((player: Player) => {
      player.isReady = false;
    });
    this.state.isGameOver = false;
    this.broadcast('restart');
  }
}
