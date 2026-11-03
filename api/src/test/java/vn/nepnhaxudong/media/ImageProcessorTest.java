package vn.nepnhaxudong.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** The image rules without a web server: formats, size, orientation and metadata. */
class ImageProcessorTest {

  private static final String TYPE_MESSAGE = "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
  private static final String HEIC_MESSAGE =
      "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.";
  private static final String TOO_LARGE_MESSAGE =
      "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 40 megapixel.";
  private static final String UNREADABLE_MESSAGE =
      "Không đọc được ảnh. Hãy chọn ảnh JPEG, PNG hoặc WebP khác.";

  private final ImageProcessor processor = new ImageProcessor();

  private ProcessedImage process(byte[] bytes) {
    return processor.process(new ByteArrayInputStream(bytes));
  }

  // ---- size ----------------------------------------------------------------------------------

  @Test
  void aBigJpegIsScaledDownToTheLongEdgeAndKeepsItsRatio() {
    ProcessedImage result = process(TestImages.jpeg(4000, 3000));

    assertThat(result.width()).isEqualTo(2560);
    assertThat(result.height()).isEqualTo(1920);
    assertThat(result.mime()).isEqualTo("image/jpeg");
    assertThat(result.extension()).isEqualTo("jpg");
    BufferedImage saved = TestImages.decode(result.bytes());
    assertThat(saved.getWidth()).isEqualTo(2560);
    assertThat(saved.getHeight()).isEqualTo(1920);
  }

  @Test
  void aTallImageIsScaledByItsHeight() {
    ProcessedImage result = process(TestImages.jpeg(3000, 5120));

    assertThat(result.width()).isEqualTo(1500);
    assertThat(result.height()).isEqualTo(2560);
  }

  @Test
  void aSmallImageIsNotEnlarged() {
    ProcessedImage result = process(TestImages.jpeg(800, 600));

    assertThat(result.width()).isEqualTo(800);
    assertThat(result.height()).isEqualTo(600);
  }

  @Test
  void anImageThatIsMuchLargerThanTheLimitIsReducedWhileItIsRead() {
    // 8000 x 4000 = 32 megapixels: allowed, and read with subsampling.
    ProcessedImage result = process(TestImages.binaryPng(8000, 4000));

    assertThat(result.width()).isEqualTo(2560);
    assertThat(result.height()).isEqualTo(1280);
  }

  // ---- decompression bombs -------------------------------------------------------------------

  @Test
  void moreThanFortyMegapixelsIsRefusedBeforeThePixelsAreRead() {
    // 7000 x 6000 = 42 megapixels, but only a few KB of PNG data.
    byte[] bomb = TestImages.binaryPng(7000, 6000);

    assertThatThrownBy(() -> process(bomb))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(TOO_LARGE_MESSAGE);
  }

  @Test
  void aSideLongerThanTwelveThousandPixelsIsRefused() {
    byte[] wide = TestImages.binaryPng(12_001, 1);

    assertThatThrownBy(() -> process(wide))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(TOO_LARGE_MESSAGE);
  }

  @Test
  void aSideOfExactlyTwelveThousandPixelsIsAccepted() {
    ProcessedImage result = process(TestImages.binaryPng(12_000, 1));

    assertThat(result.width()).isEqualTo(2560);
    assertThat(result.height()).isEqualTo(1);
  }

  // ---- formats -------------------------------------------------------------------------------

  @Test
  void textInsideAJpgFileIsRefused() {
    byte[] fake = "this is only text, not a picture".getBytes(StandardCharsets.UTF_8);

    assertThatThrownBy(() -> process(fake))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(TYPE_MESSAGE);
  }

  @Test
  void anEmptyFileIsRefused() {
    assertThatThrownBy(() -> process(new byte[0]))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(TYPE_MESSAGE);
  }

  @ParameterizedTest
  @CsvSource({"heic", "heix", "mif1"})
  void heicBrandsAreRefusedWithTheirOwnMessage(String brand) {
    byte[] heic = TestImages.HEIC.clone();
    byte[] brandBytes = brand.getBytes(StandardCharsets.US_ASCII);
    System.arraycopy(brandBytes, 0, heic, 8, 4);

    assertThatThrownBy(() -> process(heic))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(HEIC_MESSAGE);
  }

  @Test
  void aJpegThatCannotBeDecodedIsRefused() {
    byte[] truncated = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 4, 1, 2};

    assertThatThrownBy(() -> process(truncated))
        .isInstanceOf(UnsupportedImageException.class)
        .hasMessage(UNREADABLE_MESSAGE);
  }

  @Test
  void aWebpBecomesAJpeg() {
    ProcessedImage result = process(Base64.getDecoder().decode(TestImages.WEBP_1X1));

    assertThat(result.mime()).isEqualTo("image/jpeg");
    assertThat(result.width()).isEqualTo(1);
    assertThat(result.height()).isEqualTo(1);
    assertThat(TestImages.decode(result.bytes())).isNotNull();
  }

  @Test
  void aWebpWithAlphaBecomesAJpegOnWhite() {
    ProcessedImage result = process(Base64.getDecoder().decode(TestImages.WEBP_1X1_ALPHA));

    assertThat(result.mime()).isEqualTo("image/jpeg");
    assertThat(TestImages.decode(result.bytes()).getColorModel().hasAlpha()).isFalse();
  }

  @Test
  void aPngStaysAPngAndKeepsItsTransparency() {
    ProcessedImage result = process(TestImages.png(100, 80, true));

    assertThat(result.mime()).isEqualTo("image/png");
    assertThat(result.extension()).isEqualTo("png");
    BufferedImage saved = TestImages.decode(result.bytes());
    assertThat(saved.getWidth()).isEqualTo(100);
    assertThat(saved.getHeight()).isEqualTo(80);
    assertThat(saved.getColorModel().hasAlpha()).isTrue();
    assertThat(new Color(saved.getRGB(10, 10), true).getAlpha()).isZero();
    assertThat(new Color(saved.getRGB(90, 70), true).getAlpha()).isEqualTo(255);
  }

  @Test
  void aTransparentPngIsScaledDownAndStaysAPng() {
    ProcessedImage result = process(TestImages.png(3000, 2000, true));

    assertThat(result.mime()).isEqualTo("image/png");
    assertThat(result.width()).isEqualTo(2560);
    assertThat(result.height()).isEqualTo(1707);
  }

  // ---- metadata ------------------------------------------------------------------------------

  @Test
  void exifAndXmpSegmentsAreNotInTheSavedJpeg() {
    byte[] source =
        TestImages.jpegWithSegments(
            400, 300, TestImages.exifSegment(null, true), TestImages.xmpSegment());
    assertThat(TestImages.jpegMarkers(source)).contains(TestImages.APP1);
    assertThat(TestImages.contains(source, "secret-place")).isTrue();

    ProcessedImage result = process(source);

    assertThat(TestImages.jpegMarkers(result.bytes())).doesNotContain(TestImages.APP1);
    assertThat(TestImages.contains(result.bytes(), "Exif")).isFalse();
    assertThat(TestImages.contains(result.bytes(), "xap")).isFalse();
    assertThat(TestImages.contains(result.bytes(), "secret-place")).isFalse();
  }

  @Test
  void metadataChunksAreNotInTheSavedPng() {
    byte[] source = TestImages.pngWithMetadataChunks(TestImages.png(64, 64, false));
    assertThat(TestImages.pngChunkTypes(source)).contains("eXIf", "tEXt", "iTXt");

    ProcessedImage result = process(source);

    assertThat(TestImages.pngChunkTypes(result.bytes()))
        .doesNotContain("eXIf", "tEXt", "iTXt", "zTXt", "tIME");
    assertThat(TestImages.contains(result.bytes(), "secret-place")).isFalse();
  }

  // ---- orientation ---------------------------------------------------------------------------

  /** Where the top-left corner of the source goes: TL, TR, BR or BL of the saved image. */
  @ParameterizedTest
  @CsvSource({
    "1, 400, 300, TL",
    "2, 400, 300, TR",
    "3, 400, 300, BR",
    "4, 400, 300, BL",
    "5, 300, 400, TL",
    "6, 300, 400, TR",
    "7, 300, 400, BR",
    "8, 300, 400, BL"
  })
  void theExifOrientationIsAppliedToThePixels(
      int orientation, int width, int height, String corner) {
    byte[] source =
        TestImages.jpegWithSegments(400, 300, TestImages.exifSegment(orientation, true));

    ProcessedImage result = process(source);

    assertThat(result.width()).isEqualTo(width);
    assertThat(result.height()).isEqualTo(height);
    BufferedImage saved = TestImages.decode(result.bytes());
    assertThat(saved.getWidth()).isEqualTo(width);
    assertThat(saved.getHeight()).isEqualTo(height);
    int x = corner.endsWith("L") ? 10 : width - 11;
    int y = corner.startsWith("T") ? 10 : height - 11;
    assertThat(isRed(saved.getRGB(x, y))).as("red square at %s", corner).isTrue();
    // The opposite corner is blue.
    int ox = corner.endsWith("L") ? width - 11 : 10;
    int oy = corner.startsWith("T") ? height - 11 : 10;
    assertThat(isBlue(saved.getRGB(ox, oy))).isTrue();
  }

  @Test
  void aBigImageWithOrientationSixIsRotatedAndScaled() {
    byte[] source =
        TestImages.jpegWithSegments(4000, 3000, TestImages.exifSegment(6, false));

    ProcessedImage result = process(source);

    assertThat(result.width()).isEqualTo(1920);
    assertThat(result.height()).isEqualTo(2560);
  }

  @Test
  void aBrokenExifSegmentKeepsThePixelsAsTheyAre() {
    byte[] source = TestImages.jpegWithSegments(400, 300, TestImages.brokenExifSegment());

    ProcessedImage result = process(source);

    assertThat(result.width()).isEqualTo(400);
    assertThat(result.height()).isEqualTo(300);
    assertThat(isRed(TestImages.decode(result.bytes()).getRGB(10, 10))).isTrue();
  }

  @Test
  void anOrientationOutsideOneToEightKeepsThePixelsAsTheyAre() {
    byte[] source = TestImages.jpegWithSegments(400, 300, TestImages.exifSegment(42, false));

    ProcessedImage result = process(source);

    assertThat(result.width()).isEqualTo(400);
    assertThat(result.height()).isEqualTo(300);
  }

  private static boolean isRed(int rgb) {
    var c = new Color(rgb);
    return c.getRed() > 180 && c.getGreen() < 80 && c.getBlue() < 80;
  }

  private static boolean isBlue(int rgb) {
    var c = new Color(rgb);
    return c.getBlue() > 180 && c.getRed() < 80 && c.getGreen() < 80;
  }
}
