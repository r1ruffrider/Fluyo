import fs from "node:fs";

const [logPath, phaseFlag, phase] = process.argv.slice(2);
const phases = new Set([
  "build_debug",
  "build_staging",
  "build_release",
  "test_minimum",
  "test_current",
]);
if (!logPath || phaseFlag !== "--phase" || !phases.has(phase)) {
  throw new Error("Use a bounded iOS phase.");
}

const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const categories = [
  ["auth_contract", /AuthRuntimeKernelTests|auth runtime|synthetic kernel/i],
  ["assertion", /XCTAssert|assertion failed|test case .* failed/i],
  ["compile", /compile|swift compiler error|failed to build module/i],
  ["link", /linker command failed|undefined symbol/i],
  ["simulator", /simulator|simctl|destination.*unavailable/i],
  ["timeout", /timed out|timeout/i],
  ["configuration", /configuration|xcconfig|Info\.plist/i],
];
const category = categories.find(([, pattern]) => pattern.test(raw))?.[0] ?? "unknown";
const allowedTests = [
  "testCanonicalCorpusRunsExactlyTwentyEightScenariosAndThirteenInvariantGroups",
  "testSerializedCoordinatorFencesEveryCleanupAwaitAndPublishesOnlyAfterConfirmation",
  "testCleanupFailureIsFencedAndDelayedEffectsAreGenerationBoundOneShot",
  "testExactStepAndTotalTimeoutBoundariesAndGenerationOverflowFailClosed",
];
const test = allowedTests.find((name) => raw.includes(name)) ?? "unknown";
process.stderr.write(
  `iOS phase failed; phase=${phase}; category=${category}; test=${test}; raw output discarded\n`,
);
