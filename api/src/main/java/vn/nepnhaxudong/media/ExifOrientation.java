package vn.nepnhaxudong.media;

import com.twelvemonkeys.imageio.metadata.Directory;
import com.twelvemonkeys.imageio.metadata.Entry;
import com.twelvemonkeys.imageio.metadata.exif.EXIFReader;
import com.twelvemonkeys.imageio.metadata.jpeg.JPEG;
import com.twelvemonkeys.imageio.metadata.jpeg.JPEGSegment;
import com.twelvemonkeys.imageio.metadata.jpeg.JPEGSegmentUtil;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Reads the Orientation tag of a JPEG. Phones store a photo as the sensor saw it and write the turn
 * into this tag. The upload removes all metadata, so it must apply the turn to the pixels first.
 */
final class ExifOrientation {

  /** The picture is upright; also the answer when the tag is missing or damaged. */
  static final int NORMAL = 1;

  private static final int TAG_ORIENTATION = 0x0112;
  private static final int LAST_VALUE = 8;
  private static final Logger LOG = LoggerFactory.getLogger(ExifOrientation.class);

  private ExifOrientation() {}

  /** Returns 1 to 8 (the EXIF values), or {@link #NORMAL} when there is no usable tag. */
  static int read(byte[] jpeg) {
    try (ImageInputStream input =
        new MemoryCacheImageInputStream(new ByteArrayInputStream(jpeg))) {
      List<JPEGSegment> segments = JPEGSegmentUtil.readSegments(input, JPEG.APP1, "Exif");
      if (segments.isEmpty()) {
        return NORMAL;
      }
      try (InputStream data = segments.get(0).data()) {
        // The identifier is "Exif" and two zero bytes; the segment reader has taken one of them.
        data.read();
        Directory tiff = new EXIFReader().read(new MemoryCacheImageInputStream(data));
        Entry entry = tiff.getEntryById(TAG_ORIENTATION);
        if (entry != null && entry.getValue() instanceof Number value) {
          int orientation = value.intValue();
          if (orientation >= NORMAL && orientation <= LAST_VALUE) {
            return orientation;
          }
        }
        return NORMAL;
      }
    } catch (Exception e) {
      // A damaged tag must not stop an upload: the pixels are kept as they are.
      LOG.warn("The EXIF orientation of an uploaded photo could not be read: {}", e.toString());
      return NORMAL;
    }
  }
}
