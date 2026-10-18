import XCTest

final class FoundationShellUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLoadingStateIsStaticAndHonest() {
        let app = launch(state: "loading")

        XCTAssertTrue(app.otherElements["loading-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Preparing this internal build"].exists)
        XCTAssertTrue(app.staticTexts["foundation-boundary"].exists)
    }

    func testSignedOutFoundationHasOneUsefulAction() {
        let app = launch(state: "signed_out")

        XCTAssertTrue(app.otherElements["signed-out-state"].waitForExistence(timeout: 5))
        let button = app.buttons["review-build-button"]
        XCTAssertTrue(button.exists)
        XCTAssertGreaterThanOrEqual(button.frame.height, 44)
        button.tap()
        XCTAssertTrue(app.navigationBars["Build status"].waitForExistence(timeout: 5))
    }

    func testFailureStateProvidesBoundedRetry() {
        let app = launch(state: "failure")

        XCTAssertTrue(app.otherElements["error-state"].waitForExistence(timeout: 5))
        let button = app.buttons["retry-button"]
        XCTAssertTrue(button.exists)
        XCTAssertGreaterThanOrEqual(button.frame.height, 44)
    }

    func testLandscapeAndLargeTextKeepPrimaryActionVisible() {
        let app = launch(
            state: "signed_out",
            arguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        )
        XCUIDevice.shared.orientation = .landscapeLeft

        XCTAssertTrue(app.buttons["review-build-button"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["review-build-button"].isHittable)
    }

    func testReducedMotionAndRTLKeepTheSameSemanticState() {
        let app = launch(
            state: "signed_out",
            arguments: [
                "-UIAccessibilityReduceMotionEnabled", "YES",
                "-NSForceRightToLeftWritingDirection", "YES",
                "-AppleTextDirection", "YES",
            ]
        )

        XCTAssertTrue(app.otherElements["signed-out-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["review-build-button"].isHittable)
    }

    private func launch(state: String, arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["FLUYO_UI_TEST_STATE"] = state
        app.launchArguments += arguments
        app.launch()
        return app
    }
}
