import Foundation
import Observation

enum FoundationShellState: String, Equatable, Sendable {
    case loading
    case signedOut = "signed_out"
    case failure
}

@MainActor
@Observable
final class FoundationShellModel {
    private(set) var state: FoundationShellState = .loading
    private(set) var configuration: AppConfiguration?

    private let infoDictionary: [String: Any]
    private let processEnvironment: [String: String]

    init(
        infoDictionary: [String: Any] = Bundle.main.infoDictionary ?? [:],
        processEnvironment: [String: String] = ProcessInfo.processInfo.environment
    ) {
        self.infoDictionary = infoDictionary
        self.processEnvironment = processEnvironment
    }

    var buildMarker: String? {
        configuration?.buildMarker?.displayValue
    }

    func start() async {
        state = .loading

        if let forcedState = forcedTestState {
            state = forcedState
            return
        }

        await Task.yield()
        do {
            configuration = try AppConfiguration.load(
                infoDictionary: infoDictionary,
                processEnvironment: processEnvironment
            )
            state = .signedOut
        } catch {
            configuration = nil
            state = .failure
        }
    }

    func retry() async {
        await start()
    }

    private var forcedTestState: FoundationShellState? {
        guard let value = processEnvironment["FLUYO_UI_TEST_STATE"] else { return nil }
        return FoundationShellState(rawValue: value)
    }
}
