# Agent Workflow

This document describes workflows for autonomous agents.

- **Worker Agent**: Executes individual tasks
- **Supervisor Agent**: Coordinates multiple workers, handles escalations

---

# Worker Agent

## Work Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. READ CONTEXT                                        │
│     - Read CLAUDE.md for project instructions           │
│     - Run `bd prime` for beads workflow                 │
├─────────────────────────────────────────────────────────┤
│  2. GET TASK                                            │
│     - Run `bd ready` to find available work             │
│     - Pick highest priority unblocked task              │
│     - Run `bd show <id>` to read full details           │
├─────────────────────────────────────────────────────────┤
│  3. CLAIM TASK                                          │
│     - Run `bd update <id> --status in_progress`         │
│     - Only work on ONE task at a time                   │
├─────────────────────────────────────────────────────────┤
│  4. WORK ON TASK                                        │
│     - Implement the solution                            │
│     - Test your changes                                 │
│     - Follow code style in CLAUDE.md                    │
├─────────────────────────────────────────────────────────┤
│  5. COMPLETE OR ESCALATE                                │
│                                                         │
│  IF COMPLETED:                                          │
│     - Commit changes with descriptive message           │
│     - Run `bd close <id>`                               │
│     - Go to step 2                                      │
│                                                         │
│  IF BLOCKED (questions, unclear requirements, etc):     │
│     - Commit any partial progress                       │
│     - Add questions via `bd comments add <id> "..."`    │
│     - Add label: `bd label add <id> needs-supervisor`   │
│     - Run `bd update <id> --status open`                │
│     - Go to step 2                                      │
└─────────────────────────────────────────────────────────┘
```

## Quick Reference

```bash
# Find work
bd ready                              # Show unblocked tasks
bd show <id>                          # View task details

# Claim work
bd update <id> --status in_progress   # Start working

# Complete work
bd close <id>                         # Mark done
bd close <id> --reason "..."          # Mark done with note

# Escalate (blocked/needs help)
bd comments add <id> "Question: ..."  # Add your questions
bd label add <id> needs-supervisor    # Flag for review
bd update <id> --status open          # Release the task

# Never do
# - Work on multiple tasks simultaneously
# - Leave a task in_progress when stopping
# - Close a task that isn't fully done
```

## Commit Convention

After completing work, always commit:

```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
Short summary (50 chars or less)

- What was changed
- Why it was changed

Closes BAM-xxx

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Escalation Guidelines

Add `needs-supervisor` label when:
- Requirements are ambiguous or contradictory
- You need to make a significant design decision
- The task depends on external information you don't have
- You've tried multiple approaches and none work
- The task scope seems larger than described

Always document your questions clearly in comments before escalating.

---

# Supervisor Agent

The supervisor manages multiple worker agents running as background tasks.

## Supervisor Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. INITIALIZE                                          │
│     - Read CLAUDE.md and AGENT_WORKFLOW.md              │
│     - Run `bd prime` for beads context                  │
│     - Run `bd ready` to assess available work           │
│     - Decide how many workers to spawn (2-4 typical)    │
├─────────────────────────────────────────────────────────┤
│  2. SPAWN WORKERS                                       │
│     - Launch worker agents as background tasks          │
│     - Each worker follows the Worker Agent workflow     │
│     - Track task IDs for each spawned worker            │
├─────────────────────────────────────────────────────────┤
│  3. MONITOR LOOP (repeat until done)                    │
│                                                         │
│  a) Check worker status                                 │
│     - Read output files to check progress               │
│     - Identify completed or stuck workers               │
│                                                         │
│  b) Handle escalations                                  │
│     - Run `bd list --label needs-supervisor`            │
│     - Review questions in comments                      │
│     - Provide answers or clarify requirements           │
│     - Remove label and update bead with guidance        │
│                                                         │
│  c) Rebalance work                                      │
│     - Spawn new workers if capacity available           │
│     - Stop workers if priorities change                 │
│                                                         │
│  d) Sync progress                                       │
│     - Run `bd sync` periodically                        │
│     - Commit supervisor notes if needed                 │
├─────────────────────────────────────────────────────────┤
│  4. WRAP UP                                             │
│     - Wait for all workers to complete                  │
│     - Run `bd sync`                                     │
│     - Summarize progress to user                        │
└─────────────────────────────────────────────────────────┘
```

## Spawning Workers

Use the Task tool to spawn worker agents in background:

```
Task tool with:
  - subagent_type: "general-purpose"
  - run_in_background: true
  - prompt: "Follow AGENT_WORKFLOW.md worker loop. Work on beads tasks until none remain or you are blocked."
```

Track the returned task_id and output_file for each worker.

## Monitoring Workers

```bash
# Check worker output (non-blocking)
tail -50 <output_file>

# Or use TaskOutput tool with block=false

# Check beads status
bd list --status in_progress          # See what's being worked on
bd list --label needs-supervisor      # See escalations
bd stats                              # Overall progress
```

## Handling Escalations

When a worker adds `needs-supervisor`:

1. Read the bead: `bd show <id>`
2. Read comments: `bd comments list <id>`
3. Provide guidance:
   ```bash
   bd comments add <id> "SUPERVISOR: <your answer/clarification>"
   bd label remove <id> needs-supervisor
   ```
4. Optionally reassign or update priority

## Quick Reference

```bash
# See what workers are doing
bd list --status in_progress

# Find escalations
bd list --label needs-supervisor

# Answer escalation
bd comments add <id> "SUPERVISOR: ..."
bd label remove <id> needs-supervisor

# Check overall progress
bd stats
bd ready | wc -l                      # Remaining tasks

# Sync state
bd sync
```

## Conflict Resolution

If multiple workers might touch the same files:
- Assign related tasks to the same worker
- Use `bd dep add` to create blocking dependencies
- Review git status before final sync

## When to Intervene

The supervisor should step in when:
- A worker has been stuck for too long
- Multiple workers are blocked on the same issue
- Priority tasks are being ignored
- Conflicts arise between workers' changes
- A human user sends a message
