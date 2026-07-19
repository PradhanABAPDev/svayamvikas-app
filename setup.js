#!/usr/bin/env node
/**
 * SvayamVikās — One-Command Setup Script
 * ══════════════════════════════════════════════════════════════════════════
 * Run this ONCE after cloning the repo:
 *
 *   node scripts/setup.js
 *
 * What it does:
 *   1. Checks system prerequisites (Node, Java, Xcode CLI)
 *   2. Installs npm dependencies
 *   3. Adds Android + iOS platforms via Capacitor
 *   4. Copies your Android patches (MainActivity.kt, manifest, etc.)
 *   5. Copies your iOS patches (Info.plist, AppDelegate.swift)
 *   6. Generates a keystore for Android signing
 *   7. Prints next steps
 * ══════════════════════════════════════════════════════════════════════════
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Colours ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  gold:   '\x1b[33m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};

function log(msg, color = C.reset)  { console.log(color + msg + C.reset); }
function ok(msg)   { log('  ✓ ' + msg, C.green); }
function fail(msg) { log('  ✗ ' + msg, C.red); }
function info(msg) { log('  → ' + msg, C.cyan); }
function head(msg) { log('\n' + C.gold + C.bold + '◈ ' + msg + C.reset); }
function run(cmd, opts = {}) {
  info('Running: ' + C.dim + cmd + C.reset);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ── Check prerequisites ───────────────────────────────────────────────────
head('Checking prerequisites');

function checkCmd(cmd, name, install) {
  try {
    execSync(cmd + ' --version', { stdio: 'pipe' });
    ok(name + ' found');
    return true;
  } catch {
    fail(name + ' not found. Install: ' + install);
    return false;
  }
}

const prereqs = [
  checkCmd('node',    'Node.js 18+',    'https://nodejs.org'),
  checkCmd('npm',     'npm',             'comes with Node.js'),
  checkCmd('git',     'git',             'https://git-scm.com'),
];

const isLinux = os.platform() === 'linux';
const isMac   = os.platform() === 'darwin';
const isWin   = os.platform() === 'win32';

// Android requires Java
const hasJava = checkCmd('java', 'Java 17+', 'https://adoptium.net');
prereqs.push(hasJava);

// iOS requires Mac + Xcode CLI
if (isMac) {
  const hasXcode = checkCmd('xcodebuild', 'Xcode CLI', 'xcode-select --install');
  prereqs.push(hasXcode);
  if (hasXcode) {
    try {
      execSync('pod --version', { stdio: 'pipe' });
      ok('CocoaPods found');
    } catch {
      fail('CocoaPods not found. Install: sudo gem install cocoapods');
    }
  }
} else {
  log('  ⚠ iOS builds require macOS. Use GitHub Actions for iOS CI.', C.gold);
}

if (prereqs.some(p => p === false && p !== undefined)) {
  log('\n⚠ Some prerequisites missing. Install them and re-run this script.\n', C.gold);
}

// ── Install dependencies ──────────────────────────────────────────────────
head('Installing npm dependencies');
run('npm install');
ok('Dependencies installed');

// ── Create www folder if it doesn't exist ────────────────────────────────
head('Setting up web assets folder');
if (!fs.existsSync('www')) {
  fs.mkdirSync('www', { recursive: true });
  fs.mkdirSync('www/assets/icons', { recursive: true });
  info('Created www/ directory — copy your game HTML/JS here');
} else {
  ok('www/ folder exists');
}

// ── Add Capacitor platforms ───────────────────────────────────────────────
head('Adding Capacitor platforms');

if (!fs.existsSync('android')) {
  info('Adding Android platform...');
  run('npx cap add android');
  ok('Android platform added');
} else {
  ok('Android platform already exists');
}

if (isMac && !fs.existsSync('ios')) {
  info('Adding iOS platform...');
  run('npx cap add ios');
  ok('iOS platform added');
} else if (!isMac) {
  log('  ⚠ Skipping iOS (macOS required). Use GitHub Actions for iOS builds.', C.gold);
} else {
  ok('iOS platform already exists');
}

// ── Apply Android patches ─────────────────────────────────────────────────
head('Applying Android patches');

const androidPatches = [
  {
    src:  'android-patches/MainActivity.kt',
    dest: 'android/app/src/main/java/com/svayam/vikas/MainActivity.kt',
    label: 'MainActivity.kt (WebGL hardware acceleration)',
  },
  {
    src:  'android-patches/AndroidManifest.xml',
    dest: 'android/app/src/main/AndroidManifest.xml',
    label: 'AndroidManifest.xml (permissions + deep links)',
  },
  {
    src:  'android-patches/network_security_config.xml',
    dest: 'android/app/src/main/res/xml/network_security_config.xml',
    label: 'network_security_config.xml (HTTPS enforcement)',
  },
  {
    src:  'android-patches/variables.gradle',
    dest: 'android/variables.gradle',
    label: 'variables.gradle (SDK versions)',
  },
];

androidPatches.forEach(({ src, dest, label }) => {
  if (!fs.existsSync(src)) {
    fail('Patch source not found: ' + src);
    return;
  }
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  ok('Applied: ' + label);
});

// ── Apply iOS patches ─────────────────────────────────────────────────────
if (isMac && fs.existsSync('ios')) {
  head('Applying iOS patches');

  const iosPatches = [
    {
      src:   'ios-patches/Info.plist',
      dest:  'ios/App/App/Info.plist',
      label: 'Info.plist (privacy + display settings)',
    },
    {
      src:   'ios-patches/AppDelegate.swift',
      dest:  'ios/App/App/AppDelegate.swift',
      label: 'AppDelegate.swift (fullscreen + deep links)',
    },
  ];

  iosPatches.forEach(({ src, dest, label }) => {
    if (!fs.existsSync(src)) { fail('Patch not found: ' + src); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    ok('Applied: ' + label);
  });
}

// ── Generate Android keystore ─────────────────────────────────────────────
head('Android release keystore');

if (!fs.existsSync('release-keystore.jks')) {
  if (hasJava) {
    const password = 'svayam' + Math.random().toString(36).slice(2, 10);
    const keystoreCmd = [
      'keytool -genkey -v',
      '-keystore release-keystore.jks',
      '-alias svayamvikas-release',
      '-keyalg RSA -keysize 2048',
      '-validity 10000',
      `-storepass "${password}"`,
      `-keypass "${password}"`,
      '-dname "CN=SvayamVikas, OU=Game, O=SvayamVikas, L=India, ST=India, C=IN"',
    ].join(' ');

    try {
      execSync(keystoreCmd, { stdio: 'pipe' });
      ok('Keystore generated: release-keystore.jks');
      log('\n' + C.gold + C.bold);
      log('  ┌─────────────────────────────────────────────────┐');
      log('  │  SAVE THESE CREDENTIALS — YOU CANNOT RECOVER    │');
      log('  │  them if lost. The keystore signs your app.     │');
      log('  ├─────────────────────────────────────────────────┤');
      log('  │  Keystore file : release-keystore.jks           │');
      log('  │  Alias         : svayamvikas-release            │');
      log('  │  Password      : ' + password.padEnd(29) + '│');
      log('  └─────────────────────────────────────────────────┘');
      log(C.reset);

      // Save to .env.local (git-ignored)
      fs.writeFileSync('.env.local',
        `KEYSTORE_PASSWORD=${password}\nKEYSTORE_ALIAS_PASSWORD=${password}\n`);
      ok('Credentials saved to .env.local (git-ignored)');
    } catch (e) {
      fail('Keystore generation failed. Run manually:');
      info(keystoreCmd);
    }
  } else {
    fail('Java not found — cannot generate keystore');
  }
} else {
  ok('Keystore already exists');
}

// ── Create .gitignore ─────────────────────────────────────────────────────
head('Creating .gitignore');
const gitignore = `
# Keystore — NEVER commit this
release-keystore.jks
*.keystore
*.jks
.env.local
*.p8
*.p12
*.mobileprovision

# Build outputs
android/app/build/
android/.gradle/
ios/App/build/
ios/App/Pods/
build/

# Node
node_modules/
npm-debug.log

# IDE
.DS_Store
.idea/
*.iml
`.trim();

fs.writeFileSync('.gitignore', gitignore);
ok('.gitignore created');

// ── Capacitor sync ────────────────────────────────────────────────────────
head('Running capacitor sync');
run('npx cap sync');
ok('Capacitor sync complete');

// ── Done ──────────────────────────────────────────────────────────────────
head('Setup complete! Next steps:');

const steps = [
  '1. Copy your game HTML into www/ (rename game file to game.js)',
  '2. Edit www/index.html: replace YOUR-WORKER.workers.dev with your CF Worker URL',
  '3. Deploy Cloudflare Worker: cd cloudflare && wrangler deploy',
  '4. Android: npm run android:open  → Android Studio → Run',
  isMac
    ? '5. iOS:     npm run ios:open     → Xcode → select team → Run'
    : '5. iOS:     push to GitHub → Actions auto-builds IPA (macOS runner)',
  '6. Release: git tag v1.0.0 && git push --tags  → GitHub Actions builds everything',
];

steps.forEach(s => log('  ' + s, C.cyan));

log('\n' + C.gold + C.bold + '  ॐ स्वयम् विकास ॐ  — May your karma guide the build.\n' + C.reset);
