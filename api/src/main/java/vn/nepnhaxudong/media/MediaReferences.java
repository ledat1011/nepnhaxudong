package vn.nepnhaxudong.media;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.nepnhaxudong.common.ApiException;

/** Checks that images still exist before old content that points to them is put back. */
@Component
public class MediaReferences {

  public static final String IMAGE_DELETED = "Không thể khôi phục: ảnh đã bị xóa.";

  private final MediaRepository media;

  public MediaReferences(MediaRepository media) {
    this.media = media;
  }

  /**
   * Answers 409 when one of the images does not exist any more. The ids must not contain null
   * (the caller checks that first, because a null id is a damaged snapshot, not a missing image).
   */
  public void requireAllExist(Collection<Long> ids) {
    Set<Long> wanted = Set.copyOf(ids);
    if (wanted.isEmpty()) {
      return;
    }
    Set<Long> found =
        media.findAllById(wanted).stream().map(Media::getId).collect(Collectors.toSet());
    if (found.size() < wanted.size()) {
      throw new ApiException(HttpStatus.CONFLICT, IMAGE_DELETED);
    }
  }
}
