package vn.nepnhaxudong.media;

import java.io.InputStream;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;

/**
 * Stores, lists, edits and deletes images for the admin area. Every write is recorded in the audit
 * log. Media is not restorable from the log: a deleted file is gone, so there is no
 * {@code AuditedHandler} for it.
 */
@Service
public class MediaService {

  static final String AUDIT_TYPE = "media";
  static final int PAGE_SIZE = 50;
  static final int MAX_ALT_LENGTH = 300;
  static final String NOT_FOUND = "Không tìm thấy ảnh.";
  static final String IN_USE = "Ảnh đang được dùng.";

  private final ImageProcessor processor;
  private final MediaStorage storage;
  private final MediaRepository media;
  private final AuditService audit;
  private final Clock clock;
  private final TransactionTemplate transaction;

  public MediaService(
      ImageProcessor processor,
      MediaStorage storage,
      MediaRepository media,
      AuditService audit,
      Clock clock,
      TransactionTemplate transaction) {
    this.processor = processor;
    this.storage = storage;
    this.media = media;
    this.audit = audit;
    this.clock = clock;
    this.transaction = transaction;
  }

  /**
   * Checks the alt texts, processes the image and stores it. The image work (the slow part) runs
   * before the transaction starts, so no database connection waits for it.
   */
  public MediaAdminDto upload(InputStream file, String altVi, String altEn) {
    String vi = cleanAlt(altVi, "tiếng Việt");
    String en = cleanAlt(altEn, "tiếng Anh");
    ProcessedImage image = processor.process(file);
    return transaction.execute(status -> store(image, vi, en));
  }

  @Transactional(readOnly = true)
  public List<MediaAdminDto> list(int page) {
    if (page < 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Số trang không hợp lệ.");
    }
    return media.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page, PAGE_SIZE)).stream()
        .map(MediaAdminDto::from)
        .toList();
  }

  @Transactional
  public MediaAdminDto updateAltTexts(long id, MediaAltRequest request) {
    var image = find(id);
    String vi = cleanAlt(request.altVi(), "tiếng Việt");
    String en = cleanAlt(request.altEn(), "tiếng Anh");
    var before = MediaAdminDto.from(image);
    image.changeAltTexts(vi, en);
    var after = MediaAdminDto.from(image);
    audit.record(AUDIT_TYPE, id, AuditAction.UPDATE, before, after);
    return after;
  }

  /**
   * Deletes the row, and the file after the commit. An image that something still points to is
   * refused with 409; the check comes first for the message, and the database constraint catches a
   * reference that is added at the same moment.
   */
  @Transactional
  public void delete(long id) {
    var image = find(id);
    if (media.isUsed(id)) {
      throw new ApiException(HttpStatus.CONFLICT, IN_USE);
    }
    var before = MediaAdminDto.from(image);
    try {
      media.delete(image);
      media.flush();
    } catch (DataIntegrityViolationException e) {
      throw new ApiException(HttpStatus.CONFLICT, IN_USE);
    }
    audit.record(AUDIT_TYPE, id, AuditAction.DELETE, before, null);
    storage.deleteAfterCommit(image.getPath());
  }

  /**
   * Writes the file, then the row. When the transaction is rolled back (the insert or the audit
   * line failed), the file is deleted again. The path has the date from the application clock and a
   * random name; the name the client gave is never used.
   */
  private MediaAdminDto store(ProcessedImage image, String altVi, String altEn) {
    ZonedDateTime now = clock.instant().atZone(ZoneOffset.UTC);
    String path =
        "%04d/%02d/%s.%s"
            .formatted(now.getYear(), now.getMonthValue(), UUID.randomUUID(), image.extension());
    storage.write(path, image.bytes());
    storage.deleteOnRollback(path);
    var saved =
        media.save(
            Media.create(
                path,
                image.mime(),
                image.width(),
                image.height(),
                image.bytes().length,
                altVi,
                altEn));
    var after = MediaAdminDto.from(saved);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.CREATE, null, after);
    return after;
  }

  private Media find(long id) {
    return media.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND));
  }

  /** Trims the text; it must not be blank and has at most 300 characters. */
  private static String cleanAlt(String text, String language) {
    String trimmed = text == null ? "" : text.trim();
    if (trimmed.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "Mô tả ảnh (" + language + ") không được để trống.");
    }
    if (trimmed.length() > MAX_ALT_LENGTH) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "Mô tả ảnh (" + language + ") dài tối đa " + MAX_ALT_LENGTH + " ký tự.");
    }
    return trimmed;
  }
}
