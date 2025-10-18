import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mysense.app',
  appName: 'mysense-app',
  webDir: 'www',
  server: {
    allowNavigation: ['mysense.care', 'www.mysense.care']
  }
};

export default config;
