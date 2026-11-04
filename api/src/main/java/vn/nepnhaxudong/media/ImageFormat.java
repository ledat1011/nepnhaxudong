package vn.nepnhaxudong.media;

import java.util.Optional;

/** The image formats the site accepts, recognised by the first bytes of the file. */
enum ImageFormat {
  JPEG("jpeg"),
  PNG("png"),
  WEBP("webp");

  private final String readerName;

  ImageFormat(String readerName) {
    this.readerName = readerName;
  }

  /** The format name used to look up an ImageIO reader. */
  String readerName() {
    return readerName;
  }

  /** JPEG starts with FF D8 FF, PNG with 89 'PNG', WebP with 'RIFF' size 'WEBP'. */
  static Optional<ImageFormat> detect(byte[] bytes) {
    if (startsWith(bytes, 0, 0xFF, 0xD8, 0xFF)) {
      return Optional.of(JPEG);
    }
    if (startsWith(bytes, 0, 0x89, 'P', 'N', 'G')) {
      return Optional.of(PNG);
    }
    if (startsWith(bytes, 0, 'R', 'I', 'F', 'F') && startsWith(bytes, 8, 'W', 'E', 'B', 'P')) {
      return Optional.of(WEBP);
    }
    return Optional.empty();
  }

  /** HEIC and HEIF files: a box of type 'ftyp' at byte 4 with one of the HEIC brands at byte 8. */
  static boolean isHeic(byte[] bytes) {
    return startsWith(bytes, 4, 'f', 't', 'y', 'p')
        && (startsWith(bytes, 8, 'h', 'e', 'i', 'c')
            || startsWith(bytes, 8, 'h', 'e', 'i', 'x')
            || startsWith(bytes, 8, 'm', 'i', 'f', '1'));
  }

  private static boolean startsWith(byte[] bytes, int offset, int... expected) {
    if (bytes.length < offset + expected.length) {
      return false;
    }
    for (int i = 0; i < expected.length; i++) {
      if ((bytes[offset + i] & 0xFF) != expected[i]) {
        return false;
      }
    }
    return true;
  }
}
