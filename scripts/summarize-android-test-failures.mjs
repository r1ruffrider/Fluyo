import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
if (roots.length === 0) {
  throw new Error("At least one Android test-results directory is required.");
}

const xmlFiles = [];
const visit = (entry) => {
  if (!fs.existsSync(entry)) return;
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(entry)) visit(path.join(entry, child));
  } else if (stat.isFile() && path.basename(entry).startsWith("TEST-") && entry.endsWith(".xml")) {
    xmlFiles.push(entry);
  }
};
for (const root of roots) visit(root);

const safeIdentifier = (value) => {
  const normalized = value.replace(/[^A-Za-z0-9_.$-]/g, "_").slice(0, 160);
  return normalized || "unknown";
};
const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return safeIdentifier(match?.[1] ?? "unknown");
};

const failureCategory = (body) => {
  const normalized = body.toLowerCase();
  if (/not found|could not find|does not exist/.test(normalized)) return "node_missing";
  if (/not displayed|isdisplayed|visible area/.test(normalized)) return "visibility";
  if (/scroll/.test(normalized)) return "scroll_action";
  if (/height|width|size/.test(normalized)) return "bounds";
  if (/focus/.test(normalized)) return "focus";
  if (/expected.*(?:0|zero)|count/.test(normalized)) return "count";
  if (/exception|error/.test(normalized)) return "runtime_error";
  return "assertion";
};

const runtimeCategories = (body) => {
  const categories = [];
  const mappings = [
    ["activity_lifecycle", /\b(?:ActivityScenario|NoActivityResumedException)\b/],
    ["assertion", /\bAssertionError\b/],
    ["class_loading", /\b(?:ClassNotFoundException|NoClassDefFoundError)\b/],
    ["illegal_state", /\bIllegalStateException\b/],
    [
      "instrumentation_abort",
      /(?:instrumentation run failed|test failed to run to completion|INSTRUMENTATION_(?:ABORTED|FAILED))/i,
    ],
    [
      "process_crash",
      /(?:\bProcessCrash\b|\bProcessCrashedException\b|\bprocess (?:crash|crashed)\b)/i,
    ],
    ["timeout", /\b(?:ComposeTimeoutException|TimeoutException)\b/],
  ];
  for (const [category, pattern] of mappings) {
    if (pattern.test(body)) categories.push(category);
  }
  return categories;
};

const failures = [];
for (const file of xmlFiles.sort()) {
  const xml = fs.readFileSync(file, "utf8");
  for (const match of xml.matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g)) {
    const [, attributes, body] = match;
    const failureTag = body.match(/<(failure|error)\b([^>]*)>/);
    const kind = failureTag?.[1] ?? null;
    if (!kind) continue;
    const sourceLineMatch = body.match(/FoundationShellTest\.kt:(\d{1,5})/);
    const sourceLine = sourceLineMatch ? Number(sourceLineMatch[1]) : null;
    failures.push({
      className: attribute(attributes, "classname"),
      testName: attribute(attributes, "name"),
      kind,
      category: failureCategory(failureTag[2]),
      runtimeCategories: runtimeCategories(body),
      sourceLine,
    });
  }
}

process.stdout.write(`${JSON.stringify({ structuredReports: xmlFiles.length, failures })}\n`);
