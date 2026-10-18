import { describe, expect, it } from "vitest";

import {
  dateKey,
  isValidIanaTimeZone,
  localDateAt,
  previousDate,
  timeText,
  timeValue,
} from "./learning-time";

describe("learning time", () => {
  it("validates IANA zones", () => {
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("Asia/Riyadh")).toBe(true);
    expect(isValidIanaTimeZone("Mars/Olympus_Mons")).toBe(false);
  });

  it("maps one instant to the learner's local calendar date", () => {
    const instant = new Date("2026-10-18T00:30:00.000Z");

    expect(dateKey(localDateAt(instant, "America/Los_Angeles"))).toBe("2026-10-17");
    expect(dateKey(localDateAt(instant, "Asia/Riyadh"))).toBe("2026-10-18");
  });

  it("steps across month boundaries using calendar dates", () => {
    expect(dateKey(previousDate(new Date("2026-03-01T00:00:00.000Z")))).toBe("2026-02-28");
  });

  it("round-trips the stored reminder time representation", () => {
    expect(timeText(timeValue("23:59"))).toBe("23:59");
  });
});
