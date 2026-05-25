import SwiftUI

/// Dismissable bottom banner. Just signals "go look" — the real error
/// is in Metro's terminal.
struct RNWErrorToast: View {
    let onDismiss: () -> Void

    var body: some View {
        Button(action: onDismiss) {
            Text("Error: check metro for logs")
                .font(.system(size: 10))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .frame(maxWidth: .infinity)
                .background(.red.opacity(0.85), in: Capsule())
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 4)
        .padding(.bottom, 4)
    }
}
