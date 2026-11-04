package vn.nepnhaxudong.media;

/**
 * An image as the admin sees it. {@code url} is the public address {@code /media/<path>}. It is
 * also the snapshot kept in the audit log.
 */
public record MediaAdminDto(
    long id, String url, int width, int height, String mime, String altVi, String altEn) {

  static final String URL_PREFIX = "/media/";

  static MediaAdminDto from(Media media) {
    return new MediaAdminDto(
        media.getId(),
        URL_PREFIX + media.getPath(),
        media.getWidth(),
        media.getHeight(),
        media.getMime(),
        media.getAltVi(),
        media.getAltEn());
  }
}
