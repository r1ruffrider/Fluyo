import XCTest
@testable import Fluyo

final class FoundationTelemetryTests: XCTestCase {
    func testNoOpSinkRetainsNoPayload() async {
        let context = FoundationTelemetryContext(
            environment: .staging,
            semanticVersion: "0.1.0",
            buildNumber: "1",
            sourceCommitShort: "4dc05e8",
            outcome: .loaded,
            durationBucket: .under100Milliseconds
        )

        await NoOpFoundationTelemetrySink().record(.appShellLoaded, context: context)

        XCTAssertEqual(context.platform, "ios")
        XCTAssertEqual(context.environment, .staging)
        XCTAssertTrue(context.isInternal)
        XCTAssertEqual(FoundationTelemetryEvent.allCases.count, 5)
        XCTAssertEqual(FoundationTelemetryEnvironment.allCases, [.development, .staging])
    }
}
