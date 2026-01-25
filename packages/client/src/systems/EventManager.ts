import Phaser from 'phaser';

/**
 * Event interface - defines the structure of a game event
 */
export interface GameEvent {
  /** Unique identifier for the event */
  id: string;
  /** Display name (e.g., "DOUBLE POINTS") */
  name: string;
  /** Optional emoji/icon prefix */
  icon?: string;
  /** Duration in milliseconds */
  duration: number;
  /** Called when event starts */
  onStart: (scene: Phaser.Scene) => void;
  /** Called when event ends */
  onEnd: (scene: Phaser.Scene) => void;
  /** Called every frame while event is active (optional) */
  onUpdate?: (scene: Phaser.Scene, delta: number) => void;
}

/**
 * EventManager - handles random game events that temporarily change gameplay
 *
 * Usage:
 *   const eventManager = new EventManager(scene);
 *   eventManager.registerEvent({ ... });
 *   eventManager.start();
 *   // In update loop: eventManager.update(delta);
 */
export class EventManager {
  private scene: Phaser.Scene;
  private events: Map<string, GameEvent> = new Map();
  private enabledEvents: Set<string> = new Set();

  // Current event state
  private activeEvent: GameEvent | null = null;
  private eventStartTime: number = 0;
  private eventEndTime: number = 0;

  // Timing configuration
  private minTimeBetweenEvents: number = 15000; // 15 seconds minimum between events
  private maxTimeBetweenEvents: number = 45000; // 45 seconds maximum
  private nextEventTime: number = 0;

  // Running state
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // UI elements
  private uiContainer?: Phaser.GameObjects.Container;
  private eventNameText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerBarWidth: number = 200;
  private timerBarHeight: number = 8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Register a new event type
   */
  registerEvent(event: GameEvent): void {
    this.events.set(event.id, event);
    // Events are enabled by default when registered
    this.enabledEvents.add(event.id);
  }

  /**
   * Enable a specific event type
   */
  enableEvent(eventId: string): void {
    if (this.events.has(eventId)) {
      this.enabledEvents.add(eventId);
    }
  }

  /**
   * Disable a specific event type
   */
  disableEvent(eventId: string): void {
    this.enabledEvents.delete(eventId);
  }

  /**
   * Check if an event is enabled
   */
  isEventEnabled(eventId: string): boolean {
    return this.enabledEvents.has(eventId);
  }

  /**
   * Get list of all registered events
   */
  getRegisteredEvents(): GameEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Set timing configuration
   */
  setTiming(minTime: number, maxTime: number): void {
    this.minTimeBetweenEvents = minTime;
    this.maxTimeBetweenEvents = maxTime;
  }

  /**
   * Create UI elements for displaying active event
   */
  createUI(x: number, y: number): void {
    this.uiContainer = this.scene.add.container(x, y);
    this.uiContainer.setDepth(50);

    // Event name text (hidden by default)
    this.eventNameText = this.scene.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.eventNameText.setOrigin(0.5, 0);
    this.eventNameText.setVisible(false);
    this.uiContainer.add(this.eventNameText);

    // Timer bar background
    this.timerBar = this.scene.add.graphics();
    this.timerBar.setVisible(false);
    this.uiContainer.add(this.timerBar);

    // Countdown text
    this.countdownText = this.scene.add.text(0, 30, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.countdownText.setOrigin(0.5, 0);
    this.countdownText.setVisible(false);
    this.uiContainer.add(this.countdownText);
  }

  /**
   * Start the event system
   */
  start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextEvent();
  }

  /**
   * Stop the event system
   */
  stop(): void {
    this.isRunning = false;

    // End any active event
    if (this.activeEvent) {
      this.endCurrentEvent();
    }
  }

  /**
   * Pause the event system (keeps current event active but frozen)
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the event system
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Schedule the next random event
   */
  private scheduleNextEvent(): void {
    const delay = Phaser.Math.Between(
      this.minTimeBetweenEvents,
      this.maxTimeBetweenEvents
    );
    this.nextEventTime = this.scene.time.now + delay;
  }

  /**
   * Get currently active event (if any)
   */
  getActiveEvent(): GameEvent | null {
    return this.activeEvent;
  }

  /**
   * Get remaining time for current event (0 if no event)
   */
  getRemainingTime(): number {
    if (!this.activeEvent) return 0;
    return Math.max(0, this.eventEndTime - this.scene.time.now);
  }

  /**
   * Get remaining fraction (0-1) for current event
   */
  getRemainingFraction(): number {
    if (!this.activeEvent) return 0;
    const total = this.activeEvent.duration;
    const remaining = this.getRemainingTime();
    return remaining / total;
  }

  /**
   * Force start a specific event (useful for testing)
   */
  forceStartEvent(eventId: string): void {
    const event = this.events.get(eventId);
    if (event) {
      this.startEvent(event);
    }
  }

  /**
   * Start an event
   */
  private startEvent(event: GameEvent): void {
    // End any current event first
    if (this.activeEvent) {
      this.endCurrentEvent();
    }

    this.activeEvent = event;
    this.eventStartTime = this.scene.time.now;
    this.eventEndTime = this.eventStartTime + event.duration;

    // Show announcement
    this.showEventAnnouncement(event);

    // Show UI
    this.updateUI();

    // Call event's onStart
    event.onStart(this.scene);
  }

  /**
   * End the current event
   */
  private endCurrentEvent(): void {
    if (!this.activeEvent) return;

    // Call event's onEnd
    this.activeEvent.onEnd(this.scene);

    // Show end announcement
    this.showEventEndAnnouncement();

    // Clear active event
    this.activeEvent = null;

    // Hide UI
    this.hideUI();

    // Schedule next event
    if (this.isRunning) {
      this.scheduleNextEvent();
    }
  }

  /**
   * Show event start announcement
   */
  private showEventAnnouncement(event: GameEvent): void {
    const displayText = event.icon ? `${event.icon} ${event.name}` : event.name;

    // Create announcement text in center of play area
    const announcement = this.scene.add.text(280, 200, displayText, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
    });
    announcement.setOrigin(0.5);
    announcement.setDepth(100);

    // Animate in
    announcement.setScale(0);
    this.scene.tweens.add({
      targets: announcement,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold for a moment, then fade out
        this.scene.time.delayedCall(1500, () => {
          this.scene.tweens.add({
            targets: announcement,
            alpha: 0,
            y: announcement.y - 30,
            duration: 500,
            onComplete: () => announcement.destroy(),
          });
        });
      },
    });

    // Play sound effect (if available)
    // getSound().play('event_start');
  }

  /**
   * Show event end announcement
   */
  private showEventEndAnnouncement(): void {
    const announcement = this.scene.add.text(280, 200, 'EVENT ENDED', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#888888',
      stroke: '#000000',
      strokeThickness: 3,
    });
    announcement.setOrigin(0.5);
    announcement.setDepth(100);

    // Fade out quickly
    this.scene.tweens.add({
      targets: announcement,
      alpha: 0,
      duration: 1000,
      onComplete: () => announcement.destroy(),
    });
  }

  /**
   * Update UI to show current event
   */
  private updateUI(): void {
    if (!this.uiContainer || !this.activeEvent) return;

    // Show event name
    if (this.eventNameText) {
      const displayText = this.activeEvent.icon
        ? `${this.activeEvent.icon} ${this.activeEvent.name}`
        : this.activeEvent.name;
      this.eventNameText.setText(displayText);
      this.eventNameText.setVisible(true);
    }

    // Show timer elements
    if (this.timerBar) {
      this.timerBar.setVisible(true);
    }
    if (this.countdownText) {
      this.countdownText.setVisible(true);
    }
  }

  /**
   * Hide UI elements
   */
  private hideUI(): void {
    if (this.eventNameText) {
      this.eventNameText.setVisible(false);
    }
    if (this.timerBar) {
      this.timerBar.setVisible(false);
    }
    if (this.countdownText) {
      this.countdownText.setVisible(false);
    }
  }

  /**
   * Draw the timer bar
   */
  private drawTimerBar(): void {
    if (!this.timerBar || !this.activeEvent) return;

    this.timerBar.clear();

    const fraction = this.getRemainingFraction();
    const fillWidth = this.timerBarWidth * fraction;

    // Background
    this.timerBar.fillStyle(0x333333, 1);
    this.timerBar.fillRect(
      -this.timerBarWidth / 2,
      20,
      this.timerBarWidth,
      this.timerBarHeight
    );

    // Border
    this.timerBar.lineStyle(1, 0xffff00, 0.8);
    this.timerBar.strokeRect(
      -this.timerBarWidth / 2,
      20,
      this.timerBarWidth,
      this.timerBarHeight
    );

    // Fill (color changes as time runs out)
    let fillColor = 0x00ff00; // Green
    if (fraction < 0.3) {
      fillColor = 0xff0000; // Red when low
    } else if (fraction < 0.6) {
      fillColor = 0xffff00; // Yellow in middle
    }

    if (fillWidth > 0) {
      this.timerBar.fillStyle(fillColor, 0.8);
      this.timerBar.fillRect(
        -this.timerBarWidth / 2 + 1,
        21,
        fillWidth - 2,
        this.timerBarHeight - 2
      );
    }
  }

  /**
   * Update - call this every frame from GameScene.update()
   */
  update(delta: number): void {
    if (!this.isRunning || this.isPaused) return;

    const now = this.scene.time.now;

    // Check if current event should end
    if (this.activeEvent && now >= this.eventEndTime) {
      this.endCurrentEvent();
    }

    // Check if it's time for a new event
    if (!this.activeEvent && now >= this.nextEventTime) {
      this.triggerRandomEvent();
    }

    // Update active event
    if (this.activeEvent) {
      // Call onUpdate if defined
      if (this.activeEvent.onUpdate) {
        this.activeEvent.onUpdate(this.scene, delta);
      }

      // Update timer display
      this.drawTimerBar();

      // Update countdown text
      if (this.countdownText) {
        const remaining = Math.ceil(this.getRemainingTime() / 1000);
        this.countdownText.setText(`${remaining}s`);
      }
    }
  }

  /**
   * Trigger a random event from the enabled pool
   */
  private triggerRandomEvent(): void {
    // Get list of enabled events
    const availableEvents = Array.from(this.events.values()).filter(
      (event) => this.enabledEvents.has(event.id)
    );

    if (availableEvents.length === 0) {
      // No events available, schedule next check
      this.scheduleNextEvent();
      return;
    }

    // Pick a random event
    const event = Phaser.Utils.Array.GetRandom(availableEvents);
    this.startEvent(event);
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.stop();

    if (this.uiContainer) {
      this.uiContainer.destroy(true);
    }
  }
}
