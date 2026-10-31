export const LEARNING_CONTRACT_JSON_MAX_BYTES = 1_024 as const;

export type LearningContractJsonFailure =
  "missing" | "oversize" | "invalid_utf8" | "invalid_json" | "duplicate_key";

export type LearningContractJsonDecodeResult =
  { ok: true; value: unknown } | { ok: false; reason: LearningContractJsonFailure };

class JsonSyntaxFailure extends Error {}
class JsonDuplicateKeyFailure extends Error {}

class DuplicateAwareJsonParser {
  private offset = 0;

  public constructor(private readonly source: string) {}

  public parse(): unknown {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();

    if (this.offset !== this.source.length) {
      throw new JsonSyntaxFailure();
    }

    return value;
  }

  private parseValue(): unknown {
    const current = this.source[this.offset];

    if (current === "{") return this.parseObject();
    if (current === "[") return this.parseArray();
    if (current === '"') return this.parseString();
    if (current === "t") return this.parseLiteral("true", true);
    if (current === "f") return this.parseLiteral("false", false);
    if (current === "n") return this.parseLiteral("null", null);
    if (current === "-" || (current !== undefined && current >= "0" && current <= "9")) {
      return this.parseNumber();
    }

    throw new JsonSyntaxFailure();
  }

  private parseObject(): Record<string, unknown> {
    this.offset += 1;
    this.skipWhitespace();

    const value: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    const keys = new Set<string>();

    if (this.consume("}")) return value;

    while (true) {
      if (this.source[this.offset] !== '"') throw new JsonSyntaxFailure();
      const key = this.parseString();

      if (keys.has(key)) throw new JsonDuplicateKeyFailure();
      keys.add(key);

      this.skipWhitespace();
      if (!this.consume(":")) throw new JsonSyntaxFailure();
      this.skipWhitespace();

      Object.defineProperty(value, key, {
        configurable: true,
        enumerable: true,
        value: this.parseValue(),
        writable: true,
      });

      this.skipWhitespace();
      if (this.consume("}")) return value;
      if (!this.consume(",")) throw new JsonSyntaxFailure();
      this.skipWhitespace();
    }
  }

  private parseArray(): unknown[] {
    this.offset += 1;
    this.skipWhitespace();

    const value: unknown[] = [];
    if (this.consume("]")) return value;

    while (true) {
      value.push(this.parseValue());
      this.skipWhitespace();
      if (this.consume("]")) return value;
      if (!this.consume(",")) throw new JsonSyntaxFailure();
      this.skipWhitespace();
    }
  }

  private parseString(): string {
    this.offset += 1;
    let value = "";

    while (this.offset < this.source.length) {
      const current = this.source.charCodeAt(this.offset);

      if (current === 0x22) {
        this.offset += 1;
        return value;
      }

      if (current === 0x5c) {
        this.offset += 1;
        value += this.parseEscape();
        continue;
      }

      if (current <= 0x1f || (current >= 0xdc00 && current <= 0xdfff)) {
        throw new JsonSyntaxFailure();
      }

      if (current >= 0xd800 && current <= 0xdbff) {
        const following = this.source.charCodeAt(this.offset + 1);
        if (following < 0xdc00 || following > 0xdfff) throw new JsonSyntaxFailure();
        value += this.source.slice(this.offset, this.offset + 2);
        this.offset += 2;
      } else {
        value += this.source[this.offset];
        this.offset += 1;
      }
    }

    throw new JsonSyntaxFailure();
  }

  private parseEscape(): string {
    const escaped = this.source[this.offset];
    this.offset += 1;

    switch (escaped) {
      case '"':
      case "\\":
      case "/":
        return escaped;
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u":
        return this.parseUnicodeEscape();
      default:
        throw new JsonSyntaxFailure();
    }
  }

  private parseUnicodeEscape(): string {
    const first = this.readHexCodeUnit();

    if (first >= 0xdc00 && first <= 0xdfff) throw new JsonSyntaxFailure();
    if (first < 0xd800 || first > 0xdbff) return String.fromCharCode(first);

    if (this.source.slice(this.offset, this.offset + 2) !== "\\u") {
      throw new JsonSyntaxFailure();
    }

    this.offset += 2;
    const second = this.readHexCodeUnit();
    if (second < 0xdc00 || second > 0xdfff) throw new JsonSyntaxFailure();

    return String.fromCodePoint(0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00));
  }

  private readHexCodeUnit(): number {
    const hex = this.source.slice(this.offset, this.offset + 4);
    if (!/^[0-9A-Fa-f]{4}$/.test(hex)) throw new JsonSyntaxFailure();
    this.offset += 4;
    return Number.parseInt(hex, 16);
  }

  private parseNumber(): number {
    const start = this.offset;
    this.consume("-");

    if (this.consume("0")) {
      if (this.isDigit(this.source[this.offset])) throw new JsonSyntaxFailure();
    } else {
      if (!this.isDigitOneToNine(this.source[this.offset])) throw new JsonSyntaxFailure();
      while (this.isDigit(this.source[this.offset])) this.offset += 1;
    }

    if (this.consume(".")) {
      if (!this.isDigit(this.source[this.offset])) throw new JsonSyntaxFailure();
      while (this.isDigit(this.source[this.offset])) this.offset += 1;
    }

    const exponent = this.source[this.offset];
    if (exponent === "e" || exponent === "E") {
      this.offset += 1;
      const sign = this.source[this.offset];
      if (sign === "+" || sign === "-") this.offset += 1;
      if (!this.isDigit(this.source[this.offset])) throw new JsonSyntaxFailure();
      while (this.isDigit(this.source[this.offset])) this.offset += 1;
    }

    return Number(this.source.slice(start, this.offset));
  }

  private parseLiteral<T>(literal: string, value: T): T {
    if (this.source.slice(this.offset, this.offset + literal.length) !== literal) {
      throw new JsonSyntaxFailure();
    }

    this.offset += literal.length;
    return value;
  }

  private skipWhitespace(): void {
    while (true) {
      const current = this.source.charCodeAt(this.offset);
      if (current !== 0x20 && current !== 0x09 && current !== 0x0a && current !== 0x0d) return;
      this.offset += 1;
    }
  }

  private consume(expected: string): boolean {
    if (this.source[this.offset] !== expected) return false;
    this.offset += 1;
    return true;
  }

  private isDigit(value: string | undefined): boolean {
    return value !== undefined && value >= "0" && value <= "9";
  }

  private isDigitOneToNine(value: string | undefined): boolean {
    return value !== undefined && value >= "1" && value <= "9";
  }
}

export function decodeLearningContractJson(
  rawUtf8Json: Uint8Array,
): LearningContractJsonDecodeResult {
  let snapshot: Uint8Array;
  try {
    snapshot = new Uint8Array(rawUtf8Json);
  } catch {
    return { ok: false, reason: "missing" };
  }

  if (snapshot.byteLength === 0) return { ok: false, reason: "missing" };
  if (snapshot.byteLength > LEARNING_CONTRACT_JSON_MAX_BYTES) {
    return { ok: false, reason: "oversize" };
  }

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(snapshot);
  } catch {
    return { ok: false, reason: "invalid_utf8" };
  }

  if (source.charCodeAt(0) === 0xfeff) return { ok: false, reason: "invalid_json" };

  try {
    return { ok: true, value: new DuplicateAwareJsonParser(source).parse() };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof JsonDuplicateKeyFailure ? "duplicate_key" : "invalid_json",
    };
  }
}
