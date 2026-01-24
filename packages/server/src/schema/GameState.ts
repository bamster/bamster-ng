import { Schema, MapSchema, type } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('number') score: number = 0;
  @type('number') health: number = 1;
  @type('number') jumpPower: number = 1;
  @type('string') weaponType: string = 'basic';
  @type('boolean') isAlive: boolean = true;
  @type('boolean') facingRight: boolean = true;
  @type('boolean') isReady: boolean = false;
}

export class Block extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('string') color: string = '';
  @type('string') clusterId: string = '';
  @type('boolean') isResting: boolean = false;
}

export class PowerUp extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('string') powerUpType: string = '';
}

export class Laser extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') vx: number = 0;
  @type('number') vy: number = 0;
  @type('string') ownerId: string = '';
  @type('boolean') isPiercing: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Block }) blocks = new MapSchema<Block>();
  @type({ map: PowerUp }) powerUps = new MapSchema<PowerUp>();
  @type({ map: Laser }) lasers = new MapSchema<Laser>();
  @type('number') gameTime: number = 0;
  @type('boolean') isRunning: boolean = false;
  @type('boolean') isGameOver: boolean = false;
  @type('string') winnerId: string = '';
}
