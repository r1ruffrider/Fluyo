import SwiftUI
import UIKit

struct FoundationShellView: View {
    private enum FocusTarget: Hashable {
        case status
        case primaryAction
    }

    @State private var model: FoundationShellModel
    @State private var showsBuildStatus = false
    @State private var announcedState: FoundationShellState?
    @AccessibilityFocusState private var focusedTarget: FocusTarget?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(model: FoundationShellModel = FoundationShellModel()) {
        _model = State(initialValue: model)
    }

    var body: some View {
        ZStack {
            Color(red: 0.96, green: 0.94, blue: 0.88)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    stateCard
                    foundationNote
                }
                .frame(maxWidth: 560, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.vertical, 32)
                .frame(maxWidth: .infinity)
            }
        }
        .task {
            await model.start()
        }
        .onChange(of: model.state) { _, newState in
            handleStateChange(newState)
        }
        .sheet(isPresented: $showsBuildStatus) {
            BuildStatusView(marker: model.buildMarker)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Fluyo")
                .font(.largeTitle.bold())
                .foregroundStyle(Color(red: 0.08, green: 0.20, blue: 0.55))
                .accessibilityAddTraits(.isHeader)

            Text("Internal iPhone foundation")
                .font(.headline)
                .foregroundStyle(.secondary)

            if let marker = model.buildMarker {
                Text(marker)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Internal non-production build")
                    .accessibilityIdentifier("build-marker")
            }
        }
    }

    @ViewBuilder
    private var stateCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            switch model.state {
            case .loading:
                statusHeader(
                    systemImage: "hourglass",
                    title: "Preparing this internal build",
                    message: "Checking the non-production setup. No account data is loaded."
                )
                .accessibilityIdentifier("loading-state")

            case .signedOut:
                statusHeader(
                    systemImage: "person.crop.circle.badge.questionmark",
                    title: "Foundation ready",
                    message: "Live sign-in is planned for a later increment. This build proves the local shell only."
                )
                .accessibilityIdentifier("signed-out-state")

                primaryButton("Review build status") {
                    showsBuildStatus = true
                }
                .accessibilityIdentifier("review-build-button")

            case .failure:
                statusHeader(
                    systemImage: "exclamationmark.triangle.fill",
                    title: "Configuration unavailable",
                    message: "This internal build could not load its safe non-production setup. Try again after the configuration is corrected."
                )
                .accessibilityIdentifier("error-state")
                .accessibilityFocused($focusedTarget, equals: .status)

                primaryButton("Retry setup") {
                    Task { await model.retry() }
                }
                .accessibilityIdentifier("retry-button")
                .accessibilityFocused($focusedTarget, equals: .primaryAction)
            }
        }
        .padding(24)
        .background(.background, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.primary.opacity(0.12), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
    }

    private var foundationNote: some View {
        Text("No lessons, billing, audio, AI, account recovery, or store features are available in this foundation build.")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .accessibilityIdentifier("foundation-boundary")
    }

    private func statusHeader(systemImage: String, title: LocalizedStringKey, message: LocalizedStringKey) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 32, weight: .semibold))
                .foregroundStyle(Color(red: 0.92, green: 0.30, blue: 0.24))
                .accessibilityHidden(true)

            Text(title)
                .font(.title2.bold())
                .accessibilityAddTraits(.isHeader)

            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
        }
    }

    private func primaryButton(_ title: LocalizedStringKey, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color(red: 0.08, green: 0.20, blue: 0.55))
    }

    private func handleStateChange(_ state: FoundationShellState) {
        switch state {
        case .failure:
            focusedTarget = .status
        case .signedOut:
            focusedTarget = .primaryAction
        case .loading:
            focusedTarget = nil
        }

        guard announcedState != state else { return }
        announcedState = state
        let announcement: String
        switch state {
        case .loading:
            announcement = "Preparing this internal build"
        case .signedOut:
            announcement = "Internal foundation ready"
        case .failure:
            announcement = "Configuration unavailable. Retry after the setup is corrected."
        }
        UIAccessibility.post(notification: .announcement, argument: announcement)

        if reduceMotion {
            UIAccessibility.post(notification: .layoutChanged, argument: nil)
        }
    }
}

private struct BuildStatusView: View {
    @Environment(\.dismiss) private var dismiss
    let marker: String?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Internal foundation only")
                    .font(.title2.bold())
                    .accessibilityAddTraits(.isHeader)
                Text("This unsigned simulator build does not provide sign-in, learning, billing, or public availability.")
                if let marker {
                    Text(marker)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .accessibilityLabel("Internal non-production build")
                }
                Spacer()
            }
            .padding(24)
            .navigationTitle("Build status")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
