import XCTest
@testable import Fluyo

@MainActor
final class FoundationShellModelTests: XCTestCase {
    func testForcedSignedOutStateDoesNotRequireLiveAuthentication() async {
        let model = FoundationShellModel(
            infoDictionary: [:],
            processEnvironment: ["FLUYO_UI_TEST_STATE": "signed_out"]
        )

        await model.start()

        XCTAssertEqual(model.state, .signedOut)
        XCTAssertNil(model.configuration)
    }

    func testInvalidConfigurationMovesToSafeFailure() async {
        let model = FoundationShellModel(infoDictionary: [:], processEnvironment: [:])

        await model.start()

        XCTAssertEqual(model.state, .failure)
        XCTAssertNil(model.configuration)
    }

    func testLoadingOverrideRemainsDeterministic() async {
        let model = FoundationShellModel(
            infoDictionary: [:],
            processEnvironment: ["FLUYO_UI_TEST_STATE": "loading"]
        )

        await model.start()

        XCTAssertEqual(model.state, .loading)
    }

    func testReleasePolicyCannotBeUpgradedByProcessEnvironment() async {
        let model = FoundationShellModel(
            infoDictionary: [
                "CFBundleShortVersionString": "0.1.0",
                "CFBundleVersion": "1",
                "FluyoSourceCommitShort": "4dc05e8",
                "FluyoEnvironment": "release",
                "FluyoConfigurationClassification": AppConfiguration.inertReleaseClassification,
                "FluyoNetworkEnabled": false,
                "FluyoInternalBuild": false,
            ],
            processEnvironment: [
                "FluyoEnvironment": "development",
                "FluyoConfigurationClassification": AppConfiguration.publicNonProductionClassification,
                "FluyoNetworkEnabled": "YES",
                "FluyoInternalBuild": "YES",
                "FluyoAPIBaseURL": "https://api.example.test/api/v1",
                "FluyoSupabaseURL": "https://auth.example.test",
                "FluyoSupabasePublishableKey": "synthetic_publishable_value",
            ]
        )

        await model.start()

        XCTAssertEqual(model.state, .signedOut)
        XCTAssertEqual(model.configuration?.environment, .release)
        XCTAssertFalse(model.configuration?.networkEnabled ?? true)
        XCTAssertNil(model.buildMarker)
    }

    func testInitialLoadingAnnouncementIsLocalizedAndDeduplicated() {
        let first = FoundationAccessibilityCopy.announcement(
            for: .loading,
            previouslyAnnounced: nil
        )
        let duplicate = FoundationAccessibilityCopy.announcement(
            for: .loading,
            previouslyAnnounced: .loading
        )

        XCTAssertEqual(first, String(localized: "Preparing this internal build"))
        XCTAssertNil(duplicate)
    }
}
