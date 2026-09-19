import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nl.studiogoud.wolkenhaven',
  appName: 'Wolkenhaven',
  webDir: 'dist',
  backgroundColor: '#0f2a4a',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f2a4a',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0f2a4a',
  },
};

export default config;
