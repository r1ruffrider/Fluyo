import XCTest
@testable import Fluyo

@MainActor
final class FoundationDesignTokensTests: XCTestCase {
    func testBrandAndActionColorsMeetContrastInLightAndDarkAppearances() {
        XCTAssertGreaterThanOrEqual(
            FoundationDesignTokens.cobalt.contrastRatio(against: FoundationDesignTokens.lightCanvas),
            7.0
        )
        XCTAssertGreaterThanOrEqual(
            FoundationDesignTokens.cobaltForDarkAppearance.contrastRatio(
                against: FoundationDesignTokens.darkCanvas
            ),
            7.0
        )
        XCTAssertGreaterThanOrEqual(
            FoundationDesignTokens.actionForeground.contrastRatio(
                against: FoundationDesignTokens.cobalt
            ),
            7.0
        )
    }
}
