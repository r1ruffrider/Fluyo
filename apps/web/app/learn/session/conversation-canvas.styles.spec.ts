import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./conversation-canvas.module.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]*)\\}`, "u"))?.groups?.body ?? "";
}

function lastRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{(?<body>[^}]*)\\}`, "gu"))];
  return matches.at(-1)?.groups?.body ?? "";
}

function mediaCanvas(query: string): string {
  const start = css.indexOf(`@media ${query}`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start).match(/\.canvas\s*\{(?<body>[^}]*)\}/u)?.groups?.body ?? "";
}

function mediaSource(query: string): string {
  const start = css.indexOf(`@media ${query}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const nextMedia = css.indexOf("@media ", start + 1);
  return css.slice(start, nextMedia === -1 ? undefined : nextMedia);
}

describe("Conversation Canvas static visual contract", () => {
  it("encodes the six frozen viewport geometry records with logical layout tokens", () => {
    expect(rule(".canvas")).toMatch(/--cc-inline-gutter:\s*16px/u);
    expect(rule(".canvas")).toMatch(/--cc-canvas-max:\s*720px/u);
    expect(rule(".canvas")).toMatch(/--cc-panel-padding:\s*16px/u);
    expect(rule(".canvas")).toMatch(/--cc-top-bar-min:\s*56px/u);
    expect(rule(".canvas")).toMatch(/--cc-backplate-offset:\s*4px/u);
    expect(rule(".canvas")).toMatch(/--cc-notch:\s*20px/u);
    expect(css).toContain("@media (min-width: 22.5rem)");
    expect(css).toContain("@media (min-width: 26.25rem)");
    expect(css).toContain("@media (min-width: 48rem)");
    expect(css).toContain("@media (min-width: 64rem)");
    expect(css).toContain(
      "@media (min-width: 48rem) and (max-height: 31.25rem) and (orientation: landscape)",
    );
    expect(mediaCanvas("(min-width: 22.5rem)")).toMatch(
      /--cc-inline-gutter:\s*20px[\s\S]*--cc-block-gutter:\s*20px[\s\S]*--cc-panel-padding:\s*20px/u,
    );
    expect(mediaCanvas("(min-width: 26.25rem)")).toMatch(
      /--cc-block-gutter:\s*24px[\s\S]*--cc-panel-padding:\s*24px/u,
    );
    expect(mediaCanvas("(min-width: 48rem)")).toMatch(
      /--cc-inline-gutter:\s*32px[\s\S]*--cc-block-gutter:\s*32px[\s\S]*--cc-canvas-max:\s*680px[\s\S]*--cc-panel-padding:\s*32px[\s\S]*--cc-top-bar-min:\s*64px[\s\S]*--cc-backplate-offset:\s*8px[\s\S]*--cc-notch:\s*24px/u,
    );
    expect(mediaCanvas("(min-width: 64rem)")).toMatch(
      /--cc-block-gutter:\s*40px[\s\S]*--cc-canvas-max:\s*760px[\s\S]*--cc-panel-padding:\s*40px/u,
    );
    expect(
      mediaCanvas("(min-width: 48rem) and (max-height: 31.25rem) and (orientation: landscape)"),
    ).toMatch(
      /--cc-inline-gutter:\s*16px[\s\S]*--cc-block-gutter:\s*16px[\s\S]*--cc-canvas-max:\s*720px[\s\S]*--cc-panel-padding:\s*20px[\s\S]*--cc-top-bar-min:\s*48px[\s\S]*--cc-backplate-offset:\s*4px[\s\S]*--cc-notch:\s*20px/u,
    );
    expect(
      mediaSource("(min-width: 48rem) and (max-height: 31.25rem) and (orientation: landscape)"),
    ).toMatch(
      /\.exitButton,\s*\.primaryButton,\s*\.secondaryButton\s*\{\s*min-inline-size:\s*0;\s*inline-size:\s*100%;/u,
    );
  });

  it("uses the accepted display, body, button, metadata, and progress type roles", () => {
    expect(rule(".topline h1")).toMatch(/font-size:\s*32px/u);
    expect(rule(".topline h1")).toMatch(/line-height:\s*36px/u);
    expect(rule(".fieldset legend")).toMatch(/font-size:\s*22px/u);
    expect(rule(".fieldset legend")).toMatch(/line-height:\s*30px/u);
    expect(rule(".progressGroup")).toMatch(/font-size:\s*16px/u);
    expect(lastRule(".dialog h2")).toMatch(/font-size:\s*24px/u);
    expect(lastRule(".dialog h2")).toMatch(/line-height:\s*30px/u);
    expect(css).toMatch(/\.primaryButton[\s\S]*?font-size:\s*17px/u);
    expect(css).toMatch(/\.eyebrow[\s\S]*?font-size:\s*14px/u);
    const desktop = css.slice(css.indexOf("@media (min-width: 64rem)"));
    expect(desktop).toMatch(
      /\.loadingShell h1,\s*\.topline h1\s*\{\s*font-size:\s*40px;\s*line-height:\s*44px/u,
    );
    expect(desktop).toMatch(/\.fieldset legend\s*\{\s*font-size:\s*24px;\s*line-height:\s*32px/u);
    expect(desktop).toMatch(
      /\.dialog h2,\s*\.statusHeading\s*\{\s*font-size:\s*28px;\s*line-height:\s*34px/u,
    );
  });

  it("uses the accepted canvas, choice, action, backplate, and notch geometry", () => {
    expect(rule(".canvas > div:not(.backdrop)")).toMatch(/border:\s*2px solid/u);
    expect(rule(".canvas > div:not(.backdrop)")).toMatch(/border-radius:\s*24px/u);
    expect(rule(".canvas::before")).toMatch(/inset-block-start:\s*var\(--cc-backplate-offset\)/u);
    expect(rule(".canvas::before")).toMatch(/inset-inline-start:\s*var\(--cc-backplate-offset\)/u);
    expect(rule(".choice")).toMatch(/border:\s*2px solid/u);
    expect(rule(".choice")).toMatch(/border-radius:\s*12px/u);
    expect(rule(".primaryButton")).toMatch(/min-inline-size:\s*120px/u);
    expect(rule(".primaryButton")).toMatch(/border:\s*1px solid var\(--cc-cobalt\)/u);
  });

  it("uses dark cobalt instead of structuralBorder on dark raised controls", () => {
    const darkTheme = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    expect(darkTheme).toMatch(
      /\.exitButton,\s*\.secondaryButton,\s*\.choice\s*\{\s*border-color:\s*var\(--cc-cobalt\)/u,
    );
    expect(darkTheme).not.toMatch(
      /\.exitButton,\s*\.secondaryButton,\s*\.choice\s*\{[^}]*var\(--cc-structure\)/u,
    );
  });

  it("gives the dialog the accepted entry motion and a static reduced-motion outcome", () => {
    expect(rule(".dialog")).toMatch(
      /animation:\s*dialog-entry 180ms cubic-bezier\(0\.22, 1, 0\.36, 1\) both/u,
    );
    expect(css).toMatch(
      /@keyframes dialog-entry\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(0\.35rem\);[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\);/u,
    );
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.dialog\s*\{\s*animation:\s*none;\s*transform:\s*none/u);
    expect(reduced).toMatch(
      /\.exitButton:hover,\s*\.exitButton:active,\s*\.primaryButton:not\(\[aria-disabled="true"\]\):hover,\s*\.primaryButton:not\(\[aria-disabled="true"\]\):active,\s*\.secondaryButton:hover,\s*\.secondaryButton:active,\s*\.choice:has\(input:checked\)\s*\{\s*transform:\s*none;/u,
    );
    expect(reduced).not.toMatch(/\.primaryButton:not\(:disabled\)/u);
  });
});
