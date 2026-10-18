import XCTest
@testable import Fluyo

final class AppConfigurationTests: XCTestCase {
    func testDevelopmentConfigurationUsesOnlyPublicNonProductionValues() throws {
        let configuration = try AppConfiguration.load(
            infoDictionary: baseInfo,
            processEnvironment: publicEnvironment(environment: "development")
        )

        XCTAssertEqual(configuration.environment, .development)
        XCTAssertTrue(configuration.networkEnabled)
        XCTAssertTrue(configuration.isInternal)
        XCTAssertEqual(configuration.apiBaseURL?.absoluteString, "https://api.example.test/api/v1")
        XCTAssertNotNil(configuration.buildMarker)
    }

    func testStagingConfigurationUsesOnlyPublicNonProductionValues() throws {
        let configuration = try AppConfiguration.load(
            infoDictionary: baseInfo,
            processEnvironment: publicEnvironment(environment: "staging")
        )

        XCTAssertEqual(configuration.environment, .staging)
        XCTAssertEqual(configuration.buildMarker?.environment, .staging)
    }

    func testReleaseConfigurationIsInertAndHasNoMarker() throws {
        var values = baseInfo
        values["FluyoEnvironment"] = "release"
        values["FluyoConfigurationClassification"] = AppConfiguration.inertReleaseClassification
        values["FluyoNetworkEnabled"] = false
        values["FluyoInternalBuild"] = false

        let configuration = try AppConfiguration.load(infoDictionary: values, processEnvironment: [:])

        XCTAssertEqual(configuration.environment, .release)
        XCTAssertFalse(configuration.networkEnabled)
        XCTAssertNil(configuration.apiBaseURL)
        XCTAssertNil(configuration.supabaseURL)
        XCTAssertNil(configuration.supabasePublishableKey)
        XCTAssertNil(configuration.buildMarker)
    }

    func testMissingPublicConfigurationFailsClosed() {
        var values = baseInfo
        values["FluyoEnvironment"] = "development"
        values["FluyoConfigurationClassification"] = AppConfiguration.publicNonProductionClassification
        values["FluyoNetworkEnabled"] = true
        values["FluyoInternalBuild"] = true

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values, processEnvironment: [:])) {
            XCTAssertEqual($0 as? AppConfigurationError, .missingPublicConfiguration)
        }
    }

    func testReleaseCannotEnableNetworking() {
        var values = baseInfo
        values["FluyoEnvironment"] = "release"
        values["FluyoConfigurationClassification"] = AppConfiguration.inertReleaseClassification
        values["FluyoNetworkEnabled"] = true
        values["FluyoInternalBuild"] = false

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values, processEnvironment: [:])) {
            XCTAssertEqual($0 as? AppConfigurationError, .invalidNetworkPolicy)
        }
    }

    func testPrivilegedLookingClientValueIsRejected() {
        var environment = publicEnvironment(environment: "development")
        environment["FluyoSupabasePublishableKey"] = "sk_test_forbidden"

        XCTAssertThrowsError(
            try AppConfiguration.load(infoDictionary: baseInfo, processEnvironment: environment)
        ) {
            XCTAssertEqual($0 as? AppConfigurationError, .invalidPublicConfiguration)
        }
    }

    private var baseInfo: [String: Any] {
        [
            "CFBundleShortVersionString": "0.1.0",
            "CFBundleVersion": "1",
            "FluyoSourceCommitShort": "4dc05e8",
        ]
    }

    private func publicEnvironment(environment: String) -> [String: String] {
        [
            "FluyoEnvironment": environment,
            "FluyoConfigurationClassification": AppConfiguration.publicNonProductionClassification,
            "FluyoNetworkEnabled": "YES",
            "FluyoInternalBuild": "YES",
            "FluyoAPIBaseURL": "https://api.example.test/api/v1",
            "FluyoSupabaseURL": "https://auth.example.test",
            "FluyoSupabasePublishableKey": "synthetic_publishable_value",
        ]
    }
}
