import { describe, expect, it } from "vitest";

import {
  decodeLearningContractJson,
  LEARNING_CONTRACT_JSON_MAX_BYTES,
} from "./learning-contract-json";

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("learning contract JSON boundary", () => {
  it.each([
    ["object", '{"value":1}', { value: 1 }],
    ["array", '[1,"two",null]', [1, "two", null]],
    ["string", '"value"', "value"],
    ["number", "-12.5e2", -1250],
    ["boolean", "true", true],
    ["null", "null", null],
    ["literal non-BMP Unicode", '"🚀"', "🚀"],
    ["surrounding whitespace", " \t\r\n[1]\n ", [1]],
  ])("decodes a valid %s document", (_name, source, expected) => {
    const result = decodeLearningContractJson(utf8(source));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.value).toEqual(expected);
  });

  it("rejects empty input", () => {
    expect(decodeLearningContractJson(new Uint8Array())).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("maps a detached zero-byte view to a non-disclosing missing failure", () => {
    const input = utf8('{"private":"value"}');
    structuredClone(input.buffer, { transfer: [input.buffer] });
    expect(input.byteLength).toBe(0);

    const result = decodeLearningContractJson(input);
    expect(result).toEqual({ ok: false, reason: "missing" });
    expect(Object.keys(result).sort()).toEqual(["ok", "reason"]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("accepts an exact 1,024-byte valid document", () => {
    const source = `${" ".repeat(LEARNING_CONTRACT_JSON_MAX_BYTES - 4)}null`;
    expect(utf8(source)).toHaveLength(LEARNING_CONTRACT_JSON_MAX_BYTES);
    expect(decodeLearningContractJson(utf8(source))).toEqual({ ok: true, value: null });
  });

  it("rejects a 1,025-byte document before parsing", () => {
    const source = `${" ".repeat(LEARNING_CONTRACT_JSON_MAX_BYTES - 3)}null`;
    expect(utf8(source)).toHaveLength(LEARNING_CONTRACT_JSON_MAX_BYTES + 1);
    expect(decodeLearningContractJson(utf8(source))).toEqual({
      ok: false,
      reason: "oversize",
    });
  });

  it.each([
    ["invalid continuation", new Uint8Array([0x22, 0xc3, 0x28, 0x22])],
    ["truncated sequence", new Uint8Array([0x22, 0xe2, 0x82])],
    ["overlong sequence", new Uint8Array([0x22, 0xc0, 0xaf, 0x22])],
  ])("rejects %s UTF-8", (_name, source) => {
    expect(decodeLearningContractJson(source)).toEqual({ ok: false, reason: "invalid_utf8" });
  });

  it.each([
    ["UTF-8 BOM", new Uint8Array([0xef, 0xbb, 0xbf, 0x6e, 0x75, 0x6c, 0x6c])],
    ["trailing document", utf8("null true")],
    ["trailing punctuation", utf8("null,")],
  ])("rejects %s as invalid JSON", (_name, source) => {
    expect(decodeLearningContractJson(source)).toEqual({ ok: false, reason: "invalid_json" });
  });

  it.each([
    ["root", '{"a":1,"a":2}'],
    ["nested", '{"a":{"b":1,"b":2}}'],
    ["escaped-equivalent", '{"a":1,"\\u0061":2}'],
  ])("rejects %s duplicate keys", (_name, source) => {
    expect(decodeLearningContractJson(utf8(source))).toEqual({
      ok: false,
      reason: "duplicate_key",
    });
  });

  it("allows the same key in separate objects", () => {
    const result = decodeLearningContractJson(utf8('[{"a":1},{"a":2}]'));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.value).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it.each([
    ["unknown escape", '"\\x20"'],
    ["short Unicode escape", '"\\u123"'],
    ["unescaped control", '"\u0001"'],
    ["unpaired high surrogate", '"\\ud800"'],
    ["unpaired low surrogate", '"\\udc00"'],
    ["high surrogate followed by non-low", '"\\ud800\\u0061"'],
    ["leading zero", "01"],
    ["trailing comma", "[1,]"],
  ])("rejects malformed JSON: %s", (_name, source) => {
    expect(decodeLearningContractJson(utf8(source))).toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });

  it("decodes a valid surrogate pair", () => {
    expect(decodeLearningContractJson(utf8('"\\ud83d\\ude80"'))).toEqual({
      ok: true,
      value: "🚀",
    });
  });

  it("constructs special keys without prototype or setter behavior", () => {
    const result = decodeLearningContractJson(
      utf8('{"__proto__":{"polluted":true},"constructor":7,"toString":8}'),
    );

    expect(result).toMatchObject({ ok: true });
    if (!result.ok || typeof result.value !== "object" || result.value === null) return;

    expect(Object.getPrototypeOf(result.value)).toBeNull();
    expect(Object.keys(result.value)).toEqual(["__proto__", "constructor", "toString"]);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("does not mutate the caller byte array", () => {
    const input = utf8('{"value":1}');
    const before = input.slice();
    decodeLearningContractJson(input);
    expect(input).toEqual(before);
  });

  it("returns only fixed, non-disclosing failure fields", () => {
    const result = decodeLearningContractJson(utf8('{"secret":"one","secret":"two"}'));
    expect(Object.keys(result).sort()).toEqual(["ok", "reason"]);
    expect(result).toEqual({ ok: false, reason: "duplicate_key" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
