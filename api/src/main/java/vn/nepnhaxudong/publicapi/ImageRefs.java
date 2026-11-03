package vn.nepnhaxudong.publicapi;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.media.Media;
import vn.nepnhaxudong.media.MediaRepository;

/** The pictures of one public answer, read with one query and described in one language. */
final class ImageRefs {

  private static final String URL_PREFIX = "/media/";

  private final Map<Long, Media> byId;
  private final Lang lang;

  private ImageRefs(Map<Long, Media> byId, Lang lang) {
    this.byId = byId;
    this.lang = lang;
  }

  static ImageRefs load(MediaRepository media, Collection<Long> ids, Lang lang) {
    List<Long> wanted = ids.stream().filter(Objects::nonNull).distinct().toList();
    Map<Long, Media> found =
        wanted.isEmpty()
            ? Map.of()
            : media.findAllById(wanted).stream()
                .collect(Collectors.toMap(Media::getId, Function.identity()));
    return new ImageRefs(found, lang);
  }

  /** The picture, or null when there is no id (a missing file is treated like no picture). */
  ImageRefDto ref(Long mediaId) {
    Media media = mediaId == null ? null : byId.get(mediaId);
    if (media == null) {
      return null;
    }
    return new ImageRefDto(
        URL_PREFIX + media.getPath(),
        media.getWidth(),
        media.getHeight(),
        PublicText.pick(lang, media.getAltVi(), media.getAltEn()));
  }

  /** The pictures in the order of the ids, without the ones that do not exist. */
  List<ImageRefDto> refs(List<Long> mediaIds) {
    return mediaIds.stream().map(this::ref).filter(Objects::nonNull).toList();
  }
}
