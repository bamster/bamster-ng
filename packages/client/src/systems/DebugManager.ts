/**
 * Debug Mode Manager
 *
 * Manages debug mode state with support for:
 * - URL parameter: ?debug=true
 * - F3 keyboard toggle
 * - localStorage persistence
 * - Event-based state updates for reactive UI
 */

import { getGameSettings } from '../scenes/SettingsScene';

// Singleton instance
let debugManager: DebugManager | null = null;

export class DebugManager {
  private _debugMode: boolean = false;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    // Check URL parameter first (takes precedence)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('debug') === 'true') {
        this._debugMode = true;
        return;
      }
    }

    // Otherwise, load from settings
    this._debugMode = getGameSettings().debugMode;
  }

  get isEnabled(): boolean {
    return this._debugMode;
  }

  toggle(): boolean {
    this._debugMode = !this._debugMode;
    this.saveToSettings();
    this.notifyListeners();
    return this._debugMode;
  }

  enable(): void {
    if (!this._debugMode) {
      this._debugMode = true;
      this.saveToSettings();
      this.notifyListeners();
    }
  }

  disable(): void {
    if (this._debugMode) {
      this._debugMode = false;
      this.saveToSettings();
      this.notifyListeners();
    }
  }

  /** Subscribe to debug mode changes */
  subscribe(callback: (enabled: boolean) => void): () => void {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this._debugMode));
  }

  private saveToSettings(): void {
    try {
      const settings = getGameSettings();
      settings.debugMode = this._debugMode;
      localStorage.setItem('bamster_settings', JSON.stringify(settings));
    } catch {
      // Ignore localStorage errors
    }
  }
}

/** Get or create the singleton DebugManager instance */
export function getDebugManager(): DebugManager {
  if (!debugManager) {
    debugManager = new DebugManager();
  }
  return debugManager;
}

/** Quick helper to check if debug mode is enabled */
export function isDebugMode(): boolean {
  return getDebugManager().isEnabled;
}
