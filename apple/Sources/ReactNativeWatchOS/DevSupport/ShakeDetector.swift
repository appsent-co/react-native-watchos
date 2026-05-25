#if DEBUG
import CoreMotion
import Foundation

/// Bumps `shakeCount` on each detected shake. Counter (not Bool) so
/// consecutive shakes always notify. DEBUG-only; host app must declare
/// `NSMotionUsageDescription`.
@MainActor
final class ShakeDetector: ObservableObject {
    @Published var shakeCount: Int = 0

    private let motionManager = CMMotionManager()
    private var lastShakeAt: Date = .distantPast

    /// ~1g at rest; a wrist flick peaks ~2.3-3g. Lower fires on arm
    /// swings; higher misses real shakes.
    private let triggerG: Double = 2.3

    /// Suppress refires while the same shake rings out.
    private let debounce: TimeInterval = 0.6

    func start() {
        guard motionManager.isAccelerometerAvailable,
              !motionManager.isAccelerometerActive else { return }
        motionManager.accelerometerUpdateInterval = 1.0 / 30.0
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
            guard let self, let data else { return }
            let a = data.acceleration
            let mag = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
            guard mag > self.triggerG else { return }
            let now = Date()
            guard now.timeIntervalSince(self.lastShakeAt) > self.debounce else { return }
            self.lastShakeAt = now
            self.shakeCount += 1
        }
    }

    deinit {
        motionManager.stopAccelerometerUpdates()
    }
}
#endif
