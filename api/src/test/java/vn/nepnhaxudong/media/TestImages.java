package vn.nepnhaxudong.media;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;

/** Builds test images in memory: real pictures, with metadata that the upload must remove. */
final class TestImages {

  /** The marker of a JPEG segment that carries Exif and XMP metadata. */
  static final int APP1 = 0xE1;

  /** A 1x1 WebP file (lossy), base64. */
  static final String WEBP_1X1 = "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

  /** A 1x1 WebP file with an alpha channel, base64. */
  static final String WEBP_1X1_ALPHA =
      "UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==";

  /** The first 12 bytes of a HEIC file: box size, "ftyp", brand "heic". */
  static final byte[] HEIC =
      new byte[] {0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63};

  private TestImages() {}

  /** Blue picture with a red square in the top-left corner, so a test can see where it moved. */
  static BufferedImage picture(int width, int height) {
    var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = image.createGraphics();
    g.setColor(Color.BLUE);
    g.fillRect(0, 0, width, height);
    g.setColor(Color.RED);
    int square = Math.max(1, Math.min(width, height) / 4);
    g.fillRect(0, 0, square, square);
    g.dispose();
    return image;
  }

  static byte[] jpeg(int width, int height) {
    return write(picture(width, height), "jpg");
  }

  /** A JPEG whose first segments after SOI are the given complete segments (marker included). */
  static byte[] jpegWithSegments(int width, int height, byte[]... segments) {
    byte[] jpeg = jpeg(width, height);
    var out = new ByteArrayOutputStream();
    out.write(jpeg, 0, 2);
    for (byte[] segment : segments) {
      out.writeBytes(segment);
    }
    out.write(jpeg, 2, jpeg.length - 2);
    return out.toByteArray();
  }

  /**
   * An Exif segment (big-endian TIFF) with an Orientation tag when {@code orientation} is not null,
   * and with a GPS block (latitude reference "N") when {@code gps} is true.
   */
  static byte[] exifSegment(Integer orientation, boolean gps) {
    int entries = (orientation != null ? 1 : 0) + (gps ? 1 : 0);
    int gpsIfdOffset = 8 + 2 + entries * 12 + 4;
    var tiff = ByteBuffer.allocate(256);
    tiff.put((byte) 'M').put((byte) 'M').putShort((short) 0x002A).putInt(8);
    tiff.putShort((short) entries);
    if (orientation != null) {
      tiff.putShort((short) 0x0112).putShort((short) 3).putInt(1);
      tiff.putShort(orientation.shortValue()).putShort((short) 0);
    }
    if (gps) {
      tiff.putShort((short) 0x8825).putShort((short) 4).putInt(1).putInt(gpsIfdOffset);
    }
    tiff.putInt(0);
    if (gps) {
      tiff.putShort((short) 1);
      tiff.putShort((short) 0x0001).putShort((short) 2).putInt(2);
      tiff.put((byte) 'N').put((byte) 0).put((byte) 0).put((byte) 0);
      tiff.putInt(0);
    }
    byte[] tiffBytes = new byte[tiff.position()];
    tiff.flip().get(tiffBytes);
    var payload = new ByteArrayOutputStream();
    payload.writeBytes("Exif\0\0".getBytes(StandardCharsets.ISO_8859_1));
    payload.writeBytes(tiffBytes);
    return segment(APP1, payload.toByteArray());
  }

  /** An Exif segment whose content is not a TIFF structure at all. */
  static byte[] brokenExifSegment() {
    var payload = new ByteArrayOutputStream();
    payload.writeBytes("Exif\0\0".getBytes(StandardCharsets.ISO_8859_1));
    payload.writeBytes(new byte[] {'x', 'y', 'z', 1, 2, 3, 4, 5, 6, 7, 8, 9});
    return segment(APP1, payload.toByteArray());
  }

  static byte[] xmpSegment() {
    String xmp =
        "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x=\"adobe:ns:meta/\"><note>secret-place</note></x:xmpmeta>";
    return segment(APP1, xmp.getBytes(StandardCharsets.ISO_8859_1));
  }

  private static byte[] segment(int marker, byte[] payload) {
    var out = new ByteArrayOutputStream();
    out.write(0xFF);
    out.write(marker);
    int length = payload.length + 2;
    out.write(length >> 8);
    out.write(length & 0xFF);
    out.writeBytes(payload);
    return out.toByteArray();
  }

  /** The markers of the JPEG segments, from SOI up to the start of the scan. */
  static List<Integer> jpegMarkers(byte[] jpeg) {
    var markers = new ArrayList<Integer>();
    int i = 2;
    while (i + 4 <= jpeg.length) {
      if ((jpeg[i] & 0xFF) != 0xFF) {
        throw new IllegalArgumentException("Not a marker at " + i);
      }
      int marker = jpeg[i + 1] & 0xFF;
      markers.add(marker);
      if (marker == 0xDA) {
        break;
      }
      i += 2 + (((jpeg[i + 2] & 0xFF) << 8) | (jpeg[i + 3] & 0xFF));
    }
    return markers;
  }

  static byte[] png(int width, int height, boolean alpha) {
    int type = alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
    var image = new BufferedImage(width, height, type);
    Graphics2D g = image.createGraphics();
    g.setColor(Color.BLUE);
    g.fillRect(0, 0, width, height);
    if (alpha) {
      // The top-left quarter is fully transparent.
      g.setComposite(java.awt.AlphaComposite.Clear);
      g.fillRect(0, 0, width / 2, height / 2);
    }
    g.dispose();
    return write(image, "png");
  }

  /** A 1-bit PNG: a big picture that costs little memory to build in a test. */
  static byte[] binaryPng(int width, int height) {
    return write(new BufferedImage(width, height, BufferedImage.TYPE_BYTE_BINARY), "png");
  }

  /** The PNG with an eXIf, a tEXt and an iTXt chunk added after the header chunk. */
  static byte[] pngWithMetadataChunks(byte[] png) {
    var out = new ByteArrayOutputStream();
    int afterIhdr = 8 + 4 + 4 + 13 + 4;
    out.write(png, 0, afterIhdr);
    out.writeBytes(chunk("eXIf", exifSegment(1, true)));
    out.writeBytes(chunk("tEXt", "Comment\0secret-place".getBytes(StandardCharsets.ISO_8859_1)));
    out.writeBytes(chunk("iTXt", "XML:com.adobe.xmp\0\0\0\0\0secret-place".getBytes(StandardCharsets.ISO_8859_1)));
    out.write(png, afterIhdr, png.length - afterIhdr);
    return out.toByteArray();
  }

  private static byte[] chunk(String type, byte[] data) {
    byte[] typeBytes = type.getBytes(StandardCharsets.ISO_8859_1);
    var crc = new CRC32();
    crc.update(typeBytes);
    crc.update(data);
    return ByteBuffer.allocate(12 + data.length)
        .putInt(data.length)
        .put(typeBytes)
        .put(data)
        .putInt((int) crc.getValue())
        .array();
  }

  static List<String> pngChunkTypes(byte[] png) {
    var types = new ArrayList<String>();
    var buffer = ByteBuffer.wrap(png);
    buffer.position(8);
    while (buffer.remaining() >= 12) {
      int length = buffer.getInt();
      byte[] type = new byte[4];
      buffer.get(type);
      types.add(new String(type, StandardCharsets.ISO_8859_1));
      buffer.position(buffer.position() + length + 4);
    }
    return types;
  }

  static BufferedImage decode(byte[] bytes) {
    try {
      return ImageIO.read(new ByteArrayInputStream(bytes));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  static boolean contains(byte[] bytes, String text) {
    return new String(bytes, StandardCharsets.ISO_8859_1).contains(text);
  }

  private static byte[] write(BufferedImage image, String format) {
    var out = new ByteArrayOutputStream();
    try {
      if (!ImageIO.write(image, format, out)) {
        throw new IllegalStateException("No writer for " + format);
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return out.toByteArray();
  }
}
