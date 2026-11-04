package vn.nepnhaxudong.site;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import vn.nepnhaxudong.audit.JsonAuditedHandler;
import vn.nepnhaxudong.common.ApiException;

/**
 * Reads and restores site settings for the audit log. A row that was deleted is inserted again with
 * its old id; the key is unique, so a row that took the key meanwhile answers 409.
 */
@Component
class SiteSettingAuditedHandler extends JsonAuditedHandler<SiteSettingAdminDto> {

  private final SiteSettingRepository settings;
  private final SiteSettingService service;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  SiteSettingAuditedHandler(
      SiteSettingRepository settings,
      SiteSettingService service,
      JdbcTemplate jdbc,
      Clock clock,
      JsonMapper json) {
    super(SiteSettingService.AUDIT_TYPE, SiteSettingAdminDto.class, json);
    this.settings = settings;
    this.service = service;
    this.jdbc = jdbc;
    this.clock = clock;
  }

  @Override
  protected Optional<SiteSettingAdminDto> find(long entityId) {
    return settings.findById(entityId).map(service::snapshot);
  }

  @Override
  protected void restore(long entityId, SiteSettingAdminDto snapshot) {
    if (snapshot.id() != entityId) {
      throw badSnapshot();
    }
    SiteSettingKey key = SiteSettingKey.find(snapshot.key()).orElseThrow(() -> badSnapshot());
    SiteSettingValue value;
    try {
      value = service.parseStrict(key, snapshot.value());
      value.validate();
    } catch (ApiException e) {
      throw badSnapshot();
    }
    SiteSetting row =
        settings.findById(entityId).orElseGet(() -> insertWithId(entityId, key));
    if (!row.getSettingKey().equals(key.code())) {
      throw badSnapshot();
    }
    row.setSettingValue(service.text(value));
  }

  private SiteSetting insertWithId(long id, SiteSettingKey key) {
    Timestamp now = Timestamp.from(clock.instant());
    jdbc.update(
        "insert into site_setting (id, key, value, created_at, updated_at)"
            + " values (?, ?, '{}'::jsonb, ?, ?)",
        id,
        key.code(),
        now,
        now);
    return settings.findById(id).orElseThrow();
  }
}
