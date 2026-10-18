const SAFE_RETURN_PATHS = new Set(["/account", "/billing", "/dashboard", "/learn", "/pricing"]);

export function safeReturnPath(value: FormDataEntryValue | string | null, fallback = "/account") {
  return typeof value === "string" && SAFE_RETURN_PATHS.has(value) ? value : fallback;
}
