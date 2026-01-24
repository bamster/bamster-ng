import { getGameSettings } from '../scenes/SettingsScene';

type SoundType = 'laser' | 'hit' | 'explosion' | 'powerup' | 'jump' | 'damage';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  frequencyEnd?: number;
  gain?: number;
  delay?: number;
}

/**
 * SoundManager - Generates retro-style synthesized sound effects
 * Uses Web Audio API to create 80s arcade-style sounds
 */
export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init(): void {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.updateVolume();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  /**
   * Update master volume from settings
   */
  updateVolume(): void {
    if (!this.masterGain) return;
    const settings = getGameSettings();
    this.masterGain.gain.value = settings.masterVolume * settings.sfxVolume;
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundType): void {
    if (!this.audioContext || !this.masterGain) {
      this.init();
      if (!this.audioContext || !this.masterGain) return;
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Update volume before playing
    this.updateVolume();

    switch (sound) {
      case 'laser':
        this.playLaser();
        break;
      case 'hit':
        this.playHit();
        break;
      case 'explosion':
        this.playExplosion();
        break;
      case 'powerup':
        this.playPowerup();
        break;
      case 'jump':
        this.playJump();
        break;
      case 'damage':
        this.playDamage();
        break;
    }
  }

  private playTone(config: SoundConfig): void {
    if (!this.audioContext || !this.masterGain) return;

    const startTime = this.audioContext.currentTime + (config.delay || 0);
    const endTime = startTime + config.duration;

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, startTime);

    if (config.frequencyEnd !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(config.frequencyEnd, 20),
        endTime
      );
    }

    // Create gain envelope
    const gainNode = this.audioContext.createGain();
    const gain = config.gain ?? 0.3;
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  }

  private playNoise(duration: number, gain: number = 0.2, delay: number = 0): void {
    if (!this.audioContext || !this.masterGain) return;

    const startTime = this.audioContext.currentTime + delay;
    const endTime = startTime + duration;

    // Create noise buffer
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    // Filter for different noise characters
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;

    // Gain envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(gain, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start(startTime);
    noise.stop(endTime);
  }

  /**
   * Laser shot - classic pew pew sound
   * Descending high-pitched tone
   */
  private playLaser(): void {
    this.playTone({
      frequency: 880,
      frequencyEnd: 220,
      duration: 0.1,
      type: 'square',
      gain: 0.15,
    });
  }

  /**
   * Block hit - short impact sound
   * Quick percussive hit
   */
  private playHit(): void {
    this.playTone({
      frequency: 300,
      frequencyEnd: 100,
      duration: 0.05,
      type: 'square',
      gain: 0.2,
    });
    this.playNoise(0.03, 0.1);
  }

  /**
   * Block explosion - satisfying destruction sound
   * Low rumble with noise
   */
  private playExplosion(): void {
    // Bass thump
    this.playTone({
      frequency: 150,
      frequencyEnd: 40,
      duration: 0.2,
      type: 'sine',
      gain: 0.4,
    });

    // Mid crunch
    this.playTone({
      frequency: 400,
      frequencyEnd: 80,
      duration: 0.15,
      type: 'sawtooth',
      gain: 0.2,
    });

    // Noise burst
    this.playNoise(0.15, 0.25);
  }

  /**
   * Power-up collect - positive chime
   * Ascending arpeggio
   */
  private playPowerup(): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this.playTone({
        frequency: freq,
        duration: 0.1,
        type: 'square',
        gain: 0.15,
        delay: i * 0.05,
      });
    });
  }

  /**
   * Jump sound - quick upward sweep
   */
  private playJump(): void {
    this.playTone({
      frequency: 200,
      frequencyEnd: 500,
      duration: 0.1,
      type: 'square',
      gain: 0.1,
    });
  }

  /**
   * Damage taken - negative impact
   */
  private playDamage(): void {
    this.playTone({
      frequency: 200,
      frequencyEnd: 50,
      duration: 0.2,
      type: 'sawtooth',
      gain: 0.3,
    });
    this.playNoise(0.1, 0.2);
  }
}

// Export singleton getter for convenience
export function getSound(): SoundManager {
  return SoundManager.getInstance();
}
