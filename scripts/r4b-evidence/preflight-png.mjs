import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const distances = [
    Math.abs(estimate - left),
    Math.abs(estimate - above),
    Math.abs(estimate - upperLeft),
  ];
  return distances[0] <= distances[1] && distances[0] <= distances[2]
    ? left
    : distances[1] <= distances[2]
      ? above
      : upperLeft;
}

export function decodePng(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(SIGNATURE))
    throw new Error("PNG signature is invalid");
  let offset = 8;
  let header;
  const payloads = [];
  let ended = false;
  let seenIdat = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error("PNG chunk is truncated");
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error("PNG payload is truncated");
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (crc32(Buffer.concat([typeBytes, data])) !== bytes.readUInt32BE(offset + 8 + length)) {
      throw new Error(`PNG ${type} CRC is invalid`);
    }
    if (type === "IHDR") {
      if (header || payloads.length || offset !== 8 || length !== 13)
        throw new Error("PNG IHDR is invalid");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      if (!header) throw new Error("PNG IDAT precedes IHDR");
      seenIdat = true;
      payloads.push(data);
    } else if (type === "IEND") {
      if (!seenIdat || length !== 0) throw new Error("PNG IEND is invalid");
      ended = true;
      offset = end;
      break;
    } else throw new Error(`PNG ancillary or unknown chunk ${type} is forbidden`);
    offset = end;
  }
  if (!header || !ended || offset !== bytes.length || payloads.length === 0)
    throw new Error("PNG required chunks are incomplete");
  if (
    header.width < 1 ||
    header.height < 1 ||
    header.bitDepth !== 8 ||
    ![2, 6].includes(header.colorType) ||
    header.compression !== 0 ||
    header.filter !== 0 ||
    header.interlace !== 0
  ) {
    throw new Error("PNG must be non-interlaced 8-bit RGB or RGBA");
  }
  const channels = header.colorType === 6 ? 4 : 3;
  const rowBytes = header.width * channels;
  const inflated = inflateSync(Buffer.concat(payloads));
  if (inflated.length !== (rowBytes + 1) * header.height)
    throw new Error("PNG decoded length is invalid");
  const decoded = Buffer.alloc(rowBytes * header.height);
  for (let row = 0; row < header.height; row += 1) {
    const source = row * (rowBytes + 1);
    const target = row * rowBytes;
    const filter = inflated[source];
    if (filter > 4) throw new Error("PNG filter is unsupported");
    for (let column = 0; column < rowBytes; column += 1) {
      const left = column >= channels ? decoded[target + column - channels] : 0;
      const above = row > 0 ? decoded[target + column - rowBytes] : 0;
      const upperLeft =
        row > 0 && column >= channels ? decoded[target + column - rowBytes - channels] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : paeth(left, above, upperLeft);
      decoded[target + column] = (inflated[source + 1 + column] + predictor) & 0xff;
    }
  }
  const rgba = Buffer.alloc(header.width * header.height * 4);
  for (let pixel = 0; pixel < header.width * header.height; pixel += 1) {
    rgba[pixel * 4] = decoded[pixel * channels];
    rgba[pixel * 4 + 1] = decoded[pixel * channels + 1];
    rgba[pixel * 4 + 2] = decoded[pixel * channels + 2];
    rgba[pixel * 4 + 3] = channels === 4 ? decoded[pixel * 4 + 3] : 255;
  }
  return { width: header.width, height: header.height, rgba };
}

export function encodePng({ width, height, rgba }) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    !Buffer.isBuffer(rgba) ||
    rgba.length !== width * height * 4
  )
    throw new Error("RGBA PNG input is invalid");
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1)
    rgba.copy(rows, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4);
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function diffPng(baselineBytes, actualBytes) {
  const baseline = decodePng(baselineBytes);
  const actual = decodePng(actualBytes);
  if (baseline.width !== actual.width || baseline.height !== actual.height)
    throw new Error("PNG dimensions differ");
  const diff = Buffer.alloc(actual.rgba.length);
  let changedPixels = 0;
  for (let offset = 0; offset < diff.length; offset += 4) {
    if (
      !baseline.rgba.subarray(offset, offset + 4).equals(actual.rgba.subarray(offset, offset + 4))
    ) {
      changedPixels += 1;
      diff.set([255, 0, 255, 255], offset);
    }
  }
  return {
    actual: encodePng(actual),
    baseline: encodePng(baseline),
    diff: encodePng({ width: actual.width, height: actual.height, rgba: diff }),
    decodedBytes: actual.rgba.length,
    changedPixels,
  };
}
