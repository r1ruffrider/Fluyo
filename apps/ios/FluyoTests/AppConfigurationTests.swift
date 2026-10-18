import XCTest
@testable import Fluyo

final class AppConfigurationTests: XCTestCase {
    func testDevelopmentConfigurationUsesOnlyPublicNonProductionValues() throws {
        let configuration = try AppConfiguration.load(
            infoDictionary: publicInfo(environment: "development")
        )

        XCTAssertEqual(configuration.environment, .development)
        XCTAssertTrue(configuration.networkEnabled)
        XCTAssertTrue(configuration.isInternal)
        XCTAssertEqual(configuration.apiBaseURL?.absoluteString, "https://api.example.test/api/v1")
        XCTAssertNotNil(configuration.buildMarker)
    }

    func testStagingConfigurationUsesOnlyPublicNonProductionValues() throws {
        let configuration = try AppConfiguration.load(
            infoDictionary: publicInfo(environment: "staging")
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

        let configuration = try AppConfiguration.load(infoDictionary: values)

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

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values)) {
            XCTAssertEqual($0 as? AppConfigurationError, .missingPublicConfiguration)
        }
    }

    func testReleaseCannotEnableNetworking() {
        var values = baseInfo
        values["FluyoEnvironment"] = "release"
        values["FluyoConfigurationClassification"] = AppConfiguration.inertReleaseClassification
        values["FluyoNetworkEnabled"] = true
        values["FluyoInternalBuild"] = false

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values)) {
            XCTAssertEqual($0 as? AppConfigurationError, .invalidNetworkPolicy)
        }
    }

    func testPrivilegedLookingClientValueIsRejected() {
        var values = publicInfo(environment: "development")
        values["FluyoSupabasePublishableKey"] = "sk_test_forbidden"

        XCTAssertThrowsError(
            try AppConfiguration.load(infoDictionary: values)
        ) {
            XCTAssertEqual($0 as? AppConfigurationError, .invalidPublicConfiguration)
        }
    }

    func testReleaseMissingBuildIdentityFailsClosed() {
        var values: [String: Any] = [
            "FluyoEnvironment": "release",
            "FluyoConfigurationClassification": AppConfiguration.inertReleaseClassification,
            "FluyoNetworkEnabled": false,
            "FluyoInternalBuild": false,
        ]
        values["CFBundleShortVersionString"] = nil

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values)) {
            XCTAssertEqual($0 as? AppConfigurationError, .invalidBuildMarker)
        }
    }

    func testProductionHostIsRejectedFromInternalConfiguration() {
        var values = publicInfo(environment: "staging")
        values["FluyoAPIBaseURL"] = "https://api.fluyo.com/api/v1"

        XCTAssertThrowsError(try AppConfiguration.load(infoDictionary: values)) {
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

    private func publicInfo(environment: String) -> [String: Any] {
        baseInfo.merging([
            "FluyoEnvironment": environment,
            "FluyoConfigurationClassification": AppConfiguration.publicNonProductionClassification,
            "FluyoNetworkEnabled": "YES",
            "FluyoInternalBuild": "YES",
            "FluyoAPIBaseURL": "https://api.example.test/api/v1",
            "FluyoSupabaseURL": "https://auth.example.test",
            "FluyoSupabasePublishableKey": "synthetic_publishable_value",
        ]) { _, new in new }
    }
}
