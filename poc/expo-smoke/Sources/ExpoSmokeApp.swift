import SwiftUI

@main
struct ExpoSmokeApp: App {
  @StateObject private var runner = ExpoSmokeRunner()

  var body: some Scene {
    WindowGroup {
      Text("Expo smoke test").task {
        runner.start()
      }
    }
  }
}
