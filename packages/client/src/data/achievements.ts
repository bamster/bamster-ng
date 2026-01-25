import type { Achievement } from '../systems/AchievementManager';

/**
 * All achievement definitions for BAMster
 * Achievements are grouped by category for organization
 */

// Beginner achievements - easy to unlock, teaches basic mechanics
export const BEGINNER_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Destroy your first block',
    icon: '🎯',
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Reach 100 points',
    icon: '🌟',
  },
  {
    id: 'corn_fed',
    name: 'Corn Fed',
    description: 'Collect your first power-up',
    icon: '🌽',
  },
];

// Progress achievements - milestone-based rewards
export const PROGRESS_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'century',
    name: 'Century',
    description: 'Reach 1,000 points',
    icon: '💯',
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Reach 10,000 points',
    icon: '💰',
  },
  {
    id: 'legendary',
    name: 'Legendary',
    description: 'Reach 100,000 points',
    icon: '👑',
  },
  {
    id: 'block_buster',
    name: 'Block Buster',
    description: 'Destroy 100 blocks total',
    icon: '🧱',
  },
  {
    id: 'destroyer',
    name: 'Destroyer',
    description: 'Destroy 1,000 blocks total',
    icon: '💥',
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    description: 'Destroy 10,000 blocks total',
    icon: '☠️',
  },
];

// Skill achievements - require mastery of game mechanics
export const SKILL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Get a 5+ block combo',
    icon: '🔥',
  },
  {
    id: 'mega_combo',
    name: 'Mega Combo',
    description: 'Get a 10+ block combo',
    icon: '⚡',
  },
  {
    id: 'ultra_combo',
    name: 'Ultra Combo',
    description: 'Get a 20+ block combo',
    icon: '🌈',
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive for 5 minutes',
    icon: '⏱️',
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Survive for 10 minutes',
    icon: '🏃',
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Survive for 20 minutes',
    icon: '🏆',
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Complete a game without losing a life',
    icon: '🛡️',
  },
];

// Collection achievements - collect power-ups
export const COLLECTION_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'power_hungry',
    name: 'Power Hungry',
    description: 'Collect 10 power-ups in one game',
    icon: '🔋',
  },
  {
    id: 'power_addict',
    name: 'Power Addict',
    description: 'Collect 25 power-ups in one game',
    icon: '⚡',
  },
  {
    id: 'gotta_catch_em_all',
    name: "Gotta Catch 'Em All",
    description: 'Collect every power-up type in one game',
    icon: '🎁',
  },
];

// Fun/challenge achievements - quirky or difficult
export const FUN_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'close_call',
    name: 'Close Call',
    description: 'Survive with 1 HP for 30 seconds',
    icon: '😰',
  },
  {
    id: 'living_dangerously',
    name: 'Living Dangerously',
    description: 'Survive with 1 HP for 60 seconds',
    icon: '💀',
  },
  {
    id: 'pacifist',
    name: 'Pacifist',
    description: 'Survive 1 minute without shooting',
    icon: '☮️',
  },
  {
    id: 'trigger_happy',
    name: 'Trigger Happy',
    description: 'Fire 100 shots in one game',
    icon: '🔫',
  },
  {
    id: 'spray_and_pray',
    name: 'Spray and Pray',
    description: 'Fire 500 shots in one game',
    icon: '💨',
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'Destroy 10 blocks with 10 shots (100% accuracy)',
    icon: '🎯',
  },
];

// Event achievements - related to game events
export const EVENT_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'event_survivor',
    name: 'Event Survivor',
    description: 'Survive any game event',
    icon: '🌪️',
  },
  {
    id: 'event_master',
    name: 'Event Master',
    description: 'Survive 10 different events',
    icon: '🎭',
  },
  {
    id: 'lava_dancer',
    name: 'Lava Dancer',
    description: 'Survive the Floor is Lava event without taking damage',
    icon: '🌋',
  },
  {
    id: 'ghost_hunter',
    name: 'Ghost Hunter',
    description: 'Destroy 20 blocks during Ghost Blocks event',
    icon: '👻',
  },
];

/**
 * All achievements combined
 */
export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  ...BEGINNER_ACHIEVEMENTS,
  ...PROGRESS_ACHIEVEMENTS,
  ...SKILL_ACHIEVEMENTS,
  ...COLLECTION_ACHIEVEMENTS,
  ...FUN_ACHIEVEMENTS,
  ...EVENT_ACHIEVEMENTS,
];

/**
 * Achievement IDs for easy reference
 */
export const ACHIEVEMENT_IDS = {
  // Beginner
  FIRST_BLOOD: 'first_blood',
  GETTING_STARTED: 'getting_started',
  CORN_FED: 'corn_fed',

  // Progress
  CENTURY: 'century',
  HIGH_ROLLER: 'high_roller',
  LEGENDARY: 'legendary',
  BLOCK_BUSTER: 'block_buster',
  DESTROYER: 'destroyer',
  ANNIHILATOR: 'annihilator',

  // Skill
  COMBO_KING: 'combo_king',
  MEGA_COMBO: 'mega_combo',
  ULTRA_COMBO: 'ultra_combo',
  SURVIVOR: 'survivor',
  MARATHON: 'marathon',
  ENDURANCE: 'endurance',
  UNTOUCHABLE: 'untouchable',

  // Collection
  POWER_HUNGRY: 'power_hungry',
  POWER_ADDICT: 'power_addict',
  GOTTA_CATCH_EM_ALL: 'gotta_catch_em_all',

  // Fun
  CLOSE_CALL: 'close_call',
  LIVING_DANGEROUSLY: 'living_dangerously',
  PACIFIST: 'pacifist',
  TRIGGER_HAPPY: 'trigger_happy',
  SPRAY_AND_PRAY: 'spray_and_pray',
  SNIPER: 'sniper',

  // Events
  EVENT_SURVIVOR: 'event_survivor',
  EVENT_MASTER: 'event_master',
  LAVA_DANCER: 'lava_dancer',
  GHOST_HUNTER: 'ghost_hunter',
} as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[keyof typeof ACHIEVEMENT_IDS];
