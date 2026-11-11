import { readFileSync } from "node:fs";

/** Width and height of a WebP file, read from its header. For tests only. */
export function webpSize(file: string): [number, number] {
  const data = readFileSync(file);
  const format = data.toString("ascii", 12, 16);
  if (format === "VP8 ") return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  if (format === "VP8L") {
    const bits = data.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (format === "VP8X") return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
  throw new Error(`${file} is not a WebP file`);
}
