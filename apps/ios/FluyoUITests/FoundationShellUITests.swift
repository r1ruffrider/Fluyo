import XCTest

@MainActor
final class FoundationShellUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLoadingStateIsStaticAndHonest() {
        let app = launch(state: "loading")

        XCTAssertTrue(app.staticTexts["loading-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Preparing this internal build"].exists)
        XCTAssertTrue(app.staticTexts["foundation-boundary"].exists)
    }

    func testSignedOutFoundationHasOneUsefulAction() {
        let app = launch(state: "signed_out")

        XCTAssertTrue(app.staticTexts["signed-out-state"].waitForExistence(timeout: 5))
        let button = app.buttons["review-build-button"]
        XCTAssertTrue(button.exists)
        XCTAssertGreaterThanOrEqual(button.frame.height, 44)
        button.tap()
        XCTAssertTrue(app.navigationBars["Build status"].waitForExistence(timeout: 5))
    }

    func testFailureStateProvidesBoundedRetry() {
        let app = launch(state: "failure")

        XCTAssertTrue(app.staticTexts["error-state"].waitForExistence(timeout: 5))
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

    func testLoadingAndErrorRemainUsableInLandscape() {
        for state in ["loading", "failure"] {
            let app = launch(
                state: state,
                arguments: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
            )
            XCUIDevice.shared.orientation = .landscapeRight

            let identifier = state == "loading" ? "loading-state" : "error-state"
            XCTAssertTrue(app.staticTexts[identifier].waitForExistence(timeout: 5))
            if state == "failure" {
                XCTAssertTrue(app.buttons["retry-button"].isHittable)
            }
            app.terminate()
        }
    }
    func testReducedMotionKeepsTheSameSemanticState() {
        let app = launch(
            state: "signed_out",
            arguments: ["-UIAccessibilityReduceMotionEnabled", "YES"]
        )

        XCTAssertTrue(app.staticTexts["signed-out-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["review-build-button"].isHittable)
    }

    func testRTLProbeMirrorsLeadingContent() {
        let leftToRight = launch(
            state: "signed_out",
            arguments: ["-NSForceLeftToRightWritingDirection", "YES"]
        )
        let leftToRightHeading = leftToRight.staticTexts["brand-heading"]
        XCTAssertTrue(leftToRightHeading.waitForExistence(timeout: 5))
        let leftToRightWindow = leftToRight.windows.element(boundBy: 0)
        XCTAssertTrue(leftToRightWindow.exists)
        XCTAssertGreaterThan(leftToRightHeading.frame.width, 0)
        XCTAssertLessThan(leftToRightHeading.frame.midX, leftToRightWindow.frame.midX)
        leftToRight.terminate()

        let rightToLeft = launch(
            state: "signed_out",
            arguments: [
                "-NSForceRightToLeftWritingDirection", "YES",
                "-AppleTextDirection", "YES",
            ]
        )
        let rightToLeftHeading = rightToLeft.staticTexts["brand-heading"]
        XCTAssertTrue(rightToLeftHeading.waitForExistence(timeout: 5))
        let rightToLeftWindow = rightToLeft.windows.element(boundBy: 0)
        XCTAssertTrue(rightToLeftWindow.exists)
        XCTAssertGreaterThan(rightToLeftHeading.frame.width, 0)
        XCTAssertGreaterThan(rightToLeftHeading.frame.midX, rightToLeftWindow.frame.midX)
        XCTAssertTrue(rightToLeft.buttons["review-build-button"].isHittable)
    }

    func testExpandedLocalizationKeepsThePrimaryActionVisible() {
        let app = launch(
            state: "signed_out",
            arguments: ["-NSDoubleLocalizedStrings", "YES"]
        )

        let action = app.buttons["review-build-button"]
        XCTAssertTrue(action.waitForExistence(timeout: 5))
        XCTAssertTrue(action.isHittable)
        XCTAssertNotEqual(action.label, "Review build status")
    }

    func testAccessibleNamesAndReadingOrderAreStable() {
        let app = launch(state: "signed_out")

        let heading = app.staticTexts["Foundation ready"]
        let action = app.buttons["review-build-button"]
        let boundary = app.staticTexts["foundation-boundary"]
        XCTAssertTrue(heading.waitForExistence(timeout: 5))
        XCTAssertEqual(action.label, "Review build status")
        XCTAssertTrue(action.isHittable)
        XCTAssertTrue(boundary.exists)
        XCTAssertLessThan(heading.frame.minY, action.frame.minY)
        XCTAssertLessThan(action.frame.minY, boundary.frame.minY)
    }

    func testNaturalDebugLaunchRendersAnInternalMarker() {
        resetOrientation()
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["signed-out-state"].waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["build-marker"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["error-state"].exists)
    }

    func testNaturalInvalidConfigurationFailsClosed() {
        resetOrientation()
        let app = XCUIApplication()
        app.launchEnvironment["FLUYO_UI_TEST_CONFIGURATION"] = "invalid"
        app.launch()

        XCTAssertTrue(app.staticTexts["error-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["retry-button"].isHittable)
        XCTAssertFalse(app.staticTexts["build-marker"].exists)
    }

    func testDarkAppearanceKeepsStateAndActionVisible() {
        let app = launch(
            state: "signed_out",
            arguments: ["-AppleInterfaceStyle", "Dark"]
        )

        XCTAssertTrue(app.staticTexts["signed-out-state"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["review-build-button"].isHittable)
    }

    private func launch(state: String, arguments: [String] = []) -> XCUIApplication {
        resetOrientation()
        let app = XCUIApplication()
        app.launchEnvironment["FLUYO_UI_TEST_STATE"] = state
        app.launchArguments += arguments
        app.launch()
        return app
    }

    private func resetOrientation() {
        XCUIDevice.shared.orientation = .portrait
    }
}
