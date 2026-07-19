import UIKit
import Capacitor

/**
 * SvayamVikās — iOS AppDelegate
 *
 * Capacitor's CAPBridgeViewController handles the WKWebView setup.
 * This AppDelegate adds:
 * - Full-screen game window configuration
 * - Dark background on launch (no white flash)
 * - Screen brightness management
 * - Deep link handling (svayamvikas://)
 */
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // ── Dark launch background (prevents white flash before WebGL loads) ──
        window?.backgroundColor = UIColor(red: 0.008, green: 0.016, blue: 0.035, alpha: 1.0)

        // ── Prevent screen from sleeping during gameplay ──────────────────────
        UIApplication.shared.isIdleTimerDisabled = true

        // ── Keep screen brightness at user's setting (don't dim for battery) ──
        // UIScreen.main.brightness = 0.8  // uncomment to force brightness

        return true
    }

    // ── Deep Link Handling ────────────────────────────────────────────────────
    // Handles: svayamvikas://join?room=xyz
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // ── Universal Links (HTTPS deep links) ───────────────────────────────────
    // Handles: https://svayamvikas.app/join?room=xyz
    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App going to background — game loop pauses via Capacitor appStateChange event
        // (handled in www/index.html JavaScript)
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // App back in foreground — resume game loop
        UIApplication.shared.isIdleTimerDisabled = true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        UIApplication.shared.isIdleTimerDisabled = false
    }
}
