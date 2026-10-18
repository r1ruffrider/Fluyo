export function isValidIanaTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function localDateAt(instant: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
}

export function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function previousDate(value: Date): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}

export function timeValue(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function timeText(value: Date): string {
  return value.toISOString().slice(11, 16);
}
