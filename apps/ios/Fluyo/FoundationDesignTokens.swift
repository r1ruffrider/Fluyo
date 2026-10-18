import Foundation
import SwiftUI

struct FoundationColorToken: Equatable, Sendable {
    let red: Double
    let green: Double
    let blue: Double

    var color: Color {
        Color(red: red, green: green, blue: blue)
    }

    func contrastRatio(against background: FoundationColorToken) -> Double {
        let lighter = max(relativeLuminance, background.relativeLuminance)
        let darker = min(relativeLuminance, background.relativeLuminance)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private var relativeLuminance: Double {
        let components = [red, green, blue].map { component in
            component <= 0.03928
                ? component / 12.92
                : pow((component + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * components[0] + 0.7152 * components[1] + 0.0722 * components[2]
    }
}

enum FoundationDesignTokens {
    static let cobalt = FoundationColorToken(red: 0.08, green: 0.20, blue: 0.55)
    static let cobaltForDarkAppearance = FoundationColorToken(red: 0.65, green: 0.80, blue: 1.0)
    static let coral = FoundationColorToken(red: 0.92, green: 0.30, blue: 0.24)
    static let lightCanvas = FoundationColorToken(red: 0.95, green: 0.95, blue: 0.97)
    static let darkCanvas = FoundationColorToken(red: 0.0, green: 0.0, blue: 0.0)
    static let actionForeground = FoundationColorToken(red: 1.0, green: 1.0, blue: 1.0)

    static func headingColor(for colorScheme: ColorScheme) -> Color {
        switch colorScheme {
        case .dark:
            cobaltForDarkAppearance.color
        default:
            cobalt.color
        }
    }
}
