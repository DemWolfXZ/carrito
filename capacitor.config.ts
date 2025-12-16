import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carrito.app',
  appName: 'carrito',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK'
    },
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
