#!/usr/bin/env node
/**
 * SvayamVikās — Icon & Splash Generator
 * ══════════════════════════════════════════════════════════════════════════
 * Generates ALL required icon and splash sizes for Android + iOS
 * from a single 1024×1024 master icon PNG.
 *
 * Prerequisites: npm install sharp  (already in package.json devDeps)
 *
 * Usage:
 *   Place your master icon at: assets/icon-master.png  (1024×1024, RGBA)
 *   Place splash source at:    assets/splash-master.png (2732×2732)
 *   Then run: node scripts/generate-icons.js
 * ══════════════════════════════════════════════════════════════════════════
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const MASTER_ICON   = path.join(__dirname, '../assets/icon-master.png');
const MASTER_SPLASH = path.join(__dirname, '../assets/splash-master.png');
const OUT_DIR       = path.join(__dirname, '../www/assets/icons');

// ── Icon sizes ────────────────────────────────────────────────────────────
const ANDROID_ICONS = [
  { size: 48,  dir: 'android/app/src/main/res/mipmap-mdpi',    name: 'ic_launcher.png' },
  { size: 48,  dir: 'android/app/src/main/res/mipmap-mdpi',    name: 'ic_launcher_round.png' },
  { size: 72,  dir: 'android/app/src/main/res/mipmap-hdpi',    name: 'ic_launcher.png' },
  { size: 72,  dir: 'android/app/src/main/res/mipmap-hdpi',    name: 'ic_launcher_round.png' },
  { size: 96,  dir: 'android/app/src/main/res/mipmap-xhdpi',   name: 'ic_launcher.png' },
  { size: 96,  dir: 'android/app/src/main/res/mipmap-xhdpi',   name: 'ic_launcher_round.png' },
  { size: 144, dir: 'android/app/src/main/res/mipmap-xxhdpi',  name: 'ic_launcher.png' },
  { size: 144, dir: 'android/app/src/main/res/mipmap-xxhdpi',  name: 'ic_launcher_round.png' },
  { size: 192, dir: 'android/app/src/main/res/mipmap-xxxhdpi', name: 'ic_launcher.png' },
  { size: 192, dir: 'android/app/src/main/res/mipmap-xxxhdpi', name: 'ic_launcher_round.png' },
  // Play Store requires 512×512
  { size: 512, dir: 'assets/store',  name: 'play-store-icon.png' },
];

const IOS_ICONS = [
  // iPhone
  { size: 20,  name: 'Icon-20.png' },
  { size: 40,  name: 'Icon-20@2x.png' },
  { size: 60,  name: 'Icon-20@3x.png' },
  { size: 29,  name: 'Icon-29.png' },
  { size: 58,  name: 'Icon-29@2x.png' },
  { size: 87,  name: 'Icon-29@3x.png' },
  { size: 40,  name: 'Icon-40.png' },
  { size: 80,  name: 'Icon-40@2x.png' },
  { size: 120, name: 'Icon-40@3x.png' },
  { size: 120, name: 'Icon-60@2x.png' },
  { size: 180, name: 'Icon-60@3x.png' },
  // iPad
  { size: 76,  name: 'Icon-76.png' },
  { size: 152, name: 'Icon-76@2x.png' },
  { size: 167, name: 'Icon-83.5@2x.png' },
  // App Store
  { size: 1024, name: 'Icon-1024.png' },
];

// PWA sizes (go into www/assets/icons/)
const PWA_ICONS = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('\n✦ SvayamVikās Icon Generator\n');

  if (!fs.existsSync(MASTER_ICON)) {
    console.error('✗ Master icon not found at: assets/icon-master.png');
    console.log('  Create a 1024×1024 PNG with your Sanskrit mandala design');
    console.log('  Then re-run: node scripts/generate-icons.js');
    console.log('\n  TIP: Use Figma (free) to design your icon, export as PNG 1024×1024');
    process.exit(1);
  }

  // ── PWA icons (www/assets/icons/) ──────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Generating PWA icons...');
  for (const size of PWA_ICONS) {
    const out = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(MASTER_ICON).resize(size, size, { fit: 'cover' }).toFile(out);
    console.log(`  ✓ icon-${size}.png`);
  }

  // ── Android icons ───────────────────────────────────────────────────────
  if (fs.existsSync('android')) {
    console.log('\nGenerating Android icons...');
    for (const { size, dir, name } of ANDROID_ICONS) {
      const outDir = path.join(__dirname, '..', dir);
      fs.mkdirSync(outDir, { recursive: true });
      const out = path.join(outDir, name);

      // Round icons: add circular mask
      if (name.includes('round')) {
        const circle = Buffer.from(
          `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`
        );
        await sharp(MASTER_ICON)
          .resize(size, size)
          .composite([{ input: circle, blend: 'dest-in' }])
          .png()
          .toFile(out);
      } else {
        await sharp(MASTER_ICON).resize(size, size).toFile(out);
      }
      console.log(`  ✓ ${dir}/${name} (${size}px)`);
    }
  }

  // ── iOS icons ───────────────────────────────────────────────────────────
  const iosIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
  if (fs.existsSync('ios')) {
    console.log('\nGenerating iOS icons...');
    fs.mkdirSync(iosIconDir, { recursive: true });

    for (const { size, name } of IOS_ICONS) {
      const out = path.join(iosIconDir, name);
      await sharp(MASTER_ICON).resize(size, size).toFile(out);
      console.log(`  ✓ ${name} (${size}px)`);
    }

    // Generate Contents.json for Xcode
    const contentsJson = {
      images: IOS_ICONS.map(({ size, name }) => ({
        filename: name,
        idiom: size >= 76 ? 'ipad' : 'iphone',
        scale: '1x',
        size: `${size}x${size}`,
      })),
      info: { author: 'svayamvikas-setup', version: 1 },
    };
    fs.writeFileSync(
      path.join(iosIconDir, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2)
    );
    console.log('  ✓ Contents.json');
  }

  // ── Splash screens ──────────────────────────────────────────────────────
  if (fs.existsSync(MASTER_SPLASH)) {
    await generateSplashScreens();
  } else {
    console.log('\n⚠ No splash master found at assets/splash-master.png — skipping');
    console.log('  Create a 2732×2732 PNG (your game title on dark background)');
  }

  console.log('\n✓ All icons generated!\n');
}

async function generateSplashScreens() {
  console.log('\nGenerating splash screens...');

  const androidSplashes = [
    { w: 320,  h: 480,  dir: 'android/app/src/main/res/drawable-port-ldpi' },
    { w: 480,  h: 800,  dir: 'android/app/src/main/res/drawable-port-mdpi' },
    { w: 720,  h: 1280, dir: 'android/app/src/main/res/drawable-port-hdpi' },
    { w: 960,  h: 1600, dir: 'android/app/src/main/res/drawable-port-xhdpi' },
    { w: 1280, h: 1920, dir: 'android/app/src/main/res/drawable-port-xxhdpi' },
    { w: 1600, h: 2560, dir: 'android/app/src/main/res/drawable-port-xxxhdpi' },
  ];

  for (const { w, h, dir } of androidSplashes) {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(MASTER_SPLASH)
      .resize(w, h, { fit: 'cover', position: 'centre' })
      .toFile(path.join(dir, 'splash.png'));
    console.log(`  ✓ Android ${w}×${h}`);
  }

  // iOS launch images (Xcode uses LaunchScreen.storyboard — just need 1 large image)
  if (fs.existsSync('ios')) {
    const iosSplashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';
    fs.mkdirSync(iosSplashDir, { recursive: true });
    await sharp(MASTER_SPLASH).resize(2732, 2732).toFile(path.join(iosSplashDir, 'splash.png'));
    fs.writeFileSync(path.join(iosSplashDir, 'Contents.json'), JSON.stringify({
      images: [{ filename: 'splash.png', idiom: 'universal', scale: '1x' }],
      info: { author: 'svayamvikas-setup', version: 1 },
    }, null, 2));
    console.log('  ✓ iOS 2732×2732 splash');
  }
}

generateIcons().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
