package vn.nepnhaxudong.story;

import vn.nepnhaxudong.common.LocalizedText;

/**
 * The body of POST and PUT. A PUT replaces the whole story; the status is changed only by publish
 * and unpublish. A blank slug keeps the slug the story already has in that language, and is made from the title only when it has none. The texts are checked by
 * {@link StoryService} because their messages name the field.
 */
public record StoryRequest(
    Long coverMediaId,
    LocalizedText slug,
    LocalizedText title,
    LocalizedText excerpt,
    LocalizedText bodyHtml) {

  public StoryRequest {
    slug = slug == null ? new LocalizedText(null, null) : slug;
    excerpt = excerpt == null ? new LocalizedText(null, null) : excerpt;
    bodyHtml = bodyHtml == null ? new LocalizedText(null, null) : bodyHtml;
  }
}
