"use client";

import { useRef, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

import { R4B_INERT_ACTION_ALIAS } from "./inert-actions";

export function InertClientBoundary({ children }: { children: ReactNode }) {
  const boundary = useRef<HTMLDivElement>(null);

  function markBlockedActivation() {
    const current = boundary.current;
    if (!current) return;
    const count = Number(current.dataset.r4bBlockedActivationCount ?? "0");
    current.dataset.r4bBlockedActivationCount = String(count + 1);
  }

  function actionableTarget(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) return null;
    return target.closest("button,a[href]");
  }

  function preventActionActivation(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    const actionable = actionableTarget(target);
    if (!actionable) return;
    if (actionable.matches("a[href^='#']")) return;
    event.preventDefault();
    event.stopPropagation();
    markBlockedActivation();
  }

  function preventFormSubmission(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    markBlockedActivation();
  }

  function preventKeyboardActivation(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const actionable = actionableTarget(event.target);
    const formSubmit =
      event.key === "Enter" && event.target instanceof Element
        ? event.target.closest("form")
        : null;
    if (!actionable && !formSubmit) return;
    if (actionable?.matches("a[href^='#']")) return;
    event.preventDefault();
    event.stopPropagation();
    markBlockedActivation();
  }

  return (
    <div
      data-r4b-blocked-activation-count="0"
      data-r4b-inert-action-alias={R4B_INERT_ACTION_ALIAS}
      data-r4b-inert-navigation-boundary="v1"
      onAuxClickCapture={preventActionActivation}
      onClickCapture={preventActionActivation}
      onKeyDownCapture={preventKeyboardActivation}
      onSubmitCapture={preventFormSubmission}
      ref={boundary}
    >
      {children}
    </div>
  );
}
