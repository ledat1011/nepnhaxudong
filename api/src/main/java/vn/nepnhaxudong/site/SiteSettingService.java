package vn.nepnhaxudong.site;

import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.publish.ContentChangedEvent;

/**
 * Reads and writes the site settings. A key without a row reads as the empty value. Every write is
 * recorded in the audit log, with the id of the row as the entity id.
 */
@Service
public class SiteSettingService {

  static final String AUDIT_TYPE = "site_setting";
  static final String BAD_BODY =
      "Nội dung cài đặt không đọc được hoặc có trường không hợp lệ.";
  static final String CHANGED_MEANWHILE =
      "Cài đặt vừa được thay đổi bởi người khác. Hãy tải lại và thử lại.";

  private final SiteSettingRepository settings;
  private final AuditService audit;
  private final ApplicationEventPublisher events;
  private final JsonMapper json;
  // A body from a client must not carry a field the setting does not have.
  private final JsonMapper strictJson;
  private final JsonMapper lenientJson;

  public SiteSettingService(
      SiteSettingRepository settings,
      AuditService audit,
      ApplicationEventPublisher events,
      JsonMapper json) {
    this.settings = settings;
    this.audit = audit;
    this.events = events;
    this.json = json;
    this.strictJson =
        json.rebuild().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
    this.lenientJson =
        json.rebuild().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();
  }

  /** The value of the key, or the empty value when it was never saved. */
  @Transactional(readOnly = true)
  public SiteSettingValue get(SiteSettingKey key) {
    return settings
        .findBySettingKey(key.code())
        .map(row -> read(key, row))
        .orElseGet(key::empty);
  }

  @Transactional(readOnly = true)
  public ContactSettings contact() {
    return (ContactSettings) get(SiteSettingKey.CONTACT);
  }

  @Transactional(readOnly = true)
  public SocialSettings social() {
    return (SocialSettings) get(SiteSettingKey.SOCIAL);
  }

  @Transactional(readOnly = true)
  public BrandSettings brand() {
    return (BrandSettings) get(SiteSettingKey.BRAND);
  }

  /** Saves the JSON body of a PUT: it must be an object with only the fields of the key. */
  @Transactional
  public SiteSettingValue update(SiteSettingKey key, JsonNode body) {
    return save(key, parseStrict(key, body));
  }

  /** Checks the value and saves it as the value of the key, creating the row when needed. */
  @Transactional
  public SiteSettingValue save(SiteSettingKey key, SiteSettingValue value) {
    value.validate();
    Optional<SiteSetting> existing = settings.findBySettingKey(key.code());
    SiteSettingAdminDto before = existing.map(this::snapshot).orElse(null);
    SiteSetting row = existing.orElseGet(() -> SiteSetting.create(key.code(), text(value)));
    row.setSettingValue(text(value));
    try {
      settings.saveAndFlush(row);
    } catch (DataIntegrityViolationException e) {
      // Another admin created the same key at the same moment (the key is unique).
      throw new ApiException(HttpStatus.CONFLICT, CHANGED_MEANWHILE);
    }
    audit.record(
        AUDIT_TYPE,
        row.getId(),
        before == null ? AuditAction.CREATE : AuditAction.UPDATE,
        before,
        snapshot(row));
    events.publishEvent(ContentChangedEvent.home());
    return value;
  }

  /** The row as the audit log keeps it. */
  SiteSettingAdminDto snapshot(SiteSetting row) {
    return new SiteSettingAdminDto(
        row.getId(), row.getSettingKey(), json.readTree(row.getSettingValue()));
  }

  /** Turns a JSON object into the value of the key; any other body is refused with 400. */
  SiteSettingValue parseStrict(SiteSettingKey key, JsonNode body) {
    if (body == null || !body.isObject()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, BAD_BODY);
    }
    try {
      SiteSettingValue value = strictJson.treeToValue(body, key.type());
      if (value == null) {
        throw new ApiException(HttpStatus.BAD_REQUEST, BAD_BODY);
      }
      return value;
    } catch (JacksonException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, BAD_BODY);
    }
  }

  String text(SiteSettingValue value) {
    return json.writeValueAsString(value);
  }

  private SiteSettingValue read(SiteSettingKey key, SiteSetting row) {
    return lenientJson.readValue(row.getSettingValue(), key.type());
  }
}
