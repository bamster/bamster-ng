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
      return { ...DEFAULT_BINDINGS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_BINDINGS };
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
  const defaults = { ...DEFAULT_BINDINGS };
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
