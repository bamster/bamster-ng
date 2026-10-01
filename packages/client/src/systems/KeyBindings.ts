// Key binding system for customizable controls

export interface PlayerKeyBindings {
  left: string;
  right: string;
  jump: string;
  shoot: string;
}

export interface GameKeyBindings {
  player1: PlayerKeyBindings;
  player2: PlayerKeyBindings;
  pause: string;
  screenshot: string;
}

// Phaser key code mappings
export const KEY_DISPLAY_NAMES: Record<string, string> = {
  'LEFT': '←',
  'RIGHT': '→',
  'UP': '↑',
  'DOWN': '↓',
  'SPACE': 'SPACE',
  'ENTER': 'ENTER',
  'SHIFT': 'SHIFT',
  'CTRL': 'CTRL',
  'ALT': 'ALT',
  'TAB': 'TAB',
  'BACKSPACE': 'BKSP',
  'ESC': 'ESC',
  // Punctuation
  'PERIOD': '.',
  'COMMA': ',',
  'SEMICOLON': ';',
  'QUOTES': "'",
  'OPEN_BRACKET': '[',
  'CLOSED_BRACKET': ']',
  'BACK_SLASH': '\\',
  'FORWARD_SLASH': '/',
  'BACKTICK': '`',
  'MINUS': '-',
  'PLUS': '=',
};

export const DEFAULT_BINDINGS: GameKeyBindings = {
  player1: {
    left: 'LEFT',
    right: 'RIGHT',
    jump: 'UP',
    shoot: 'SPACE',
  },
  player2: {
    left: 'J',
    right: 'L',
    jump: 'I',
    shoot: 'U',
  },
  pause: 'ESC',
  screenshot: 'P',
};

const STORAGE_KEY = 'bamster_keybindings';

// Get display name for a key
export function getKeyDisplayName(key: string): string {
  return KEY_DISPLAY_NAMES[key] || key;
}

// Load key bindings from localStorage
export function loadKeyBindings(): GameKeyBindings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const storedValue: unknown = JSON.parse(saved);
      const parsed = isRecord(storedValue) ? storedValue : {};
      const player1 = isRecord(parsed.player1) ? parsed.player1 : {};
      const player2 = isRecord(parsed.player2) ? parsed.player2 : {};

      return {
        player1: loadPlayerBindings(player1, DEFAULT_BINDINGS.player1),
        player2: loadPlayerBindings(player2, DEFAULT_BINDINGS.player2),
        pause: getSavedKey(parsed.pause, DEFAULT_BINDINGS.pause),
        screenshot: getSavedKey(parsed.screenshot, DEFAULT_BINDINGS.screenshot),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return cloneDefaultBindings();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSavedKey(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function loadPlayerBindings(
  saved: Record<string, unknown>,
  defaults: PlayerKeyBindings
): PlayerKeyBindings {
  return {
    left: getSavedKey(saved.left, defaults.left),
    right: getSavedKey(saved.right, defaults.right),
    jump: getSavedKey(saved.jump, defaults.jump),
    shoot: getSavedKey(saved.shoot, defaults.shoot),
  };
}

function cloneDefaultBindings(): GameKeyBindings {
  return {
    player1: { ...DEFAULT_BINDINGS.player1 },
    player2: { ...DEFAULT_BINDINGS.player2 },
    pause: DEFAULT_BINDINGS.pause,
    screenshot: DEFAULT_BINDINGS.screenshot,
  };
}

// Save key bindings to localStorage
export function saveKeyBindings(bindings: GameKeyBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Ignore storage errors
  }
}

// Reset to default bindings
export function resetKeyBindings(): GameKeyBindings {
  const defaults = cloneDefaultBindings();
  saveKeyBindings(defaults);
  return defaults;
}

// Convert a Phaser key event to our key string format
export function keyEventToString(event: KeyboardEvent): string {
  // Special keys
  if (event.key === 'ArrowLeft') return 'LEFT';
  if (event.key === 'ArrowRight') return 'RIGHT';
  if (event.key === 'ArrowUp') return 'UP';
  if (event.key === 'ArrowDown') return 'DOWN';
  if (event.key === ' ') return 'SPACE';
  if (event.key === 'Escape') return 'ESC';
  if (event.key === 'Enter') return 'ENTER';
  if (event.key === 'Shift') return 'SHIFT';
  if (event.key === 'Control') return 'CTRL';
  if (event.key === 'Alt') return 'ALT';
  if (event.key === 'Tab') return 'TAB';
  if (event.key === 'Backspace') return 'BACKSPACE';

  // Punctuation keys - map to Phaser KeyCode names
  if (event.key === '.') return 'PERIOD';
  if (event.key === ',') return 'COMMA';
  if (event.key === ';') return 'SEMICOLON';
  if (event.key === "'") return 'QUOTES';
  if (event.key === '[') return 'OPEN_BRACKET';
  if (event.key === ']') return 'CLOSED_BRACKET';
  if (event.key === '\\') return 'BACK_SLASH';
  if (event.key === '/') return 'FORWARD_SLASH';
  if (event.key === '`') return 'BACKTICK';
  if (event.key === '-') return 'MINUS';
  if (event.key === '=') return 'PLUS';

  // Regular alphanumeric keys - uppercase
  return event.key.toUpperCase();
}

// Convert our key string to Phaser KeyCode
export function stringToKeyCode(key: string): number {
  const Phaser = (window as unknown as { Phaser: typeof import('phaser') }).Phaser;
  const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

  // Check if it's a direct KeyCode name
  if (key in KeyCodes) {
    return (KeyCodes as Record<string, number>)[key];
  }

  // Single letter/number keys
  if (key.length === 1) {
    const charCode = key.charCodeAt(0);
    // A-Z (65-90)
    if (charCode >= 65 && charCode <= 90) {
      return charCode;
    }
    // 0-9 (48-57)
    if (charCode >= 48 && charCode <= 57) {
      return charCode;
    }
  }

  // Default to the key code value
  return KeyCodes[key as keyof typeof KeyCodes] || 0;
}
