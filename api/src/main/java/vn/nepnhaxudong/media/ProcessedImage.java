package vn.nepnhaxudong.media;

/** An image after processing: the bytes to store, and what the file is. */
public record ProcessedImage(byte[] bytes, String mime, int width, int height) {

  /** File extension without the dot, from the mime type. */
  public String extension() {
    return switch (mime) {
      case ImageProcessor.MIME_PNG -> "png";
      default -> "jpg";
    };
  }
}
