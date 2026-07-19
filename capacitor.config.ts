import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ─── App Identity ────────────────────────────────────────────────────────────
  appId: 'com.svayam.vikas',
  appName: 'SvayamVikās',

  // ─── Web Assets ──────────────────────────────────────────────────────────────
  // All your HTML/JS/CSS/Three.js game files live in www/
  webDir: 'www',

  // ─── Server Config ───────────────────────────────────────────────────────────
  server: {
    // Allow loading fonts + CDN resources (Three.js, Google Fonts)
    androidScheme: 'https',
    // Whitelist external domains the game fetches from
    allowNavigation: [
      'api.anthropic.com',          // AI companion (routed via your CF Worker)
      'fonts.googleapis.com',       // Cinzel, Crimson Pro fonts
      'fonts.gstatic.com',          // Font files
      'cdnjs.cloudflare.com',       // Three.js r128
    ],
    // During development only — point to your live dev server
    // url: 'http://192.168.1.X:3000',  // ← uncomment for live reload dev
    cleartext: false,               // Force HTTPS everywhere
  },

  // ─── Android Config ──────────────────────────────────────────────────────────
  android: {
    // WebView configuration for best WebGL performance
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,  // set true during dev, false for release
    // Minimum SDK — Android 7.0 (covers 99%+ of active devices)
    minWebViewVersion: 72,
    // Override back button behavior (important for game HUD)
    handleApplicationNotifications: false,
    // Use hardware-accelerated WebView (critical for Three.js / WebGL)
    useLegacyBridge: false,
    // Build settings
    buildOptions: {
      keystorePath: './release-keystore.jks',          // generated in setup script
      keystoreAlias: 'svayamvikas-release',
      keystorePassword: process.env.KEYSTORE_PASSWORD || '',
      keystoreAliasPassword: process.env.KEYSTORE_ALIAS_PASSWORD || '',
      releaseType: 'AAB',          // Google Play prefers .aab over .apk
    },
  },

  // ─── iOS Config ──────────────────────────────────────────────────────────────
  ios: {
    // Content inset (for iPhone notch / Dynamic Island)
    contentInset: 'never',
    // Scroll behavior — disable bouncing for a game feel
    scrollEnabled: false,
    // Liminal screen (no white flash on launch)
    backgroundColor: '#020409',
    // Deployment target: iOS 15+ (covers 95%+ of active devices)
    deploymentTarget: '15.0',
    // Scheme used for WKWebView internal navigation
    scheme: 'svayamvikas',
    // Prefer WKWebView (faster, more memory-efficient for WebGL)
    preferredContentMode: 'mobile',
  },

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  plugins: {
    // Status bar — hide for full-screen game immersion
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#020409',
      overlaysWebView: true,
    },
    // Splash screen — shows while WebGL initializes
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#020409',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Keyboard — prevent it from shifting the game layout
    Keyboard: {
      resize: 'none',
      style: 'Dark',
      resizeOnFullScreen: false,
    },
    // Screen orientation — landscape + portrait both supported
    ScreenOrientation: {
      // game auto-rotates based on device
    },
    // Keep screen awake during gameplay
    KeepAwake: {
      // Plugin prevents screen sleep while game is active
    },
    // App tracking (for Play Store compliance, NOT used for ads)
    // AppTrackingTransparency only needed if you add analytics later
  },
};

export default config;
