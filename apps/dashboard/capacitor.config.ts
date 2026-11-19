import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hotelspark.management',
  appName: 'Hotel Spark',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // In production, Capacitor loads the bundled local dist assets.
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2200,
      launchAutoHide: true,
      backgroundColor: '#0c1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c1a2e',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_spark',
      iconColor: '#0d9488',
      sound: 'beep.wav',
    },
  },
};

export default config;
