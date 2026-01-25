/**
 * Achievement interface - defines the structure of an achievement
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number; // Timestamp when unlocked, undefined if locked
}

/**
 * Listener function type for achievement unlocks
 */
export type AchievementUnlockListener = (achievement: Achievement) => void;

/**
 * AchievementManager - Core achievement tracking system
 * Manages achievement definitions, unlock state, and persistence
 */
export class AchievementManager {
  private static instance: AchievementManager | null = null;
  private static readonly STORAGE_KEY = 'bamster_achievements';

  private achievements: Map<string, Achievement> = new Map();
  private listeners: Set<AchievementUnlockListener> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AchievementManager {
    if (!AchievementManager.instance) {
      AchievementManager.instance = new AchievementManager();
    }
    return AchievementManager.instance;
  }

  /**
   * Register an achievement definition
   * @param achievement The achievement to register
   */
  registerAchievement(achievement: Omit<Achievement, 'unlockedAt'>): void {
    // Don't overwrite if already registered (preserves unlock state)
    if (this.achievements.has(achievement.id)) {
      return;
    }

    this.achievements.set(achievement.id, {
      ...achievement,
      unlockedAt: undefined,
    });
  }

  /**
   * Register multiple achievements at once
   * @param achievements Array of achievements to register
   */
  registerAchievements(achievements: Omit<Achievement, 'unlockedAt'>[]): void {
    achievements.forEach((a) => this.registerAchievement(a));
  }

  /**
   * Unlock an achievement by ID
   * @param id The achievement ID to unlock
   * @returns true if newly unlocked, false if already unlocked or not found
   */
  unlock(id: string): boolean {
    const achievement = this.achievements.get(id);

    if (!achievement) {
      console.warn(`Achievement not found: ${id}`);
      return false;
    }

    // Already unlocked
    if (achievement.unlockedAt !== undefined) {
      return false;
    }

    // Unlock the achievement
    achievement.unlockedAt = Date.now();
    this.saveToStorage();

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(achievement);
      } catch (e) {
        console.error('Achievement listener error:', e);
      }
    });

    console.log(`Achievement unlocked: ${achievement.name}`);
    return true;
  }

  /**
   * Check if an achievement is unlocked
   * @param id The achievement ID to check
   * @returns true if unlocked, false otherwise
   */
  isUnlocked(id: string): boolean {
    const achievement = this.achievements.get(id);
    return achievement?.unlockedAt !== undefined;
  }

  /**
   * Get all registered achievements
   * @returns Array of all achievements (both locked and unlocked)
   */
  getAll(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get all unlocked achievements
   * @returns Array of unlocked achievements, sorted by unlock time
   */
  getUnlocked(): Achievement[] {
    return this.getAll()
      .filter((a) => a.unlockedAt !== undefined)
      .sort((a, b) => (a.unlockedAt || 0) - (b.unlockedAt || 0));
  }

  /**
   * Get all locked achievements
   * @returns Array of locked achievements
   */
  getLocked(): Achievement[] {
    return this.getAll().filter((a) => a.unlockedAt === undefined);
  }

  /**
   * Get a specific achievement by ID
   * @param id The achievement ID
   * @returns The achievement or undefined if not found
   */
  get(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  /**
   * Get achievement progress stats
   * @returns Object with total, unlocked, and locked counts
   */
  getProgress(): { total: number; unlocked: number; locked: number } {
    const all = this.getAll();
    const unlocked = all.filter((a) => a.unlockedAt !== undefined).length;
    return {
      total: all.length,
      unlocked,
      locked: all.length - unlocked,
    };
  }

  /**
   * Add a listener for achievement unlocks
   * @param listener Function to call when an achievement is unlocked
   * @returns Function to remove the listener
   */
  onUnlock(listener: AchievementUnlockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove all unlock listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Reset all achievements (for testing or new game+)
   */
  reset(): void {
    this.achievements.forEach((achievement) => {
      achievement.unlockedAt = undefined;
    });
    this.saveToStorage();
  }

  /**
   * Load unlocked achievements from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(AchievementManager.STORAGE_KEY);
      if (stored) {
        const unlocked: Record<string, number> = JSON.parse(stored);
        // Apply unlocked timestamps to registered achievements
        Object.entries(unlocked).forEach(([id, timestamp]) => {
          const achievement = this.achievements.get(id);
          if (achievement) {
            achievement.unlockedAt = timestamp;
          } else {
            // Store for later when achievement is registered
            this.achievements.set(id, {
              id,
              name: '',
              description: '',
              icon: '',
              unlockedAt: timestamp,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load achievements from storage:', e);
    }
  }

  /**
   * Save unlocked achievements to localStorage
   */
  private saveToStorage(): void {
    try {
      const unlocked: Record<string, number> = {};
      this.achievements.forEach((achievement, id) => {
        if (achievement.unlockedAt !== undefined) {
          unlocked[id] = achievement.unlockedAt;
        }
      });
      localStorage.setItem(AchievementManager.STORAGE_KEY, JSON.stringify(unlocked));
    } catch (e) {
      console.warn('Failed to save achievements to storage:', e);
    }
  }
}

/**
 * Convenience function to get the AchievementManager instance
 */
export function getAchievements(): AchievementManager {
  return AchievementManager.getInstance();
}
