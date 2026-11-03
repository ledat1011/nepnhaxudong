package vn.nepnhaxudong.media;

import java.nio.charset.StandardCharsets;

/**
 * Reads the picture size of a WebP file from its RIFF chunks, without decoding. The decoder
 * allocates the size that the bitstream declares ({@code VP8 } or {@code VP8L} chunk), which can be
 * much larger than the canvas of the {@code VP8X} chunk, so the size of the bitstream is the one
 * that must be checked. A file whose canvas and bitstream disagree is refused, and so is an
 * animated file (only still pictures are accepted).
 */
final class WebpHeader {

  private static final int RIFF_HEADER_BYTES = 12;
  private static final int CHUNK_HEADER_BYTES = 8;
  private static final int VP8X_MIN_BYTES = 10;
  private static final int VP8_MIN_BYTES = 10;
  private static final int VP8L_MIN_BYTES = 5;
  private static final int VP8X_ANIMATION_FLAG = 0x02;
  private static final int VP8L_SIGNATURE = 0x2F;
  private static final int MASK_14_BITS = 0x3FFF;

  private WebpHeader() {}

  /**
   * The size of the first picture of the file.
   *
   * @throws UnsupportedImageException when the file is animated, damaged, has no picture chunk, or
   *     when the canvas and the bitstream have different sizes
   */
  static ImageSize read(byte[] file) {
    ImageSize canvas = null;
    ImageSize picture = null;
    boolean animated = false;
    int position = RIFF_HEADER_BYTES;
    while (position + CHUNK_HEADER_BYTES <= file.length) {
      String type = new String(file, position, 4, StandardCharsets.US_ASCII);
      long size = littleEndian(file, position + 4, 4) & 0xFFFFFFFFL;
      int data = position + CHUNK_HEADER_BYTES;
      if (size > file.length - data) {
        throw damaged();
      }
      int length = (int) size;
      switch (type) {
        case "VP8X" -> {
          if (length < VP8X_MIN_BYTES) {
            throw damaged();
          }
          animated |= (file[data] & VP8X_ANIMATION_FLAG) != 0;
          canvas =
              new ImageSize(
                  1 + littleEndian(file, data + 4, 3), 1 + littleEndian(file, data + 7, 3));
        }
        case "ANIM", "ANMF" -> animated = true;
        case "VP8 " -> picture = picture != null ? picture : lossy(file, data, length);
        case "VP8L" -> picture = picture != null ? picture : lossless(file, data, length);
        default -> {}
      }
      // A chunk with an odd size is followed by one pad byte.
      position = data + length + (length & 1);
    }
    if (animated) {
      throw new UnsupportedImageException(ImageProcessor.ANIMATED_MESSAGE);
    }
    if (picture == null || (canvas != null && !canvas.equals(picture))) {
      throw damaged();
    }
    return picture;
  }

  /** The VP8 frame header: 3 bytes of frame tag, start code 9D 01 2A, two 14-bit sizes. */
  private static ImageSize lossy(byte[] file, int data, int length) {
    boolean startCode =
        length >= VP8_MIN_BYTES
            && (file[data + 3] & 0xFF) == 0x9D
            && (file[data + 4] & 0xFF) == 0x01
            && (file[data + 5] & 0xFF) == 0x2A;
    if (!startCode) {
      throw damaged();
    }
    return new ImageSize(
        littleEndian(file, data + 6, 2) & MASK_14_BITS,
        littleEndian(file, data + 8, 2) & MASK_14_BITS);
  }

  /** The VP8L header: signature 0x2F, then width - 1 and height - 1 in 14 bits each. */
  private static ImageSize lossless(byte[] file, int data, int length) {
    if (length < VP8L_MIN_BYTES || (file[data] & 0xFF) != VP8L_SIGNATURE) {
      throw damaged();
    }
    int bits = littleEndian(file, data + 1, 4);
    return new ImageSize((bits & MASK_14_BITS) + 1, ((bits >>> 14) & MASK_14_BITS) + 1);
  }

  private static int littleEndian(byte[] bytes, int offset, int count) {
    int value = 0;
    for (int i = count - 1; i >= 0; i--) {
      value = (value << 8) | (bytes[offset + i] & 0xFF);
    }
    return value;
  }

  private static UnsupportedImageException damaged() {
    return new UnsupportedImageException(ImageProcessor.TYPE_MESSAGE);
  }
}
