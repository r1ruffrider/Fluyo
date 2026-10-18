#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$ROOT_DIR/apps/ios/Fluyo.xcodeproj"
SCHEME="Fluyo"
EVIDENCE_DIR="$ROOT_DIR/artifacts/ios-foundation"
DERIVED_ROOT="$RUNNER_TEMP/fluyo-ios-derived"
RESULTS_ROOT="$RUNNER_TEMP/fluyo-ios-results"
LOG_DIR="$EVIDENCE_DIR/logs"
SOURCE_SHA="${FLUYO_SOURCE_SHA:-$GITHUB_SHA}"
SHORT_SHA="${SOURCE_SHA:0:12}"

export DEVELOPER_DIR="/Applications/Xcode_26.6.app/Contents/Developer"

if [[ ! -d "$DEVELOPER_DIR" ]]; then
  echo "Required Xcode 26.6 is unavailable at $DEVELOPER_DIR" >&2
  exit 1
fi

mkdir -p "$EVIDENCE_DIR" "$LOG_DIR" "$DERIVED_ROOT" "$RESULTS_ROOT"

XCODE_VERSION="$(xcodebuild -version | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
if [[ "$XCODE_VERSION" != Xcode\ 26.6* ]]; then
  echo "Expected Xcode 26.6, received: $XCODE_VERSION" >&2
  exit 1
fi

python3 - "$EVIDENCE_DIR/devices.json" <<'PY'
import json
import subprocess
import sys

payload = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"]))
runtime_rows = []
for runtime, devices in payload.get("devices", {}).items():
    if "iOS" not in runtime:
        continue
    version = runtime.rsplit("iOS-", 1)[-1].replace("-", ".")
    try:
        major = int(version.split(".")[0])
    except ValueError:
        continue
    if major < 17:
        continue
    iphones = [d for d in devices if d.get("isAvailable") and d.get("name", "").startswith("iPhone")]
    if iphones:
        runtime_rows.append((tuple(int(part) for part in version.split(".")), version, iphones))

if not runtime_rows:
    raise SystemExit("No supported iOS 17+ iPhone simulator is available")

_, version, iphones = max(runtime_rows, key=lambda row: row[0])

def first_matching(patterns):
    for pattern in patterns:
        for device in iphones:
            if pattern in device["name"]:
                return device
    return None

small = first_matching(["SE", "16e", "15", "16", "17"]) or iphones[0]
large = first_matching(["Pro Max", "Plus", "Pro"]) or iphones[-1]

with open(sys.argv[1], "w", encoding="utf-8") as output:
    json.dump({"runtime": version, "small": small, "large": large}, output, indent=2)

print(small["udid"])
print(large["udid"])
PY

SMALL_UDID="$(python3 -c 'import json; print(json.load(open("artifacts/ios-foundation/devices.json"))["small"]["udid"])')"
LARGE_UDID="$(python3 -c 'import json; print(json.load(open("artifacts/ios-foundation/devices.json"))["large"]["udid"])')"

cleanup() {
  xcrun simctl shutdown "$SMALL_UDID" >/dev/null 2>&1 || true
  xcrun simctl shutdown "$LARGE_UDID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

xcrun simctl boot "$SMALL_UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$SMALL_UDID" -b
if [[ "$LARGE_UDID" != "$SMALL_UDID" ]]; then
  xcrun simctl boot "$LARGE_UDID" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$LARGE_UDID" -b
fi

COMMON_SETTINGS=(
  CODE_SIGNING_ALLOWED=NO
  CODE_SIGNING_REQUIRED=NO
  FLUYO_SOURCE_COMMIT_SHORT="$SHORT_SHA"
)
PUBLIC_SETTINGS=(
  FLUYO_API_BASE_URL="https://api.staging.fluyo.example.test/api/v1"
  FLUYO_SUPABASE_URL="https://auth.staging.fluyo.example.test"
  FLUYO_SUPABASE_PUBLISHABLE_KEY="synthetic_publishable_value"
)

run_xcodebuild() {
  local log_name="$1"
  shift
  set -o pipefail
  xcodebuild "$@" "${COMMON_SETTINGS[@]}" 2>&1 | tee "$LOG_DIR/$log_name.log"
}

run_xcodebuild build-debug \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$SMALL_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Debug" build "${PUBLIC_SETTINGS[@]}"

run_xcodebuild test-small \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$SMALL_UDID" \
  -derivedDataPath "$DERIVED_ROOT/DebugTests" \
  -resultBundlePath "$RESULTS_ROOT/small.xcresult" test "${PUBLIC_SETTINGS[@]}"

run_xcodebuild test-large \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "platform=iOS Simulator,id=$LARGE_UDID" \
  -derivedDataPath "$DERIVED_ROOT/LargeTests" \
  -resultBundlePath "$RESULTS_ROOT/large.xcresult" \
  -only-testing:FluyoUITests test "${PUBLIC_SETTINGS[@]}"

run_xcodebuild build-staging \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Staging \
  -destination "platform=iOS Simulator,id=$SMALL_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Staging" build "${PUBLIC_SETTINGS[@]}"

run_xcodebuild build-release \
  -project "$PROJECT" -scheme "$SCHEME" -configuration Release \
  -destination "platform=iOS Simulator,id=$SMALL_UDID" \
  -derivedDataPath "$DERIVED_ROOT/Release" build

APP_PATH="$DERIVED_ROOT/Debug/Build/Products/Debug-iphonesimulator/Fluyo.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "Unsigned simulator app was not produced" >&2
  exit 1
fi

ditto -c -k --keepParent "$APP_PATH" "$EVIDENCE_DIR/Fluyo-internal-simulator.zip"
cp -R "$RESULTS_ROOT" "$EVIDENCE_DIR/xcresults"

SCAN_FILE="$EVIDENCE_DIR/artifact-strings.txt"
find "$APP_PATH" -type f -print0 | xargs -0 strings > "$SCAN_FILE"
cat "$LOG_DIR"/*.log >> "$SCAN_FILE"

if grep -Eai '(sk_(live|test)_[A-Za-z0-9]{12,}|rk_(live|test)_[A-Za-z0-9]{12,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|Authorization:[[:space:]]*Bearer[[:space:]]+[A-Za-z0-9._-]{12,}|FLUYO_TEST_(ADRIANA|ELANA)_(EMAIL|PASSWORD)=)' "$SCAN_FILE"; then
  echo "Restricted credential-shaped value found in iOS evidence" >&2
  exit 1
fi

ARTIFACT_SHA="$(shasum -a 256 "$EVIDENCE_DIR/Fluyo-internal-simulator.zip" | awk '{print $1}')"
python3 - "$EVIDENCE_DIR/evidence.json" "$SHORT_SHA" "$XCODE_VERSION" "$ARTIFACT_SHA" <<'PY'
import json
import platform
import sys
from datetime import datetime, timezone

output, source_sha, xcode_version, artifact_sha = sys.argv[1:]
devices = json.load(open("artifacts/ios-foundation/devices.json", encoding="utf-8"))
evidence = {
    "sourceCommitShort": source_sha,
    "platform": "ios",
    "host": platform.platform(),
    "toolchain": xcode_version,
    "runtime": devices["runtime"],
    "smallSimulator": {"name": devices["small"]["name"], "kind": "simulator"},
    "largeSimulator": {"name": devices["large"]["name"], "kind": "simulator"},
    "configurationsBuilt": ["Debug", "Staging", "Release"],
    "signing": "disabled",
    "unitAndSmallSimulatorUIResult": "passed",
    "largeSimulatorUIResult": "passed",
    "artifactSha256": artifact_sha,
    "restrictedValueScan": "passed",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
}
json.dump(evidence, open(output, "w", encoding="utf-8"), indent=2)
PY

rm -f "$SCAN_FILE"
cat "$EVIDENCE_DIR/evidence.json"
