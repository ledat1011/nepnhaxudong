package vn.nepnhaxudong.press;

import java.time.Clock;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.media.MediaRepository;
import vn.nepnhaxudong.publish.ContentChangedEvent;

/** Reads and writes press mentions for the admin area. Every write is recorded in the audit log. */
@Service
public class PressService {

  static final String AUDIT_TYPE = "press_mention";
  static final String URL_INVALID =
      "Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https:// và dài tối đa "
          + WebAddress.MAX_LENGTH
          + " ký tự.";

  private final PressMentionRepository mentions;
  private final MediaRepository media;
  private final AuditService audit;
  private final ApplicationEventPublisher events;
  private final Clock clock;

  public PressService(
      PressMentionRepository mentions,
      MediaRepository media,
      AuditService audit,
      ApplicationEventPublisher events,
      Clock clock) {
    this.mentions = mentions;
    this.media = media;
    this.audit = audit;
    this.events = events;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<PressMentionAdminDto> list() {
    return mentions.findAllByOrderBySortOrderAscIdAsc().stream()
        .map(PressMentionAdminDto::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public PressMentionAdminDto get(long id) {
    return PressMentionAdminDto.from(find(id));
  }

  @Transactional
  public PressMentionAdminDto create(PressMentionRequest request) {
    validate(request);
    int sortOrder =
        request.sortOrder() != null ? request.sortOrder() : mentions.nextSortOrder();
    var mention = PressMention.create();
    apply(mention, request, sortOrder);
    mentions.save(mention);
    var after = PressMentionAdminDto.from(mention);
    audit.record(AUDIT_TYPE, after.id(), AuditAction.CREATE, null, after);
    events.publishEvent(ContentChangedEvent.home());
    return after;
  }

  @Transactional
  public PressMentionAdminDto update(long id, PressMentionRequest request) {
    var mention = find(id);
    validate(request);
    var before = PressMentionAdminDto.from(mention);
    apply(
        mention,
        request,
        request.sortOrder() != null ? request.sortOrder() : mention.getSortOrder());
    var after = PressMentionAdminDto.from(mention);
    audit.record(AUDIT_TYPE, id, AuditAction.UPDATE, before, after);
    events.publishEvent(ContentChangedEvent.home());
    return after;
  }

  @Transactional
  public void delete(long id) {
    var mention = find(id);
    var before = PressMentionAdminDto.from(mention);
    mentions.delete(mention);
    audit.record(AUDIT_TYPE, id, AuditAction.DELETE, before, null);
    events.publishEvent(ContentChangedEvent.home());
  }

  private PressMention find(long id) {
    return mentions
        .findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy bài báo."));
  }

  /** Writes the request into the mention and its titles; the caller has validated it. */
  void apply(PressMention mention, PressMentionRequest request, int sortOrder) {
    mention.setFields(
        request.url(), request.sourceName(), request.publishedOn(), request.mediaId(), sortOrder);
    mention.putTitle(Lang.VI, request.title().vi());
    if (request.title().en() == null) {
      mention.removeTitle(Lang.EN);
    } else {
      mention.putTitle(Lang.EN, request.title().en());
    }
    // The mention row may be unchanged while its titles changed; the change time still moves.
    mention.touch(clock.instant());
  }

  private void validate(PressMentionRequest request) {
    validateContent(request);
    if (request.mediaId() != null && !media.existsById(request.mediaId())) {
      throw invalid("Ảnh không tồn tại: " + request.mediaId() + ".");
    }
  }

  /** The rules that do not need the database. The image is checked separately. */
  void validateContent(PressMentionRequest request) {
    if (WebAddress.parse(request.url()).isEmpty()) {
      throw invalid(URL_INVALID);
    }
    if (request.sourceName() == null || request.sourceName().isBlank()) {
      throw invalid("Tên báo không được để trống.");
    }
    if (request.title() == null || request.title().vi() == null) {
      throw invalid("Tiêu đề bài báo (tiếng Việt) không được để trống.");
    }
  }

  private static ApiException invalid(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, detail);
  }
}
