import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bamster.game',
  appName: 'BAMster',
  webDir: 'packages/client/dist',
  server: {
    // Allow cleartext traffic for local development
    cleartext: true,
  },
  ios: {
    // Allow landscape orientation for game
    preferredContentMode: 'desktop',
  },
  android: {
    // Force landscape for better game experience
    allowMixedContent: true,
  },
  plugins: {
    // Keep screen awake during gameplay
    KeepAwake: {
      enabled: true,
    },
  },
};

export default config;
