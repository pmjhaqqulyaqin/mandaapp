import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.sch.mandualotim.app',
  appName: 'MAN 2 LOTIM',
  webDir: 'dist',
  server: {
    // Load from production server — makes API calls same-origin (no CORS issues)
    url: 'https://mandualotim.sch.id',
    androidScheme: 'https',
    allowNavigation: ['mandualotim.sch.id', '*.mandualotim.sch.id'],
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Allow mixed content for development
    allowMixedContent: false,
    // Splash screen background color
    backgroundColor: '#1a2332',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a2332',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
