# BAMster
<img width="800" height="600" alt="bamster-screenshot-2026-01-25T21-13-56-448Z" src="https://github.com/user-attachments/assets/f9a1b242-08a1-4d90-8ce6-55f245dc113e" />
<img width="800" height="600" alt="bamster-screenshot-2026-01-25T21-11-24-955Z" src="https://github.com/user-attachments/assets/2eaeb093-ea42-44ed-a091-c54cbdf96602" />

A Tetris-meets-platformer game where BAMster (a hamster with a laser pistol) jumps between falling colorful blocks and shoots them. Supports single-player, local multiplayer, and online multiplayer.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build shared package (required first time)
pnpm --filter @bamster/shared build

# Start the game
pnpm dev
```

Open http://localhost:3000 in your browser.

## Game Controls

### Player 1
| Action | Keys |
|--------|------|
| Move | Arrow Keys or A/D |
| Jump | Space, W, or Up Arrow |
| Shoot | Z or Left Click |

### Player 2 (Local Multiplayer)
| Action | Keys |
|--------|------|
| Move | J/L |
| Jump | I |
| Shoot | U |

## Gameplay

- **Blocks** fall from the sky and stack up
- **Jump** on landed blocks to stay alive (falling blocks hurt!)
- **Shoot** blocks to destroy them and earn points
- **Same-color blocks** that touch merge together - destroying one destroys the entire cluster for bonus points
- **Collect power-ups** that occasionally fall:
  - 🌽 **Corn** - Extra health (permanent)
  - 👟 **Sneakers** - Jump boost (30 sec)
  - 🔫 **Rapid Fire** - Faster shooting (30 sec)
  - 🔫 **Spread Shot** - 3-way shot (30 sec)
  - 🔫 **Piercing** - Laser goes through blocks (30 sec)

## Game Modes

- **Single Player** - Survive as long as possible, beat your high score
- **Local Multiplayer** - Two players on one keyboard, last one standing wins
- **Online Play** - Coming soon (server infrastructure ready)

## Project Structure

```
bamster/
├── packages/
│   ├── client/          # Phaser 3 game (Vite + TypeScript)
│   │   └── src/
│   │       ├── scenes/      # BootScene, MenuScene, GameScene, GameOverScene
│   │       ├── entities/    # Bamster, Block, Laser, PowerUp
│   │       └── systems/     # BlockSpawner, InputManager, NetworkManager
│   ├── server/          # Colyseus multiplayer server
│   │   └── src/
│   │       ├── rooms/       # GameRoom
│   │       └── schema/      # GameState (synchronized state)
│   └── shared/          # Shared types and constants
└── package.json         # Workspace root
```

## Development

```bash
# Start client dev server
pnpm dev

# Start multiplayer server
pnpm dev:server

# Start both in parallel
pnpm dev:all

# Type check all packages
pnpm typecheck

# Build for production
pnpm build
```

## Deployment

### Build for Production

```bash
# Build shared package first (required)
pnpm --filter @bamster/shared build

# Build client
pnpm --filter @bamster/client build
```

Output will be in `packages/client/dist/`.

### Deploy to Static Hosting

The client builds to static files that can be hosted anywhere:

```bash
# Netlify
npx netlify deploy --dir=packages/client/dist --prod

# Vercel
cd packages/client && npx vercel --prod

# GitHub Pages
# Copy dist/ contents to gh-pages branch

# Any web server
scp -r packages/client/dist/* user@server:/var/www/html/
```

### Deploy Multiplayer Server

For online multiplayer, deploy the server to a Node.js host (Railway, Render, Fly.io):

1. Build: `pnpm --filter @bamster/server build`
2. Set the `PORT` environment variable
3. Update client's server URL in `packages/client/src/systems/NetworkManager.ts`

## Debug Mode

Press **F3** to enable debug mode, then:
- **F4**: Trigger "Floor is Lava" event
- **F5**: Trigger random event
- **F8**: Toggle invincibility (for screenshots/testing)

## Tech Stack

- **Game Engine**: [Phaser 3](https://phaser.io/)
- **Language**: TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Multiplayer**: [Colyseus](https://colyseus.io/)
- **Package Manager**: [pnpm](https://pnpm.io/) (monorepo)

## Configuration

Game constants can be adjusted in `packages/shared/src/constants.ts`:

- `GAME_WIDTH` / `GAME_HEIGHT` - Screen dimensions
- `GRAVITY` - Physics gravity
- `BAMSTER_SPEED` / `BAMSTER_JUMP_VELOCITY` - Player movement
- `BLOCK_FALL_SPEED` - How fast blocks fall
- `BLOCK_SPAWN_INTERVAL` - Time between block spawns
- `POWERUP_SPAWN_CHANCE` - Probability of power-up instead of block
- `POWERUP_DURATION` - How long timed power-ups last
