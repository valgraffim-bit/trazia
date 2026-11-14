import SwiftUI
import SafariServices
import UIKit
import AVFoundation

@main
struct TraziaApp: App {
    init() {
        // Request playback audio so navigation speech can play with the
        // iPhone silent switch enabled. SafariServices may manage its own
        // audio behavior, so this does not guarantee browser speech output.
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback, mode: .default, options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            NSLog("Trazia audio session setup failed: %@", String(describing: error))
        }
    }

    var body: some Scene {
        WindowGroup {
            TraziaBrowser()
                .ignoresSafeArea()
        }
    }
}

// SFSafariViewController uses the system's browser implementation rather than
// a custom WKWebView, avoiding the authentication-related blank rendering.
private struct TraziaBrowser: UIViewControllerRepresentable {
    private let url = URL(string: "https://valgraffim-bit.github.io/trazia/")!

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let browser = SFSafariViewController(url: url)
        browser.dismissButtonStyle = .close
        browser.preferredControlTintColor = UIColor(red: 0.10, green: 0.65, blue: 0.57, alpha: 1)
        return browser
    }

    func updateUIViewController(_ browser: SFSafariViewController, context: Context) {}
}
