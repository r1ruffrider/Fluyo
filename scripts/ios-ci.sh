#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT_DIR/apps/ios/Fluyo.xcodeproj"
POLICY="$ROOT_DIR/contracts/mobile/ios/foundation/v1/foundation-policy.json"
SCHEME="Fluyo"
LEG="${FLUYO_IOS_EVIDENCE_LEG:?Set FLUYO_IOS_EVIDENCE_LEG to minimum or current}"
SOURCE_SHA="${FLUYO_SOURCE_SHA:-${GITHUB_SHA:-}}"
ACTUAL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
BUILD_IDENTIFIER="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$LEG"
SHORT_SHA="${SOURCE_SHA:0:12}"
EVIDENCE_DIR="$ROOT_DIR/artifacts/ios-$LEG"
WORK_ROOT="$RUNNER_TEMP/fluyo-ios-$LEG"
DERIVED_ROOT="$WORK_ROOT/derived"
RESULTS_ROOT="$WORK_ROOT/results"
LOG_DIR="$WORK_ROOT/logs"
DEVICE_FILE="$WORK_ROOT/device.json"
METADATA_FILE="$WORK_ROOT/metadata.json"

case "$LEG" in
  minimum)
    export DEVELOPER_DIR="${FLUYO_DEVELOPER_DIR:-/Applications/Xcode_16.2.app/Contents/Developer}"
    XCODE_PREFIX="${FLUYO_XCODE_PREFIX:-Xcode 16.2}"
    ;;
  current)
    export DEVELOPER_DIR="${FLUYO_DEVELOPER_DIR:-/Applications/Xcode_26.6.app/Contents/Developer}"
    XCODE_PREFIX="${FLUYO_XCODE_PREFIX:-Xcode 26.6}"
    ;;
  *)
    echo "Unsupported evidence leg: $LEG" >&2
    exit 2
    ;;
esac

if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Required Xcode is unavailable at $DEVELOPER_DIR" >&2
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
if [[ "$XCODE_VERSION" != "$XCODE_PREFIX"* ]]; then
  echo "Expected $XCODE_PREFIX, received: $XCODE_VERSION" >&2
  exit 1
fi

python3 - "$DEVICE_FILE" "$LEG" <<'PY'
import json
import subprocess
import sys

output_path, leg = sys.argv[1:]
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
    iphones = [
        item
        for item in devices
        if item.get("isAvailable") and item.get("name", "").startswith("iPhone")
    ]
    if iphones:
        runtimes.append((parts, version, iphones))

if leg == "minimum":
    candidates = [row for row in runtimes if row[0][0] == 17]
    if not candidates:
        raise SystemExit("The approved minimum iOS 17 simulator runtime is unavailable")
    selected = max(candidates, key=lambda row: row[0])
    patterns = ["SE", "mini"]
    device_class = "smallest_supported"
else:
    if not runtimes:
        raise SystemExit("No available iOS simulator runtime")
    selected = max(runtimes, key=lambda row: row[0])
    patterns = ["Pro Max", "Plus", "Pro"]
    device_class = "large_current"

device = next(
    (item for pattern in patterns for item in selected[2] if pattern in item["name"]),
    selected[2][0 if leg == "minimum" else -1],
)
json.dump(
    {
        "version": selected[1],
        "name": device["name"],
        "udid": device["udid"],
        "deviceClass": device_class,
    },
    open(output_path, "w", encoding="utf-8"),
    indent=2,
)
PY

DEVICE_UDID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["udid"])' "$DEVICE_FILE")"
DEVICE_NAME="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["name"])' "$DEVICE_FILE")"
DEVICE_OS="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$DEVICE_FILE")"
DEVICE_CLASS="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["deviceClass"])' "$DEVICE_FILE")"

cleanup() {
  xcrun simctl shutdown "$DEVICE_UDID" >/dev/null 2>&1 || true
  rm -rf "$WORK_ROOT"
}
trap cleanup EXIT

xcrun simctl boot "$DEVICE_UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$DEVICE_UDID" -b

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
    sed -E       -e 's#/Users/[^/[:space:]]+#/Users/<redacted>#g'       -e 's/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/<device-id>/g'       "$LOG_DIR/$log_name.log" | tail -n 200 >&2
    return 1
  fi
  echo "$log_name passed"
}

validate_app_configuration() {
  local app_path="$1"
  local expected_environment="$2"
  python3 - "$app_path/Info.plist" "$expected_environment" "$SHORT_SHA" <<'PY'
import plistlib
import sys

plist_path, expected_environment, expected_short_sha = sys.argv[1:]
with open(plist_path, "rb") as handle:
    values = plistlib.load(handle)

def fail(field):
    raise SystemExit(f"Built configuration failed validation for {field}")

def boolean(field):
    value = values.get(field)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.lower()
        if normalized in {"yes", "true", "1"}:
            return True
        if normalized in {"no", "false", "0"}:
            return False
    fail(field)

if values.get("FluyoEnvironment") != expected_environment:
    fail("FluyoEnvironment")
if values.get("CFBundleShortVersionString") != "0.1.0":
    fail("CFBundleShortVersionString")
if values.get("CFBundleVersion") != "1":
    fail("CFBundleVersion")
if values.get("FluyoSourceCommitShort") != expected_short_sha:
    fail("FluyoSourceCommitShort")

if expected_environment == "release":
    if values.get("FluyoConfigurationClassification") != "inert_until_release_gate":
        fail("FluyoConfigurationClassification")
    if boolean("FluyoNetworkEnabled") or boolean("FluyoInternalBuild"):
        fail("ReleaseNetworkPolicy")
    for field in ("FluyoAPIBaseURL", "FluyoSupabaseURL", "FluyoSupabasePublishableKey"):
        if values.get(field) not in (None, ""):
            fail(field)
else:
    if values.get("FluyoConfigurationClassification") != "public_non_production_only":
        fail("FluyoConfigurationClassification")
    if not boolean("FluyoNetworkEnabled") or not boolean("FluyoInternalBuild"):
        fail("InternalNetworkPolicy")
    expected = {
        "FluyoAPIBaseURL": "https://api.staging.fluyo.example.test/api/v1",
        "FluyoSupabaseURL": "https://auth.staging.fluyo.example.test",
        "FluyoSupabasePublishableKey": "synthetic_publishable_value",
    }
    for field, expected_value in expected.items():
        if values.get(field) != expected_value:
            fail(field)

print(f"validated {expected_environment} app configuration")
PY
}

if [[ "$LEG" == "minimum" ]]; then
  run_xcodebuild build-debug     -project "$PROJECT" -scheme "$SCHEME" -configuration Debug     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Debug" build "${PUBLIC_SETTINGS[@]}"
  validate_app_configuration "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app" development
  run_xcodebuild test-minimum     -project "$PROJECT" -scheme "$SCHEME" -configuration Debug     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Tests"     -resultBundlePath "$RESULTS_ROOT/minimum.xcresult" test "${PUBLIC_SETTINGS[@]}"
  validate_app_configuration "$DERIVED_ROOT/Tests/Build/Products/Debug-iphonesimulator/Fluyo.app" development
  APP_PATH="$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app"
  COMMAND_NAME="xcodebuild Debug build and full test on iOS 17"
else
  run_xcodebuild test-current     -project "$PROJECT" -scheme "$SCHEME" -configuration Debug     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Tests"     -resultBundlePath "$RESULTS_ROOT/current.xcresult" test "${PUBLIC_SETTINGS[@]}"
  run_xcodebuild build-debug     -project "$PROJECT" -scheme "$SCHEME" -configuration Debug     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Debug" build "${PUBLIC_SETTINGS[@]}"
  run_xcodebuild build-staging     -project "$PROJECT" -scheme "$SCHEME" -configuration Staging     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Staging" build "${PUBLIC_SETTINGS[@]}"
  run_xcodebuild build-release     -project "$PROJECT" -scheme "$SCHEME" -configuration Release     -destination "platform=iOS Simulator,id=$DEVICE_UDID"     -derivedDataPath "$DERIVED_ROOT/Release" build
  for app in     "$DERIVED_ROOT/Tests/Build/Products/Debug-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Release/Build/Products/Release-iphonesimulator/Fluyo.app"; do
    test -d "$app"
  done
  validate_app_configuration "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app" development
  validate_app_configuration "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app" staging
  validate_app_configuration "$DERIVED_ROOT/Release/Build/Products/Release-iphonesimulator/Fluyo.app" release
  APP_PATH="$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app"
  COMMAND_NAME="xcodebuild full test plus Debug, Staging, and inert Release builds"
fi
test -d "$APP_PATH"

REQUIRED_TEST_NAMES=(
  testDevelopmentConfigurationUsesOnlyPublicNonProductionValues
  testStagingConfigurationUsesOnlyPublicNonProductionValues
  testReleaseConfigurationIsInertAndHasNoMarker
  testReleaseMissingBuildIdentityFailsClosed
  testUnapprovedPublicHostIsRejectedFromInternalConfiguration
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
if [[ "$LEG" == "minimum" ]]; then
  find "$APP_PATH" -type f -print0 | xargs -0 strings >>"$BUILD_SCAN"
else
  for app in     "$DERIVED_ROOT/Tests/Build/Products/Debug-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Staging/Build/Products/Staging-iphonesimulator/Fluyo.app"     "$DERIVED_ROOT/Release/Build/Products/Release-iphonesimulator/Fluyo.app"; do
    find "$app" -type f -print0 | xargs -0 strings >>"$BUILD_SCAN"
  done
fi
cat "$LOG_DIR"/*.log >>"$BUILD_SCAN"
if grep -Eaiq '(sk_(live|test)_[A-Za-z0-9]{12,}|rk_(live|test)_[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|Authorization:[[:space:]]*Bearer[[:space:]]+[A-Za-z0-9._~-]{8,}|FLUYO_TEST_(ADRIANA|ELANA)_(EMAIL|PASSWORD)=|https?://(api|auth)\.fluyo\.(com|app))' "$BUILD_SCAN"; then
  echo "Restricted value found in a built configuration or temporary tool output" >&2
  exit 1
fi
rm -f "$BUILD_SCAN"

SANITIZED_LOG_DIR="$EVIDENCE_DIR/logs"
mkdir -p "$SANITIZED_LOG_DIR"
cat >"$SANITIZED_LOG_DIR/$LEG.log" <<SUMMARY
sourceCommit=$SOURCE_SHA
buildIdentifier=$BUILD_IDENTIFIER
command=$COMMAND_NAME
environment=development
deviceModel=$DEVICE_NAME
deviceClass=$DEVICE_CLASS
deviceKind=simulator
deviceOsVersion=$DEVICE_OS
result=passed
SUMMARY

STAGED_APP="$WORK_ROOT/staged/Fluyo.app"
mkdir -p "$(dirname "$STAGED_APP")"
ditto "$APP_PATH" "$STAGED_APP"
xcrun strip -S "$STAGED_APP/Fluyo"
ARTIFACT_NAME="Fluyo-$LEG-simulator.zip"
ditto -c -k --keepParent "$STAGED_APP" "$EVIDENCE_DIR/$ARTIFACT_NAME"

node "$ROOT_DIR/scripts/scan-ios-evidence.mjs" "$STAGED_APP" "$SANITIZED_LOG_DIR"

python3 - "$METADATA_FILE" "$SOURCE_SHA" "$BUILD_IDENTIFIER" "$MACOS_VERSION" "$XCODE_VERSION" "$SWIFT_VERSION" "$DEVICE_NAME" "$DEVICE_CLASS" "$DEVICE_OS" "$COMMAND_NAME" <<'PY'
import json
import sys

(
    output_path, source_commit, build_identifier, macos_version, xcode_version,
    swift_version, device_model, device_class, device_os_version, command,
) = sys.argv[1:]
json.dump(
    {
        "sourceCommit": source_commit,
        "buildIdentifier": build_identifier,
        "macosVersion": macos_version,
        "xcodeVersion": xcode_version,
        "swiftVersion": swift_version,
        "deviceModel": device_model,
        "deviceClass": device_class,
        "deviceKind": "simulator",
        "deviceOsVersion": device_os_version,
        "command": command,
    },
    open(output_path, "w", encoding="utf-8"),
    indent=2,
)
PY

node "$ROOT_DIR/scripts/ios-evidence.mjs" generate   "$LEG" "$POLICY" "$METADATA_FILE" "$EVIDENCE_DIR/$ARTIFACT_NAME"   "$EVIDENCE_DIR/evidence-$LEG.json"
node "$ROOT_DIR/scripts/scan-ios-evidence.mjs" "$EVIDENCE_DIR"

python3 - "$EVIDENCE_DIR" "$LEG" <<'PY'
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
leg = sys.argv[2]
files = sorted(item.name for item in root.iterdir())
expected = sorted([f"Fluyo-{leg}-simulator.zip", f"evidence-{leg}.json", "logs"])
if files != expected:
    raise SystemExit(f"Unsafe evidence inventory: {files}")
logs = sorted(item.name for item in (root / "logs").iterdir())
if logs != [f"{leg}.log"]:
    raise SystemExit(f"Unsafe evidence log inventory: {logs}")
PY

cat "$EVIDENCE_DIR/evidence-$LEG.json"
