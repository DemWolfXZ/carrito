import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carritocontrol.app',
  appName: 'CarritoControl',
  webDir: 'www',
  plugins: {
    StatusBar: {
      // true: el WebView dibuja edge-to-edge, por detrás del status bar.
      // Debe coincidir con MainActivity.java (setDecorFitsSystemWindows(false));
      // dejarlo en false aquí contradecía lo que el código nativo ya hace.
      overlaysWebView: true,
      // Color inicial de los íconos (reloj/batería/señal) ANTES de que
      // Angular cargue y TemaService.actualizarIconosStatusBar() lo
      // ajuste al tema real guardado por el usuario.
      style: 'DARK'
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ad01e1ff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: false,
      splashImmersive: false,
      layoutName: "launch_screen",
      useDialog: true,
    },
  }
};

export default config;
