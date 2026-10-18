import Foundation

enum FluyoEnvironment: String, CaseIterable, Sendable {
    case development
    case staging
    case release
}

enum AppConfigurationError: Error, Equatable, Sendable {
    case invalidEnvironment
    case invalidClassification
    case invalidNetworkPolicy
    case missingPublicConfiguration
    case invalidPublicConfiguration
    case invalidBuildMarker
}

struct BuildMarker: Equatable, Sendable {
    let environment: FluyoEnvironment
    let semanticVersion: String
    let buildNumber: String
    let sourceCommitShort: String

    var displayValue: String {
        "\(environment.rawValue) • internal • \(semanticVersion) (\(buildNumber)) • \(sourceCommitShort)"
    }
}

struct AppConfiguration: Equatable, Sendable {
    static let publicNonProductionClassification = "public_non_production_only"
    static let inertReleaseClassification = "inert_until_release_gate"

    let environment: FluyoEnvironment
    let networkEnabled: Bool
    let isInternal: Bool
    let apiBaseURL: URL?
    let supabaseURL: URL?
    let supabasePublishableKey: String?
    let semanticVersion: String
    let buildNumber: String
    let sourceCommitShort: String

    var buildMarker: BuildMarker? {
        guard environment != .release, isInternal else { return nil }
        return BuildMarker(
            environment: environment,
            semanticVersion: semanticVersion,
            buildNumber: buildNumber,
            sourceCommitShort: sourceCommitShort
        )
    }

    static func load(
        infoDictionary: [String: Any] = Bundle.main.infoDictionary ?? [:],
        processEnvironment: [String: String] = ProcessInfo.processInfo.environment
    ) throws -> AppConfiguration {
        let values = ConfigurationValues(
            infoDictionary: infoDictionary,
            processEnvironment: processEnvironment
        )

        guard
            let environmentValue = values.string(environmentKey),
            let environment = FluyoEnvironment(rawValue: environmentValue)
        else {
            throw AppConfigurationError.invalidEnvironment
        }

        guard
            let classification = values.string(classificationKey),
            let networkEnabled = values.boolean(networkEnabledKey),
            let isInternal = values.boolean(internalBuildKey)
        else {
            throw AppConfigurationError.invalidNetworkPolicy
        }

        let semanticVersion = values.string(semanticVersionKey) ?? ""
        let buildNumber = values.string(buildNumberKey) ?? ""
        let sourceCommitShort = values.string(sourceCommitKey) ?? ""

        if environment == .release {
            guard classification == inertReleaseClassification, !networkEnabled, !isInternal else {
                throw AppConfigurationError.invalidNetworkPolicy
            }
            return AppConfiguration(
                environment: environment,
                networkEnabled: false,
                isInternal: false,
                apiBaseURL: nil,
                supabaseURL: nil,
                supabasePublishableKey: nil,
                semanticVersion: semanticVersion,
                buildNumber: buildNumber,
                sourceCommitShort: sourceCommitShort
            )
        }

        guard classification == publicNonProductionClassification else {
            throw AppConfigurationError.invalidClassification
        }
        guard networkEnabled, isInternal else {
            throw AppConfigurationError.invalidNetworkPolicy
        }
        guard
            let apiBaseURL = values.url(apiBaseURLKey),
            let supabaseURL = values.url(supabaseURLKey),
            let publishableKey = values.string(supabasePublishableKey),
            !publishableKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            throw AppConfigurationError.missingPublicConfiguration
        }
        guard
            isPublicHTTPSURL(apiBaseURL),
            isPublicHTTPSURL(supabaseURL),
            isPublishableClientValue(publishableKey)
        else {
            throw AppConfigurationError.invalidPublicConfiguration
        }
        guard
            semanticVersion.wholeMatch(of: /[0-9]+\.[0-9]+\.[0-9]+/) != nil,
            buildNumber.wholeMatch(of: /[0-9]{1,18}/) != nil,
            sourceCommitShort.wholeMatch(of: /[0-9a-f]{7,12}/) != nil
        else {
            throw AppConfigurationError.invalidBuildMarker
        }

        return AppConfiguration(
            environment: environment,
            networkEnabled: true,
            isInternal: true,
            apiBaseURL: apiBaseURL,
            supabaseURL: supabaseURL,
            supabasePublishableKey: publishableKey,
            semanticVersion: semanticVersion,
            buildNumber: buildNumber,
            sourceCommitShort: sourceCommitShort
        )
    }

    private static func isPublicHTTPSURL(_ value: URL) -> Bool {
        guard value.scheme?.lowercased() == "https", let host = value.host?.lowercased() else {
            return false
        }
        return host != "localhost" && host != "127.0.0.1" && host != "::1"
    }

    private static func isPublishableClientValue(_ value: String) -> Bool {
        let normalized = value.lowercased()
        return !normalized.contains("secret") &&
            !normalized.hasPrefix("sk_") &&
            !normalized.hasPrefix("rk_") &&
            !normalized.contains("service-role")
    }

    private static let environmentKey = "FluyoEnvironment"
    private static let classificationKey = "FluyoConfigurationClassification"
    private static let networkEnabledKey = "FluyoNetworkEnabled"
    private static let internalBuildKey = "FluyoInternalBuild"
    private static let apiBaseURLKey = "FluyoAPIBaseURL"
    private static let supabaseURLKey = "FluyoSupabaseURL"
    private static let supabasePublishableKey = "FluyoSupabasePublishableKey"
    private static let semanticVersionKey = "CFBundleShortVersionString"
    private static let buildNumberKey = "CFBundleVersion"
    private static let sourceCommitKey = "FluyoSourceCommitShort"
}

private struct ConfigurationValues {
    let infoDictionary: [String: Any]
    let processEnvironment: [String: String]

    func string(_ key: String) -> String? {
        if let value = processEnvironment[key], !value.isEmpty {
            return value
        }
        if let value = infoDictionary[key] as? String, !value.isEmpty {
            return value
        }
        return nil
    }

    func boolean(_ key: String) -> Bool? {
        if let value = processEnvironment[key] {
            return parseBoolean(value)
        }
        if let value = infoDictionary[key] as? Bool {
            return value
        }
        if let value = infoDictionary[key] as? String {
            return parseBoolean(value)
        }
        return nil
    }

    func url(_ key: String) -> URL? {
        guard let rawValue = string(key) else { return nil }
        return URL(string: rawValue)
    }

    private func parseBoolean(_ value: String) -> Bool? {
        switch value.lowercased() {
        case "1", "true", "yes":
            return true
        case "0", "false", "no":
            return false
        default:
            return nil
        }
    }
}
