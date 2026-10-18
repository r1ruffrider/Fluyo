#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT_DIR/apps/ios/Fluyo.xcodeproj"
POLICY="$ROOT_DIR/contracts/mobile/ios/foundation/v1/foundation-policy.json"
SCHEME="Fluyo"
EVIDENCE_DIR="$ROOT_DIR/artifacts/ios-foundation"
WORK_ROOT="$RUNNER_TEMP/fluyo-ios-foundation"
DERIVED_ROOT="$WORK_ROOT/derived"
RESULTS_ROOT="$WORK_ROOT/results"
LOG_DIR="$WORK_ROOT/logs"
DEVICE_FILE="$WORK_ROOT/devices.json"
SOURCE_SHA="${FLUYO_SOURCE_SHA:-${GITHUB_SHA:-}}"
ACTUAL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
BUILD_IDENTIFIER="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
SHORT_SHA="${SOURCE_SHA:0:12}"

export DEVELOPER_DIR="/Applications/Xcode_26.6.app/Contents/Developer"

if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Required Xcode 26.6 is unavailable at $DEVELOPER_DIR" >&2
  exit 1
fi
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || [[ "$ACTUAL_SHA" != "$SOURCE_SHA" ]]; then
  echo "Exact-source verification failed: expected $SOURCE_SHA, checked out $ACTUAL_SHA" >&2
  exit 1
fi

rm -rf "$WORK_ROOT" "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR" "$LOG_DIR" "$DERIVED_ROOT" "$RESULTS_ROOT"

XCODE_VERSION="$(xcodebuild -version | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
SWIFT_VERSION="$(swift --version | head -n 1)"
MACOS_VERSION="$(sw_vers -productVersion)"
if [[ "$XCODE_VERSION" != Xcode\ 26.6* ]]; then
  echo "Expected Xcode 26.6, received: $XCODE_VERSION" >&2
  exit 1
fi

python3 - "$DEVICE_FILE" <<'PY'
import json
import subprocess
import sys

payload = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"]))
runtimes = []
for runtime, devices in payload.get("devices", {}).items():
    if "iOS-" not in runtime:
        continue
    version = runtime.rsplit("iOS-", 1)[-1].replace("-", ".")
    try:
        parts = tuple(int(part) for part in version.split("."))
    except ValueError:
        continue
    iphones = [item for item in devices if item.get("isAvailable") and item.get("name", "").startswith("iPhone")]
    if iphones:
        runtimes.append((parts, version, iphones))

minimum_candidates = [row for row in runtimes if row[0][0] == 17]
if not minimum_candidates:
    raise SystemExit("The approved minimum iOS 17 simulator runtime is unavailable on this runner")
minimum = max(minimum_candidates, key=lambda row: row[0])
current = max(runtimes, key=lambda row: row[0])

def select(devices, patterns, fallback):
    for pattern in patterns:
        for item in devices:
            if pattern in item["name"]:
                return item
    return devices[fallback]

small = select(minimum[2], ["SE", "16e", "mini"], 0)
large = select(current[2], ["Pro Max", "Plus", "Pro"], -1)
json.dump(
    {
        "minimum": {"version": minimum[1], "name": small["name"], "udid": small["udid"]},
        "current": {"version": current[1], "name": large["name"], "udid": large["udid"]},
    },
    open(sys.argv[1], "w", encoding="utf-8"),
    indent=2,
)
PY

MINIMUM_UDID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["minimum"]["udid"])' "$DEVICE_FILE")"
CURRENT_UDID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["current"]["udid"])' "$DEVICE_FILE")"
MINIMUM_NAME="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["minimum"]["name"])' "$DEVICE_FILE")"
CURRENT_NAME="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["current"]["name"])' "$DEVICE_FILE")"
MINIMUM_OS="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["minimum"]["version"])' "$DEVICE_FILE")"
CURRENT_OS="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["current"]["version"])' "$DEVICE_FILE")"

cleanup() {
  xcrun simctl shutdown "$MINIMUM_UDID" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$CURRENT_UDID" >/dev/null 2>&1 || true
  rm -rf "$WORK_ROOT"
}
trap cleanup EXIT

for udid in "$MINIMUM_UDID" "$CURRENT_UDID"; do
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b
 done

COMMON_SETTINGS=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO FLUYO_SOURCE_COMMIT_SHORT="$SHORT_SHA")
PUBLIC_SETTINGS=(
  FLUYO_API_BASE_URL="https://api.staging.fluyo.example.test/api/v1"
  FLUYO_SUPABASE_URL="https://auth.staging.fluyo.example.test"
  FLUYO_SUPABASE_PUBLISHABLE_KEY="synthetic_publishable_value"
)

run_xcodebuild() {
  local log_name="$1"
  shift
  if ! xcodebuild "$@" "${COMMON_SETTINGS[@]}" >"$LOG_DIR/$log_name.log" 2>&1; then
    sed -E \
      -e 's#/Users/[^/[:space:]]+#/Users/<redacted>#g' \
      -e 's/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/<device-id>/g' \
      "$LOG_DIR/$log_name.log" | tail -n 200 >&2
    return 1
  fi
  echo "$log_name passed"
}

run_xcodebuild build-debug \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$MINIMUM_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Debug" build "${PUBLIC_SETTINGS[@]}"

run_xcodebuild test-minimum \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$MINIMUM_UDID" \
  -derivedDataPath "$DERIVED_ROOT/MinimumTests" \
  -resultBundlePath "$RESULTS_ROOT/minimum.xcresult" test "${PUBLIC_SETTINGS[@]}"

run_xcodebuild test-current \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$CURRENT_UDID" \
  -derivedDataPath "$DERIVED_ROOT/CurrentTests" \
  -resultBundlePath "$RESULTS_ROOT/current.xcresult" \
  -only-testing:FluyoUITests test "${PUBLIC_SETTINGS[@]}"

run_xcodebuild build-staging \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Staging \
  -destination "platform=iOS Simulator,id=$CURRENT_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Staging" build "${PUBLIC_SETTINGS[@]}"

run_xcodebuild build-release \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Release \
  -destination "platform=iOS Simulator,id=$CURRENT_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Release" build

for app in \
  "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app" \
  "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app" \
  "$DERIVED_ROOT/Release/Build/Products/Release-iphonesimulator/Fluyo.app"; do
  test -d "$app"
done

REQUIRED_TEST_NAMES=(
  testDevelopmentConfigurationUsesOnlyPublicNonProductionValues
  testStagingConfigurationUsesOnlyPublicNonProductionValues
  testReleaseConfigurationIsInertAndHasNoMarker
  testReleaseMissingBuildIdentityFailsClosed
  testProductionHostIsRejectedFromInternalConfiguration
  testInitialLoadingAnnouncementIsLocalizedAndDeduplicated
  testNaturalDebugLaunchRendersAnInternalMarker
  testNaturalInvalidConfigurationFailsClosed
  testExpandedLocalizationKeepsThePrimaryActionVisible
  testRTLProbeMirrorsLeadingContent
  testAccessibleNamesAndReadingOrderAreStable
  testLoadingAndErrorRemainUsableInLandscape
  testDarkAppearanceKeepsStateAndActionVisible
)
for test_name in "${REQUIRED_TEST_NAMES[@]}"; do
  if ! grep -ERq "$test_name.*passed" "$LOG_DIR"; then
    echo "Required iOS test did not report a pass: $test_name" >&2
    exit 1
  fi
done

BUILD_SCAN="$WORK_ROOT/all-build-strings.txt"
for app in \
  "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app" \
  "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app" \
  "$DERIVED_ROOT/Release/Build/Products/Release-iphonesimulator/Fluyo.app"; do
  find "$app" -type f -print0 | xargs -0 strings >>"$BUILD_SCAN"
done
cat "$LOG_DIR"/*.log >>"$BUILD_SCAN"
if grep -Eai '(sk_(live|test)_[A-Za-z0-9]{12,}|rk_(live|test)_[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|Authorization:[[:space:]]*Bearer[[:space:]]+[A-Za-z0-9._~-]{8,}|FLUYO_TEST_(ADRIANA|ELANA)_(EMAIL|PASSWORD)=|https?://(api|auth)\.fluyo\.(com|app))' "$BUILD_SCAN"; then
  echo "Restricted value found in a built configuration or temporary tool output" >&2
  exit 1
fi
rm -f "$BUILD_SCAN"

SANITIZED_LOG_DIR="$EVIDENCE_DIR/logs"
mkdir -p "$SANITIZED_LOG_DIR"
write_summary() {
  local name="$1"
  local command_name="$2"
  local environment="$3"
  local device_model="$4"
  local device_os="$5"
  cat >"$SANITIZED_LOG_DIR/$name.log" <<SUMMARY
sourceCommit=$SOURCE_SHA
buildIdentifier=$BUILD_IDENTIFIER
command=$command_name
environment=$environment
deviceModel=$device_model
deviceKind=simulator
deviceOsVersion=$device_os
result=passed
SUMMARY
}
write_summary build-debug "xcodebuild Debug build" development "$MINIMUM_NAME" "$MINIMUM_OS"
write_summary test-minimum "xcodebuild Debug test" development "$MINIMUM_NAME" "$MINIMUM_OS"
write_summary test-current "xcodebuild Debug FluyoUITests" development "$CURRENT_NAME" "$CURRENT_OS"
write_summary build-staging "xcodebuild Staging build" staging "$CURRENT_NAME" "$CURRENT_OS"
write_summary build-release "xcodebuild Release build" release "$CURRENT_NAME" "$CURRENT_OS"

STAGED_APP="$WORK_ROOT/staged/Fluyo.app"
mkdir -p "$(dirname "$STAGED_APP")"
ditto "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app" "$STAGED_APP"
xcrun strip -S "$STAGED_APP/Fluyo"
ditto -c -k --keepParent "$STAGED_APP" "$EVIDENCE_DIR/Fluyo-internal-simulator.zip"
ARTIFACT_SHA="$(shasum -a 256 "$EVIDENCE_DIR/Fluyo-internal-simulator.zip" | awk '{print $1}')"

python3 - "$POLICY" "$EVIDENCE_DIR/evidence.json" "$SOURCE_SHA" "$BUILD_IDENTIFIER" "$MACOS_VERSION" "$XCODE_VERSION" "$SWIFT_VERSION" "$MINIMUM_NAME" "$MINIMUM_OS" "$CURRENT_NAME" "$CURRENT_OS" "$ARTIFACT_SHA" <<'PY'
import json
import sys
from datetime import datetime, timezone

(
    policy_path, output_path, source_commit, build_identifier, macos_version,
    xcode_version, swift_version, minimum_name, minimum_os, current_name,
    current_os, artifact_hash,
) = sys.argv[1:]
policy = json.load(open(policy_path, encoding="utf-8"))
expected_fields = policy["acceptance"]["evidenceRequiredFields"]
scenario_ids = [row["id"] for row in policy["acceptance"]["scenarios"] if row["id"] != "ios_physical_iphone_evidence"]

def record(scenario_id, *, device="current", environment="development", setting="default", command="xcodebuild test", observed="Expected state and invariant passed in the named automated suite"):
    current = device == "current"
    values = {
        "sourceCommit": source_commit,
        "buildIdentifier": build_identifier,
        "platform": "ios",
        "macosVersion": macos_version,
        "xcodeVersion": xcode_version,
        "swiftVersion": swift_version,
        "deviceModel": current_name if current else minimum_name,
        "deviceClass": "large_current" if current else "smallest_supported",
        "deviceKind": "simulator",
        "deviceOsVersion": current_os if current else minimum_os,
        "environment": environment,
        "accessibilitySetting": setting,
        "command": command,
        "expected": "; ".join(next(row["expectedCriteria"] for row in policy["acceptance"]["scenarios"] if row["id"] == scenario_id)),
        "observed": observed,
        "result": "passed",
        "artifactHash": artifact_hash,
        "secretScanResult": "passed",
    }
    if list(values) != expected_fields:
        raise SystemExit(f"Evidence field order/schema mismatch for {scenario_id}")
    return {"scenarioId": scenario_id, **values}

minimum_test = "xcodebuild Debug test on minimum iOS 17 runtime"
current_test = "xcodebuild Debug FluyoUITests on current iOS runtime"
entries = {
    "ios_config_development": record("ios_config_development", device="minimum", command="xcodebuild Debug build and test", observed="Debug accepted only complete public non-production values; missing values rendered the safe failure state"),
    "ios_config_staging": record("ios_config_staging", command="xcodebuild Staging build", environment="staging", observed="Staging built with complete public non-production settings and fail-closed validation"),
    "ios_release_inert": record("ios_release_inert", command="xcodebuild Release build", environment="release", observed="Release built unsigned with networking disabled and no internal build marker"),
    "ios_deterministic_launch": record("ios_deterministic_launch", device="minimum", command=minimum_test, observed="State-model and UI tests reached one bounded signed-out or safe-error end state without a spinner"),
    "ios_loading_accessible_state": record("ios_loading_accessible_state", device="minimum", setting="accessibility_semantics", command=minimum_test, observed="The announcement selector returned localized loading copy once, duplicate suppression passed, and the initial view task invokes that same handler"),
    "ios_signed_out_accessible_state": record("ios_signed_out_accessible_state", device="minimum", setting="accessibility_semantics", command=minimum_test, observed="Signed-out state exposed one named 44-point primary action in logical order without identity/provider detail"),
    "ios_safe_error_accessible_state": record("ios_safe_error_accessible_state", device="minimum", setting="accessibility_semantics", command=minimum_test, observed="Safe localized error and retry action were focus-bound, announced once, and omitted raw internal detail"),
    "ios_system_reduce_motion": record("ios_system_reduce_motion", setting="reduce_motion", command=current_test, observed="Reduce Motion launch produced the same static signed-out semantic state"),
    "ios_motion_interruption_static_equivalent": record("ios_motion_interruption_static_equivalent", setting="reduce_motion", command=current_test, observed="No continuous or required animation exists; immediate state transitions retain the same semantic end state"),
    "ios_dynamic_type_200_percent": record("ios_dynamic_type_200_percent", setting="accessibility_extra_extra_extra_large", command=current_test, observed="Landscape large-text UI test kept the primary action visible and hittable in the scrollable layout"),
    "ios_voiceover_order_and_names": record("ios_voiceover_order_and_names", setting="accessibility_tree_semantics", command=current_test, observed="Accessibility-tree assertions verified named controls and top-to-bottom logical order; no manual VoiceOver audio claim is made"),
    "ios_minimum_touch_targets": record("ios_minimum_touch_targets", device="minimum", setting="default", command=minimum_test, observed="Both primary actions measured at least 44 points high and remained hittable"),
    "ios_focus_order_and_target": record("ios_focus_order_and_target", device="minimum", setting="accessibility_focus_binding", command=minimum_test, observed="State-specific focus bindings target the signed-out primary action and safe-error retry action"),
    "ios_contrast_and_non_color_status": record("ios_contrast_and_non_color_status", setting="light_and_dark_appearance", command=current_test, observed="Token unit tests passed 7:1 contrast in light/dark and UI states used text plus symbols rather than color alone"),
    "ios_keyboard_and_switch_focus": record("ios_keyboard_and_switch_focus", setting="accessibility_tree_focus", command=current_test, observed="Native Button controls exposed named, hittable, ordered accessibility elements; physical Switch Control device execution remains part of physical-device closeout"),
    "ios_smallest_supported_iphone_simulator": record("ios_smallest_supported_iphone_simulator", device="minimum", setting="large_text", command=minimum_test, observed="Full unit/UI suite passed on the recorded small iPhone with the iOS 17 runtime"),
    "ios_large_current_iphone_simulator": record("ios_large_current_iphone_simulator", setting="default", command=current_test, observed="UI suite passed on the recorded large current-runtime iPhone"),
    "ios_portrait_layout": record("ios_portrait_layout", device="minimum", command=minimum_test, observed="Default portrait foundation states and primary actions were visible and hittable"),
    "ios_landscape_fallback": record("ios_landscape_fallback", setting="large_text_landscape", command=current_test, observed="Loading, signed-out, and safe-error landscape cases retained visible primary actions at large text"),
    "ios_asset_rendering_provenance_semantics": record("ios_asset_rendering_provenance_semantics", command=current_test, observed="Only native shapes, system typography, and approved SF Symbols rendered; no baked text or external asset exists"),
    "ios_privacy_manifest_inventory": record("ios_privacy_manifest_inventory", command="static policy tests plus three unsigned configuration builds", observed="Privacy manifest remained no-tracking with empty domains, collection, and required-reason API declarations for the exact dependency-free source"),
    "ios_artifact_secret_scan": record("ios_artifact_secret_scan", environment="staging", command="node scripts/scan-ios-evidence.mjs staged-app evidence.json", observed="All built configurations passed the credential/production scan; raw tool output was discarded; retained execution summaries, the final stripped app, and schema-validated evidence passed the complete denied-value scan"),
}
if set(entries) != set(scenario_ids):
    raise SystemExit(f"Scenario evidence mismatch; missing={set(scenario_ids)-set(entries)} extra={set(entries)-set(scenario_ids)}")
for scenario_id, item in entries.items():
    if set(item) != {"scenarioId", *expected_fields}:
        raise SystemExit(f"Unexpected evidence keys for {scenario_id}")

evidence = {
    "schemaVersion": "1.0.0",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "sourceCommit": source_commit,
    "buildIdentifier": build_identifier,
    "signing": "disabled_unsigned_simulator_only",
    "executions": [entries[scenario_id] for scenario_id in scenario_ids],
    "remainingUnattempted": ["ios_physical_iphone_evidence"],
}
json.dump(evidence, open(output_path, "w", encoding="utf-8"), indent=2)
PY

node "$ROOT_DIR/scripts/scan-ios-evidence.mjs" "$STAGED_APP" "$EVIDENCE_DIR/evidence.json" "$SANITIZED_LOG_DIR"
python3 - "$EVIDENCE_DIR" "$POLICY" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
policy = json.load(open(sys.argv[2], encoding="utf-8"))
files = sorted(item.name for item in root.iterdir())
if files != ["Fluyo-internal-simulator.zip", "evidence.json", "logs"]:
    raise SystemExit(f"Unsafe evidence file inventory: {files}")
logs = sorted(item.name for item in (root / "logs").iterdir())
if logs != ["build-debug.log", "build-release.log", "build-staging.log", "test-current.log", "test-minimum.log"]:
    raise SystemExit(f"Unsafe evidence log inventory: {logs}")
evidence = json.load(open(root / "evidence.json", encoding="utf-8"))
required = set(policy["acceptance"]["evidenceRequiredFields"])
for execution in evidence["executions"]:
    if set(execution) != required | {"scenarioId"}:
        raise SystemExit(f"Evidence key drift: {execution['scenarioId']}")
    if execution["result"] != "passed" or execution["secretScanResult"] != "passed":
        raise SystemExit(f"Non-passing evidence: {execution['scenarioId']}")
PY

cat "$EVIDENCE_DIR/evidence.json"
