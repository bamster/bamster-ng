# BAMster TODO

## Completed ✅

### Phase 1: Project Setup
- [x] Initialize pnpm monorepo
- [x] Create client package with Vite + Phaser 3
- [x] Create server package with Colyseus
- [x] Create shared package for types/constants
- [x] Configure TypeScript for all packages

### Phase 2: Core Single-Player Game
- [x] BootScene - Asset loading and sprite generation
- [x] MenuScene - Title screen, mode selection
- [x] GameScene - Main gameplay loop
- [x] GameOverScene - Score display, restart
- [x] BAMster entity with physics (gravity, jumping, movement)
- [x] Block spawning system (random colors, falling)
- [x] Laser shooting mechanics
- [x] Collision detection (player↔blocks, laser↔blocks)
- [x] Score system (points for shooting blocks)
- [x] Game over conditions (fall off screen, get crushed)

### Phase 3: Game Mechanics
- [x] Block color matching and merging (clusters)
- [x] Combo scoring for merged blocks
- [x] Power-up base entity
- [x] Corn power-up (permanent health boost)
- [x] Sneakers power-up (timed jump boost)
- [x] Weapon upgrades (rapid, spread, piercing - timed)
- [x] Power-up spawning in BlockSpawner
- [x] Difficulty progression (faster blocks over time)

### Phase 4: Local Multiplayer
- [x] Second BAMster with separate controls (IJKL + U)
- [x] Independent scoring for each player
- [x] Multiplayer UI (P1/P2 scores)
- [x] Competitive rules (last standing wins)

### Phase 5: Online Multiplayer (Server)
- [x] GameRoom implementation on server
- [x] GameState schema with Colyseus sync
- [x] NetworkManager on client
- [x] Server-side game loop and physics

---

## In Progress 🚧

### Phase 5: Online Multiplayer (Client Integration)
- [ ] Connect client GameScene to NetworkManager for online mode
- [ ] Implement lobby/waiting room UI
- [ ] Show room code for private matches
- [ ] Handle disconnection gracefully

---

## TODO 📋

### Polish & Bug Fixes
- [ ] Add sound effects (jump, shoot, block destroy, power-up collect)
- [ ] Add background music
- [ ] Improve block-player collision (standing on blocks properly)
- [ ] Add particle effects for block destruction
- [ ] Add screen shake on big combos
- [ ] Fix edge case: blocks landing on player's head
- [ ] Tune physics values for better game feel

### Visual Improvements
- [ ] Load legacy BAMster sprites from original game
- [ ] Add animated sprites (idle, run, jump animations)
- [ ] Add background parallax layers
- [ ] Improve UI design (health bar, power-up indicators)
- [ ] Add combo counter display
- [ ] Add power-up timer indicators

### Gameplay Features
- [ ] Add pause menu (ESC key)
- [ ] Add settings menu (volume, controls)
- [ ] Add tutorial/how-to-play screen
- [ ] Add difficulty selection (easy/normal/hard)
- [ ] Add endless mode high score leaderboard
- [ ] Add achievements system

### Online Multiplayer
- [ ] Implement quick match matchmaking
- [ ] Add private room with room codes
- [ ] Add spectator mode
- [ ] Add chat/emotes
- [ ] Implement input prediction and reconciliation
- [ ] Add latency compensation
- [ ] Deploy server to cloud (Heroku/Railway/etc)

### Phase 6: Mobile
- [ ] Add Capacitor to project
- [ ] Implement virtual joystick (touch controls)
- [ ] Add touch button for shooting
- [ ] Test and optimize for different screen sizes
- [ ] Configure iOS build
- [ ] Configure Android build
- [ ] Handle mobile-specific input edge cases

### Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Add automated tests
- [ ] Configure production builds
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics

---

## Ideas for Future 💡

- **Power-up Ideas**
  - Shield - Temporary invincibility
  - Magnet - Attract nearby power-ups
  - Slow-mo - Slow down blocks temporarily
  - Bomb - Clear all blocks on screen

- **Game Modes**
  - Time Attack - Score as much as possible in 2 minutes
  - Puzzle Mode - Clear specific block patterns
  - Boss Mode - Fight a giant block boss
  - Co-op Mode - Work together to survive

- **Cosmetics**
  - Different BAMster skins
  - Custom laser colors
  - Block themes (neon, retro, pixel)

- **Social Features**
  - Friend list
  - Weekly challenges
  - Seasonal events
