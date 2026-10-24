import fs from "node:fs";
import path from "node:path";

const digest = "0e273eeddffd655f44ad86514da715c8925fadc99f093047e6d6ee1f6d33f214";
const corpus = fs.readFileSync("contracts/mobile/auth-runtime-synthetic/v1/vectors.tsv", "utf8");
const ids = corpus
  .trimEnd()
  .split("\n")
  .slice(1)
  .map((line) => line.split("\t")[1]);
if (ids.length !== 41 || new Set(ids).size !== 41)
  throw new Error("auth_kernel_contract_inventory");

const args = process.argv.slice(2);
if (args[0] === "--ios-log") {
  const log = args[1];
  if (!log || !fs.existsSync(log)) throw new Error("ios_auth_kernel_log_missing");
  const markers = [
    ...fs
      .readFileSync(log, "utf8")
      .matchAll(/^AUTH_KERNEL_VECTOR ([0-9]+) ([a-z0-9_]+) ([0-9a-f]{64}) PASS$/gm),
  ].map((match) => `${match[1]}:${match[2]}@${match[3]}`);
  const expected = ids.map((id, index) => `${index}:${id}@${digest}`);
  if (
    markers.length !== 41 ||
    new Set(markers).size !== 41 ||
    markers.join("\n") !== expected.join("\n")
  ) {
    throw new Error("ios_auth_kernel_semantic_identity");
  }
  process.stdout.write("iOS auth synthetic kernel passed 41 exact semantic identities\n");
  process.exit(0);
}

const [root] = args;
if (!root || !fs.existsSync(root)) throw new Error("android_auth_kernel_result_missing");
const files = [];
const visit = (entry) => {
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) for (const child of fs.readdirSync(entry)) visit(path.join(entry, child));
  else if (stat.isFile() && path.basename(entry).startsWith("TEST-") && entry.endsWith(".xml"))
    files.push(entry);
};
visit(root);
const targets = files.filter((file) =>
  fs.readFileSync(file, "utf8").includes('name="com.fluyo.app.AuthRuntimeKernelTest"'),
);
if (targets.length !== 1) throw new Error("android_auth_kernel_suite_identity");
const xml = fs.readFileSync(targets[0], "utf8");
const suite = xml.match(/<testsuite\b[^>]*>/)?.[0] ?? "";
const attribute = (source, name) =>
  source.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`))?.[1] ?? "";
const number = (name) => Number(attribute(suite, name));
if (attribute(suite, "name") !== "com.fluyo.app.AuthRuntimeKernelTest")
  throw new Error("android_auth_kernel_suite_identity");
if (
  number("tests") !== 41 ||
  number("failures") !== 0 ||
  number("errors") !== 0 ||
  number("skipped") !== 0
) {
  throw new Error("android_auth_kernel_result_count");
}
const cases = [...xml.matchAll(/<testcase\b([^>]*)>/g)].map((match) => ({
  name: attribute(match[1], "name"),
  className: attribute(match[1], "classname"),
}));
const expectedNames = ids.map(
  (id, index) => `canonicalScenarioOrInvariant[${index}:${id}@${digest}]`,
);
if (
  cases.length !== 41 ||
  new Set(cases.map((item) => item.name)).size !== 41 ||
  cases.some((item) => item.className !== "com.fluyo.app.AuthRuntimeKernelTest") ||
  cases.map((item) => item.name).join("\n") !== expectedNames.join("\n")
) {
  throw new Error("android_auth_kernel_semantic_identity");
}
process.stdout.write("Android auth synthetic kernel passed 41 exact semantic identities\n");
