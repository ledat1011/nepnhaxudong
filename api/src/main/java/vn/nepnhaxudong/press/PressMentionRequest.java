package vn.nepnhaxudong.press;

import java.time.LocalDate;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * The body of POST and PUT. A PUT replaces the whole mention. A missing {@code sortOrder} puts a
 * new mention at the end and leaves an existing mention where it is. The texts and the address are
 * checked by {@link PressService} because their messages name the field.
 */
public record PressMentionRequest(
    String url,
    String sourceName,
    LocalDate publishedOn,
    LocalizedText title,
    Long mediaId,
    Integer sortOrder) {}
