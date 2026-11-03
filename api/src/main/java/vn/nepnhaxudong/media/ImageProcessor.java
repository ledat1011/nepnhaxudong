package vn.nepnhaxudong.media;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.stereotype.Component;

/**
 * Turns an uploaded image into the file the site stores: at most {@link #MAX_EDGE_PX} pixels on the
 * long edge, turned upright by the EXIF orientation, and without any metadata (EXIF, GPS, XMP, text
 * chunks). The image is drawn into a new picture and written again, so nothing but pixels is kept.
 *
 * <p>The header is read first. A decompression bomb (a small file with a huge picture inside) is
 * refused before any pixel is decoded, and a big but allowed picture is decoded with subsampling,
 * so the heap use stays bounded: see {@link #read}.
 */
@Component
public class ImageProcessor {

  public static final String MIME_JPEG = "image/jpeg";
  public static final String MIME_PNG = "image/png";
  public static final int MAX_EDGE_PX = 2560;

  /** Largest picture that is decoded: 40 megapixels, and no side above 12,000 pixels. */
  static final long MAX_PIXELS = 40_000_000L;

  static final int MAX_SIDE_PX = 12_000;
  static final float JPEG_QUALITY = 0.85f;

  static final String TYPE_MESSAGE = "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
  static final String HEIC_MESSAGE = "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.";
  static final String TOO_LARGE_MESSAGE = "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 40 megapixel.";
  static final String UNREADABLE_MESSAGE =
      "Không đọc được ảnh. Hãy chọn ảnh JPEG, PNG hoặc WebP khác.";

  private static final String TWELVEMONKEYS_PACKAGE = "com.twelvemonkeys.";

  /**
   * Reads, turns, shrinks and writes the image. JPEG and WebP are written as JPEG (quality 0.85, a
   * transparent WebP is put on white), PNG is written as PNG.
   *
   * @throws UnsupportedImageException when the file is not an accepted image (answered as 415)
   */
  public ProcessedImage process(InputStream in) {
    byte[] bytes = readAll(in);
    ImageFormat format =
        ImageFormat.detect(bytes)
            .orElseThrow(
                () ->
                    new UnsupportedImageException(
                        ImageFormat.isHeic(bytes) ? HEIC_MESSAGE : TYPE_MESSAGE));
    // The orientation has to be read before the metadata is dropped.
    int orientation =
        format == ImageFormat.JPEG ? ExifOrientation.read(bytes) : ExifOrientation.NORMAL;
    BufferedImage source = read(bytes, format);
    boolean asPng = format == ImageFormat.PNG;
    BufferedImage result =
        redraw(source, orientation, asPng && source.getColorModel().hasAlpha());
    byte[] encoded = asPng ? writePng(result) : writeJpeg(result);
    return new ProcessedImage(
        encoded, asPng ? MIME_PNG : MIME_JPEG, result.getWidth(), result.getHeight());
  }

  private static byte[] readAll(InputStream in) {
    try {
      return in.readAllBytes();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /**
   * Decodes the first picture of the file. The size is taken from the header and checked before the
   * pixels are decoded. When the picture is more than twice as long as {@link #MAX_EDGE_PX}, only
   * every n-th pixel of every n-th row is decoded (n is chosen so that the long edge stays at
   * least {@link #MAX_EDGE_PX}); the final smooth scaling then has a factor below 2. A picture of
   * the largest allowed size is therefore decoded at about 1/9 of its memory.
   */
  private static BufferedImage read(byte[] bytes, ImageFormat format) {
    ImageReader reader = readerFor(format);
    try (ImageInputStream input =
        new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
      reader.setInput(input, true, true);
      int width = reader.getWidth(0);
      int height = reader.getHeight(0);
      if (width < 1
          || height < 1
          || width > MAX_SIDE_PX
          || height > MAX_SIDE_PX
          || (long) width * height > MAX_PIXELS) {
        throw new UnsupportedImageException(TOO_LARGE_MESSAGE);
      }
      ImageReadParam param = reader.getDefaultReadParam();
      int step = Math.max(1, Math.max(width, height) / MAX_EDGE_PX);
      if (step > 1) {
        param.setSourceSubsampling(step, step, 0, 0);
      }
      return reader.read(0, param);
    } catch (UnsupportedImageException e) {
      throw e;
    } catch (IOException | RuntimeException e) {
      throw new UnsupportedImageException(UNREADABLE_MESSAGE);
    } finally {
      reader.dispose();
    }
  }

  /** The TwelveMonkeys reader when there is one: it also reads CMYK JPEGs. */
  private static ImageReader readerFor(ImageFormat format) {
    Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(format.readerName());
    ImageReader first = null;
    while (readers.hasNext()) {
      ImageReader reader = readers.next();
      if (reader.getClass().getName().startsWith(TWELVEMONKEYS_PACKAGE)) {
        return reader;
      }
      if (first == null) {
        first = reader;
      }
    }
    if (first == null) {
      throw new IllegalStateException("No image reader for " + format);
    }
    return first;
  }

  /**
   * Draws the picture into a new one: turned by the orientation and at most MAX_EDGE_PX on the long
   * edge (never enlarged). A picture that becomes a JPEG gets a white background.
   */
  private static BufferedImage redraw(BufferedImage source, int orientation, boolean keepAlpha) {
    int width = source.getWidth();
    int height = source.getHeight();
    int longEdge = Math.max(width, height);
    int scaledWidth = width;
    int scaledHeight = height;
    if (longEdge > MAX_EDGE_PX) {
      scaledWidth = Math.max(1, (int) Math.round((double) width * MAX_EDGE_PX / longEdge));
      scaledHeight = Math.max(1, (int) Math.round((double) height * MAX_EDGE_PX / longEdge));
    }
    boolean swapped = orientation >= 5;
    int targetWidth = swapped ? scaledHeight : scaledWidth;
    int targetHeight = swapped ? scaledWidth : scaledHeight;

    var target =
        new BufferedImage(
            targetWidth,
            targetHeight,
            keepAlpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
    Graphics2D g = target.createGraphics();
    try {
      if (!keepAlpha) {
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, targetWidth, targetHeight);
      }
      g.setRenderingHint(
          RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
      g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      AffineTransform transform = orientationTransform(orientation, scaledWidth, scaledHeight);
      transform.scale((double) scaledWidth / width, (double) scaledHeight / height);
      g.drawImage(source, transform, null);
    } finally {
      g.dispose();
    }
    return target;
  }

  /**
   * Maps a picture of the given (already scaled) size to the upright picture. The numbers are the
   * EXIF orientation values: 2 mirror, 3 turn 180, 4 flip, 5 transpose, 6 turn 90 clockwise,
   * 7 transverse, 8 turn 90 counter-clockwise.
   */
  private static AffineTransform orientationTransform(int orientation, int width, int height) {
    return switch (orientation) {
      case 2 -> new AffineTransform(-1, 0, 0, 1, width, 0);
      case 3 -> new AffineTransform(-1, 0, 0, -1, width, height);
      case 4 -> new AffineTransform(1, 0, 0, -1, 0, height);
      case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
      case 6 -> new AffineTransform(0, 1, -1, 0, height, 0);
      case 7 -> new AffineTransform(0, -1, -1, 0, height, width);
      case 8 -> new AffineTransform(0, -1, 1, 0, 0, width);
      default -> new AffineTransform();
    };
  }

  private static byte[] writeJpeg(BufferedImage image) {
    ImageWriter writer = writerFor("jpeg");
    ImageWriteParam param = writer.getDefaultWriteParam();
    param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
    param.setCompressionQuality(JPEG_QUALITY);
    return write(writer, image, param);
  }

  private static byte[] writePng(BufferedImage image) {
    ImageWriter writer = writerFor("png");
    return write(writer, image, writer.getDefaultWriteParam());
  }

  /** The JDK writer: it writes no metadata beyond the JFIF header (JPEG) or none (PNG). */
  private static ImageWriter writerFor(String format) {
    Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(format);
    ImageWriter first = null;
    while (writers.hasNext()) {
      ImageWriter writer = writers.next();
      if (writer.getClass().getName().startsWith("com.sun.imageio.")) {
        return writer;
      }
      if (first == null) {
        first = writer;
      }
    }
    if (first == null) {
      throw new IllegalStateException("No image writer for " + format);
    }
    return first;
  }

  /** Writes through memory only; the default ImageIO cache would create a temporary file. */
  private static byte[] write(ImageWriter writer, BufferedImage image, ImageWriteParam param) {
    var out = new ByteArrayOutputStream();
    try (ImageOutputStream output = new MemoryCacheImageOutputStream(out)) {
      writer.setOutput(output);
      writer.write(null, new IIOImage(image, null, null), param);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } finally {
      writer.dispose();
    }
    return out.toByteArray();
  }
}
