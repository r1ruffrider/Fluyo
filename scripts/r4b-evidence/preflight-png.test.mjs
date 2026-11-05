import assert from "node:assert/strict";
import test from "node:test";
import { decodePng, diffPng, encodePng } from "./preflight-png.mjs";

test("normalizes RGBA PNGs and counts exact pixel differences", () => {
  const first = encodePng({ width: 2, height: 1, rgba: Buffer.from([1, 2, 3, 255, 4, 5, 6, 255]) });
  const second = encodePng({
    width: 2,
    height: 1,
    rgba: Buffer.from([1, 2, 3, 255, 7, 5, 6, 255]),
  });
  assert.deepEqual(decodePng(first).rgba, Buffer.from([1, 2, 3, 255, 4, 5, 6, 255]));
  assert.equal(diffPng(first, first).changedPixels, 0);
  const changed = diffPng(first, second);
  assert.equal(changed.changedPixels, 1);
  assert.deepEqual(decodePng(changed.diff).rgba, Buffer.from([0, 0, 0, 0, 255, 0, 255, 255]));
});

test("rejects corrupt PNGs and mismatched dimensions", () => {
  assert.throws(() => decodePng(Buffer.from("invalid")), /signature/u);
  const one = encodePng({ width: 1, height: 1, rgba: Buffer.from([1, 2, 3, 255]) });
  const corrupt = Buffer.from(one);
  corrupt[20] ^= 1;
  assert.throws(() => decodePng(corrupt), /CRC/u);
  const two = encodePng({ width: 2, height: 1, rgba: Buffer.alloc(8) });
  assert.throws(() => diffPng(one, two), /dimensions/u);
});

test("emits and accepts only critical IHDR/IDAT/IEND chunks", () => {
  const png = encodePng({ width: 1, height: 1, rgba: Buffer.from([1, 2, 3, 255]) });
  const chunkTypes = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    chunkTypes.push(png.subarray(offset + 4, offset + 8).toString("ascii"));
    offset += length + 12;
  }
  assert.deepEqual(chunkTypes, ["IHDR", "IDAT", "IEND"]);
  const ancillary = Buffer.from(png);
  ancillary.write("tEXt", 12, "ascii");
  assert.throws(() => decodePng(ancillary), /CRC|forbidden/u);
});
