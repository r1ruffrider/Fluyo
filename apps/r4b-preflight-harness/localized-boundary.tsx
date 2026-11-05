"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export const HARNESS_LOCALES = Object.freeze(["en", "en-XA", "ar-XB"] as const);
export type HarnessLocale = (typeof HARNESS_LOCALES)[number];

export function pseudoLocalizeVisibleString(value: string, locale: HarnessLocale): string {
  if (locale === "en" || value.trim() === "") return value;
  if (locale === "en-XA") return `⟦${value} ···⟧`;
  return `⟦عَرَبِيّ ${value} ···⟧`;
}

export function LocalizedBoundary({
  children,
  locale,
}: {
  children: ReactNode;
  locale: HarnessLocale;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const current = root.current;
    if (!current) return;
    const originals = new WeakMap<Text, string>();
    const localize = () => {
      const walker = document.createTreeWalker(current, NodeFilter.SHOW_TEXT);
      let count = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node as Text;
        if (text.parentElement?.closest("script,style")) continue;
        const original = originals.get(text) ?? text.data;
        originals.set(text, original);
        if (original.trim() === "") continue;
        text.data = pseudoLocalizeVisibleString(original, locale);
        count += 1;
      }
      current.dataset.r4bLocalizedVisibleStringCount = String(count);
      current.dataset.r4bLocalizationComplete = "true";
    };
    localize();
    const observer = new MutationObserver(localize);
    observer.observe(current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);
  return (
    <div data-r4b-locale={locale} dir={locale === "ar-XB" ? "rtl" : "ltr"} lang={locale} ref={root}>
      {children}
    </div>
  );
}
