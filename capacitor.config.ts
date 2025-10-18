import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mysense.app',
  appName: 'mysense-app',
  webDir: 'www',

  server: {
    // Дозволяємо навігацію/запити з WebView на ці домени
    allowNavigation: ['mysense.care', 'www.mysense.care']
    // dev-server тут не потрібен (тільки для ng serve)
  },

  ios: {
    // Стандартна схема — 'capacitor'; міняти не потрібно
    scheme: 'capacitor',
    contentInset: 'always'
  },

  android: {
    backgroundColor: '#FFFFFF'
  }
};

export default config;
