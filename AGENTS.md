# AI Agent Instructions

This document provides guidelines for AI agents working on the BAMster project.

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd update <id> --status in_progress` - Claim work
- `bd close <id>` - Complete work
- `bd sync` - Sync with git

**Priority levels:** 0-4 (0=critical, 2=medium, 4=backlog)

For full workflow details: `bd prime`

## Workflow

### Commit After Each Work Package

Always create a git commit after completing a work package or feature. A work package includes:

- Bug fixes
- New features
- Visual/UI changes
- Refactoring
- Configuration changes

Use descriptive commit messages that explain:
1. What was changed
2. Why it was changed (if not obvious)
3. Any known issues or limitations

### Commit Message Format

```
Short summary of changes (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
- Bullet points for multiple changes
- Note any known issues

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Project Structure

- `packages/client/` - Phaser 3 game (TypeScript)
- `packages/server/` - Colyseus multiplayer server
- `packages/shared/` - Shared types and constants

## Development Commands

```bash
# Install dependencies
pnpm install

# Run client dev server
pnpm --filter @bamster/client dev

# Run server
pnpm --filter @bamster/server dev

# Type check all packages
pnpm run typecheck

# Build shared package (required after changing constants/types)
pnpm --filter @bamster/shared build
```

## Important Notes

1. **Rebuild shared package** after modifying `packages/shared/src/` files
2. **Test changes** before committing when possible
3. **Keep the 80s retro aesthetic** - neon colors, monospace fonts, scanlines
4. **Use PLAY_AREA_WIDTH** (560px) for game logic, not GAME_WIDTH (800px)
5. **Block merging** - only horizontal/vertical neighbors, not diagonal

## Code Style

- TypeScript strict mode
- Phaser 3 arcade physics
- Monospace font for UI text
- Color palette defined in scene files (COLORS object)

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
