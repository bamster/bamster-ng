import { getGameSettings } from '../scenes/SettingsScene';

type SoundType = 'laser' | 'hit' | 'explosion' | 'powerup' | 'jump' | 'damage' | 'death';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  frequencyEnd?: number;
  gain?: number;
  delay?: number;
}

/**
 * SoundManager - Generates retro-style synthesized sound effects and music
 * Uses Web Audio API to create 80s arcade-style sounds
 */
export class SoundManager {
  private static instance: SoundManager | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private initialized: boolean = false;

  // Music state
  private isMusicPlaying: boolean = false;
  private musicIntervalId: number | null = null;
  private currentBeat: number = 0;
  private bpm: number = 120;

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

      // Create separate gain for music
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.audioContext.destination);

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
    const settings = getGameSettings();
    if (this.masterGain) {
      this.masterGain.gain.value = settings.masterVolume * settings.sfxVolume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = settings.masterVolume * settings.musicVolume;
    }
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
      case 'death':
        this.playDeath();
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

  /**
   * Death sound - dramatic falling/game over jingle
   * Descending chromatic slide with sad ending
   */
  private playDeath(): void {
    // Descending chromatic fall
    const fallNotes = [440, 392, 349, 311, 277, 247, 220, 196, 175];
    fallNotes.forEach((freq, i) => {
      this.playTone({
        frequency: freq,
        duration: 0.12,
        type: 'square',
        gain: 0.2,
        delay: i * 0.1,
      });
    });

    // Final sad chord
    this.playTone({
      frequency: 146, // D3
      duration: 0.5,
      type: 'sawtooth',
      gain: 0.25,
      delay: 0.9,
    });
    this.playTone({
      frequency: 174, // F3
      duration: 0.5,
      type: 'sawtooth',
      gain: 0.2,
      delay: 0.9,
    });
    this.playTone({
      frequency: 220, // A3
      duration: 0.5,
      type: 'sawtooth',
      gain: 0.15,
      delay: 0.9,
    });

    // Noise whoosh for falling
    this.playNoise(1.0, 0.15);
  }

  // =====================================
  // Background Music System
  // =====================================

  /**
   * Start playing procedural background music
   * Generates an 80s synthwave-style loop
   */
  startMusic(): void {
    if (!this.audioContext || !this.musicGain) {
      this.init();
      if (!this.audioContext || !this.musicGain) return;
    }

    if (this.isMusicPlaying) return;

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isMusicPlaying = true;
    this.currentBeat = 0;
    this.updateVolume();

    // Calculate beat interval from BPM
    const beatInterval = (60 / this.bpm) * 1000;

    // Start the music loop
    this.playMusicBeat();
    this.musicIntervalId = window.setInterval(() => {
      this.playMusicBeat();
    }, beatInterval);
  }

  /**
   * Stop playing background music
   */
  stopMusic(): void {
    if (this.musicIntervalId !== null) {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    this.isMusicPlaying = false;
    this.currentBeat = 0;
  }

  /**
   * Check if music is currently playing
   */
  isMusicActive(): boolean {
    return this.isMusicPlaying;
  }

  /**
   * Play one beat of the music sequence
   */
  private playMusicBeat(): void {
    if (!this.audioContext || !this.musicGain) return;

    const beatInBar = this.currentBeat % 16; // 16 beats per bar (4 bars of 4 beats)
    const bar = Math.floor(this.currentBeat / 4) % 4;

    // Bass drum on beats 0, 4, 8, 12
    if (beatInBar % 4 === 0) {
      this.playMusicTone(60, 0.15, 'sine', 0.25);
    }

    // Snare on beats 2, 6, 10, 14
    if (beatInBar % 4 === 2) {
      this.playMusicNoise(0.08, 0.15);
    }

    // Hi-hat on every beat
    this.playMusicNoise(0.03, 0.05, 8000);

    // Bass line - simple synthwave pattern
    const bassNotes = [
      [55, 55, 0, 55],    // Bar 1: A
      [73, 73, 0, 73],    // Bar 2: D
      [65, 65, 0, 65],    // Bar 3: C
      [82, 82, 0, 82],    // Bar 4: E
    ];
    const bassNote = bassNotes[bar][beatInBar % 4];
    if (bassNote > 0) {
      this.playMusicTone(bassNote, 0.2, 'sawtooth', 0.12);
    }

    // Arpeggio pattern on even bars
    if (bar % 2 === 0 && beatInBar % 2 === 0) {
      const arpeggioNotes = [220, 277, 330, 440]; // A minor arpeggio
      const noteIndex = (beatInBar / 2) % 4;
      this.playMusicTone(arpeggioNotes[noteIndex], 0.1, 'square', 0.06);
    }

    // Pad chord on first beat of each bar
    if (beatInBar === 0) {
      const padChords = [
        [220, 277, 330], // Am
        [293, 370, 440], // D
        [262, 330, 392], // C
        [330, 415, 494], // E
      ];
      const chord = padChords[bar];
      chord.forEach((freq) => {
        this.playMusicTone(freq, 0.8, 'sine', 0.03);
      });
    }

    this.currentBeat++;
  }

  /**
   * Play a music tone (connected to music gain)
   */
  private playMusicTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number
  ): void {
    if (!this.audioContext || !this.musicGain) return;

    const now = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.musicGain);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Play music noise (for drums, connected to music gain)
   */
  private playMusicNoise(duration: number, gain: number, filterFreq: number = 4000): void {
    if (!this.audioContext || !this.musicGain) return;

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.musicGain);

    noise.start(now);
    noise.stop(now + duration);
  }
}

// Export singleton getter for convenience
export function getSound(): SoundManager {
  return SoundManager.getInstance();
}
