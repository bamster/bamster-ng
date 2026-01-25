import { getAchievements } from './AchievementManager';
import { ACHIEVEMENT_IDS } from '../data/achievements';
import type { PowerUpType } from '@bamster/shared';

/**
 * Session stats - reset each game
 */
interface SessionStats {
  blocksDestroyed: number;
  shotsFired: number;
  powerUpsCollected: number;
  powerUpTypesCollected: Set<PowerUpType>;
  maxCombo: number;
  timePlayed: number; // milliseconds
  damageTaken: number;
  lowHealthTime: number; // time spent at 1 HP in milliseconds
  eventsCompleted: Set<string>;
  blocksDestroyedDuringEvent: Map<string, number>;
  startingHealth: number;
}

/**
 * Lifetime stats - persisted across games
 */
interface LifetimeStats {
  totalBlocksDestroyed: number;
  totalScore: number;
  highScore: number;
  gamesPlayed: number;
}

const LIFETIME_STORAGE_KEY = 'bamster_lifetime_stats';

/**
 * GameStats - Tracks game statistics and triggers achievements
 */
export class GameStats {
  private static instance: GameStats | null = null;

  private session: SessionStats;
  private lifetime: LifetimeStats;

  // Track accuracy for sniper achievement
  private shotsHit: number = 0;
  private consecutiveHits: number = 0;

  private constructor() {
    this.session = this.createEmptySession();
    this.lifetime = this.loadLifetimeStats();
  }

  static getInstance(): GameStats {
    if (!GameStats.instance) {
      GameStats.instance = new GameStats();
    }
    return GameStats.instance;
  }

  /**
   * Start a new game session
   */
  startSession(startingHealth: number): void {
    this.session = this.createEmptySession();
    this.session.startingHealth = startingHealth;
    this.shotsHit = 0;
    this.consecutiveHits = 0;
  }

  /**
   * End the current session and update lifetime stats
   */
  endSession(finalScore: number): void {
    // Update lifetime stats
    this.lifetime.totalBlocksDestroyed += this.session.blocksDestroyed;
    this.lifetime.totalScore += finalScore;
    this.lifetime.gamesPlayed++;

    if (finalScore > this.lifetime.highScore) {
      this.lifetime.highScore = finalScore;
    }

    this.saveLifetimeStats();

    // Check lifetime achievements
    this.checkLifetimeAchievements();

    // Check untouchable achievement (no damage taken)
    if (this.session.damageTaken === 0 && this.session.timePlayed > 60000) {
      getAchievements().unlock(ACHIEVEMENT_IDS.UNTOUCHABLE);
    }
  }

  /**
   * Record a block being destroyed
   */
  recordBlockDestroyed(): void {
    this.session.blocksDestroyed++;
    this.shotsHit++;
    this.consecutiveHits++;

    const achievements = getAchievements();

    // First Blood
    if (this.session.blocksDestroyed === 1) {
      achievements.unlock(ACHIEVEMENT_IDS.FIRST_BLOOD);
    }

    // Check sniper: 10 hits with 10 shots
    if (this.consecutiveHits >= 10 && this.session.shotsFired <= 10) {
      achievements.unlock(ACHIEVEMENT_IDS.SNIPER);
    }
  }

  /**
   * Record a shot being fired
   */
  recordShotFired(): void {
    this.session.shotsFired++;

    const achievements = getAchievements();

    // Trigger Happy - 100 shots
    if (this.session.shotsFired >= 100) {
      achievements.unlock(ACHIEVEMENT_IDS.TRIGGER_HAPPY);
    }

    // Spray and Pray - 500 shots
    if (this.session.shotsFired >= 500) {
      achievements.unlock(ACHIEVEMENT_IDS.SPRAY_AND_PRAY);
    }
  }

  /**
   * Record a shot missing (for accuracy tracking)
   */
  recordShotMissed(): void {
    this.consecutiveHits = 0;
  }

  /**
   * Record a power-up being collected
   */
  recordPowerUpCollected(type: PowerUpType): void {
    this.session.powerUpsCollected++;
    this.session.powerUpTypesCollected.add(type);

    const achievements = getAchievements();

    // Corn Fed - first power-up
    if (this.session.powerUpsCollected === 1) {
      achievements.unlock(ACHIEVEMENT_IDS.CORN_FED);
    }

    // Power Hungry - 10 power-ups
    if (this.session.powerUpsCollected >= 10) {
      achievements.unlock(ACHIEVEMENT_IDS.POWER_HUNGRY);
    }

    // Power Addict - 25 power-ups
    if (this.session.powerUpsCollected >= 25) {
      achievements.unlock(ACHIEVEMENT_IDS.POWER_ADDICT);
    }

    // Gotta Catch 'Em All - all 6 types
    const allTypes: PowerUpType[] = ['corn', 'sneakers', 'rapid', 'spread', 'piercing', 'bomb'];
    const hasAllTypes = allTypes.every((t) => this.session.powerUpTypesCollected.has(t));
    if (hasAllTypes) {
      achievements.unlock(ACHIEVEMENT_IDS.GOTTA_CATCH_EM_ALL);
    }
  }

  /**
   * Record score milestone
   */
  recordScore(score: number): void {
    const achievements = getAchievements();

    // Getting Started - 100 points
    if (score >= 100) {
      achievements.unlock(ACHIEVEMENT_IDS.GETTING_STARTED);
    }

    // Century - 1,000 points
    if (score >= 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.CENTURY);
    }

    // High Roller - 10,000 points
    if (score >= 10000) {
      achievements.unlock(ACHIEVEMENT_IDS.HIGH_ROLLER);
    }

    // Legendary - 100,000 points
    if (score >= 100000) {
      achievements.unlock(ACHIEVEMENT_IDS.LEGENDARY);
    }
  }

  /**
   * Record combo achieved
   */
  recordCombo(comboSize: number): void {
    if (comboSize > this.session.maxCombo) {
      this.session.maxCombo = comboSize;
    }

    const achievements = getAchievements();

    // Combo King - 5+ combo
    if (comboSize >= 5) {
      achievements.unlock(ACHIEVEMENT_IDS.COMBO_KING);
    }

    // Mega Combo - 10+ combo
    if (comboSize >= 10) {
      achievements.unlock(ACHIEVEMENT_IDS.MEGA_COMBO);
    }

    // Ultra Combo - 20+ combo
    if (comboSize >= 20) {
      achievements.unlock(ACHIEVEMENT_IDS.ULTRA_COMBO);
    }
  }

  /**
   * Update time played (call every frame with delta)
   */
  updateTimePlayed(delta: number, currentHealth: number): void {
    this.session.timePlayed += delta;

    // Track low health time
    if (currentHealth === 1) {
      this.session.lowHealthTime += delta;
    }

    const achievements = getAchievements();

    // Survivor - 5 minutes
    if (this.session.timePlayed >= 5 * 60 * 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.SURVIVOR);
    }

    // Marathon - 10 minutes
    if (this.session.timePlayed >= 10 * 60 * 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.MARATHON);
    }

    // Endurance - 20 minutes
    if (this.session.timePlayed >= 20 * 60 * 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.ENDURANCE);
    }

    // Close Call - 30 seconds at 1 HP
    if (this.session.lowHealthTime >= 30 * 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.CLOSE_CALL);
    }

    // Living Dangerously - 60 seconds at 1 HP
    if (this.session.lowHealthTime >= 60 * 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.LIVING_DANGEROUSLY);
    }

    // Pacifist - 1 minute without shooting
    if (this.session.timePlayed >= 60 * 1000 && this.session.shotsFired === 0) {
      achievements.unlock(ACHIEVEMENT_IDS.PACIFIST);
    }
  }

  /**
   * Record damage taken
   */
  recordDamageTaken(): void {
    this.session.damageTaken++;
  }

  /**
   * Record an event starting
   */
  recordEventStarted(eventId: string): void {
    // Initialize counter for this event
    if (!this.session.blocksDestroyedDuringEvent.has(eventId)) {
      this.session.blocksDestroyedDuringEvent.set(eventId, 0);
    }
  }

  /**
   * Record an event being completed
   */
  recordEventCompleted(eventId: string, tookDamage: boolean): void {
    this.session.eventsCompleted.add(eventId);

    const achievements = getAchievements();

    // Event Survivor - survive any event
    achievements.unlock(ACHIEVEMENT_IDS.EVENT_SURVIVOR);

    // Event Master - survive 10 different events
    if (this.session.eventsCompleted.size >= 10) {
      achievements.unlock(ACHIEVEMENT_IDS.EVENT_MASTER);
    }

    // Lava Dancer - survive Floor is Lava without damage
    if (eventId === 'floor_is_lava' && !tookDamage) {
      achievements.unlock(ACHIEVEMENT_IDS.LAVA_DANCER);
    }

    // Ghost Hunter - destroy 20 blocks during Ghost Blocks
    const ghostBlocksDestroyed = this.session.blocksDestroyedDuringEvent.get('ghost_blocks') || 0;
    if (eventId === 'ghost_blocks' && ghostBlocksDestroyed >= 20) {
      achievements.unlock(ACHIEVEMENT_IDS.GHOST_HUNTER);
    }
  }

  /**
   * Record block destroyed during an active event
   */
  recordBlockDestroyedDuringEvent(eventId: string): void {
    const current = this.session.blocksDestroyedDuringEvent.get(eventId) || 0;
    this.session.blocksDestroyedDuringEvent.set(eventId, current + 1);
  }

  /**
   * Get session stats (for display)
   */
  getSessionStats(): Readonly<SessionStats> {
    return this.session;
  }

  /**
   * Get lifetime stats (for display)
   */
  getLifetimeStats(): Readonly<LifetimeStats> {
    return this.lifetime;
  }

  private createEmptySession(): SessionStats {
    return {
      blocksDestroyed: 0,
      shotsFired: 0,
      powerUpsCollected: 0,
      powerUpTypesCollected: new Set(),
      maxCombo: 0,
      timePlayed: 0,
      damageTaken: 0,
      lowHealthTime: 0,
      eventsCompleted: new Set(),
      blocksDestroyedDuringEvent: new Map(),
      startingHealth: 3,
    };
  }

  private loadLifetimeStats(): LifetimeStats {
    try {
      const stored = localStorage.getItem(LIFETIME_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load lifetime stats:', e);
    }

    return {
      totalBlocksDestroyed: 0,
      totalScore: 0,
      highScore: 0,
      gamesPlayed: 0,
    };
  }

  private saveLifetimeStats(): void {
    try {
      localStorage.setItem(LIFETIME_STORAGE_KEY, JSON.stringify(this.lifetime));
    } catch (e) {
      console.warn('Failed to save lifetime stats:', e);
    }
  }

  private checkLifetimeAchievements(): void {
    const achievements = getAchievements();

    // Block Buster - 100 blocks total
    if (this.lifetime.totalBlocksDestroyed >= 100) {
      achievements.unlock(ACHIEVEMENT_IDS.BLOCK_BUSTER);
    }

    // Destroyer - 1,000 blocks total
    if (this.lifetime.totalBlocksDestroyed >= 1000) {
      achievements.unlock(ACHIEVEMENT_IDS.DESTROYER);
    }

    // Annihilator - 10,000 blocks total
    if (this.lifetime.totalBlocksDestroyed >= 10000) {
      achievements.unlock(ACHIEVEMENT_IDS.ANNIHILATOR);
    }
  }
}

/**
 * Convenience function to get the GameStats instance
 */
export function getGameStats(): GameStats {
  return GameStats.getInstance();
}
