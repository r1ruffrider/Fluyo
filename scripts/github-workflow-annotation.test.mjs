import assert from "node:assert/strict";

import {
  escapeGithubWorkflowData,
  escapeGithubWorkflowProperty,
  githubWorkflowAnnotationTitle,
  githubWorkflowErrorAnnotation,
} from "./github-workflow-annotation.mjs";

assert.equal(escapeGithubWorkflowData("percent%\r\ncolon:,"), "percent%25%0D%0Acolon:,");
assert.equal(escapeGithubWorkflowProperty("percent%\r\ncolon:,"), "percent%25%0D%0Acolon%3A%2C");
for (const control of ["\u0000", "\u0008", "\u000b", "\u001f", "\u007f", "\u0085"]) {
  assert.throws(() => escapeGithubWorkflowData(`safe${control}text`));
  assert.throws(() => escapeGithubWorkflowProperty(`safe${control}text`));
}
assert.throws(() => escapeGithubWorkflowData(null));

const annotation = githubWorkflowErrorAnnotation("phase=test_current\n::warning title=x::private");
assert.equal(
  annotation,
  `::error title=${githubWorkflowAnnotationTitle}::phase=test_current%0A::warning title=x::private\n`,
);
assert.equal(annotation.match(/\n/g)?.length, 1);
assert.equal(annotation.endsWith("\n"), true);
assert.equal(
  annotation.slice(0, -1).includes("\r") || annotation.slice(0, -1).includes("\n"),
  false,
);
