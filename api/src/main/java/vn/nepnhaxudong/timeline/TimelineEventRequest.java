package vn.nepnhaxudong.timeline;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import vn.nepnhaxudong.common.LocalizedText;

/**
 * The body of POST and PUT. A PUT replaces the whole event, including its images. A missing {@code
 * sortOrder} puts a new event at the end and leaves an existing event where it is. A missing {@code
 * mediaIds} means no images. The texts are checked by {@link TimelineService} because their
 * messages name the field.
 */
public record TimelineEventRequest(
    @NotNull(message = TimelineEventRequest.YEAR_RANGE)
        @Min(value = TimelineEventRequest.MIN_YEAR, message = TimelineEventRequest.YEAR_RANGE)
        @Max(value = TimelineEventRequest.MAX_YEAR, message = TimelineEventRequest.YEAR_RANGE)
        Integer year,
    Integer sortOrder,
    LocalizedText title,
    LocalizedText description,
    @Size(
            max = TimelineEventRequest.MAX_IMAGES,
            message = "Một mốc có tối đa " + TimelineEventRequest.MAX_IMAGES + " ảnh.")
        List<@NotNull(message = "Mã ảnh không được để trống.") Long> mediaIds) {

  static final int MIN_YEAR = 1900;
  static final int MAX_YEAR = 2100;
  static final int MAX_IMAGES = 3;
  static final String YEAR_RANGE = "Năm phải nằm trong khoảng 1900 đến 2100.";

  public TimelineEventRequest {
    description = description == null ? new LocalizedText(null, null) : description;
    mediaIds = mediaIds == null ? List.of() : mediaIds;
  }
}
