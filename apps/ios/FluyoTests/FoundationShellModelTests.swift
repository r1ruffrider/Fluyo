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
}
