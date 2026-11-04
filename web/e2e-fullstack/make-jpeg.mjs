// Builds a minimal valid JPEG in code, so no real photo (and no EXIF data) is needed.
// The image is a flat mid-gray square, written as a baseline grayscale JPEG with
// - all quantization steps 1,
// - one Huffman code of 1 bit ("0") in both the DC and the AC table, for the symbol 0.
// Every 8x8 block of mid-gray has all coefficients 0 after the level shift, so a block is
// "DC difference category 0" + "end of block" = the bits 0 and 0. The scan data is therefore all zero bytes.
// There is no APP1 (EXIF) segment, only a JFIF APP0 header.
import { Buffer } from "node:buffer";

const SIZE = 64; // pixels; a multiple of 8

function segment(marker, payload) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, payload]);
}

function huffmanTable(tableClassAndId) {
  const counts = Buffer.alloc(16);
  counts[0] = 1; // one code of length 1
  return Buffer.concat([Buffer.from([tableClassAndId]), counts, Buffer.from([0x00])]);
}

export function makeTinyJpeg() {
  const blocks = (SIZE / 8) * (SIZE / 8);
  const scan = Buffer.alloc(Math.ceil((blocks * 2) / 8)); // 2 zero bits per block, already a whole number of bytes
  const frame = Buffer.alloc(9);
  frame[0] = 8; // sample precision
  frame.writeUInt16BE(SIZE, 1); // height
  frame.writeUInt16BE(SIZE, 3); // width
  frame[5] = 1; // one component
  frame[6] = 1; // component id
  frame[7] = 0x11; // sampling 1x1
  frame[8] = 0; // quantization table 0
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    segment(0xe0, Buffer.from([0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0])), // JFIF
    segment(0xdb, Buffer.concat([Buffer.from([0x00]), Buffer.alloc(64, 1)])), // quantization table
    segment(0xc0, frame), // baseline frame
    segment(0xc4, huffmanTable(0x00)), // DC table
    segment(0xc4, huffmanTable(0x10)), // AC table
    segment(0xda, Buffer.from([1, 1, 0x00, 0, 63, 0])), // scan header: component 1, tables 0/0, spectral 0..63
    scan,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}
