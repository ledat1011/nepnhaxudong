package vn.nepnhaxudong.site;

import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

/** The fixed keys of {@code site_setting}. Any other key does not exist. */
public enum SiteSettingKey {
  CONTACT("contact", ContactSettings.class, ContactSettings::empty),
  SOCIAL("social", SocialSettings.class, SocialSettings::empty),
  BRAND("brand", BrandSettings.class, BrandSettings::empty);

  static final String NOT_FOUND = "Không tìm thấy cài đặt.";

  private final String code;
  private final Class<? extends SiteSettingValue> type;
  private final Supplier<? extends SiteSettingValue> empty;

  SiteSettingKey(
      String code,
      Class<? extends SiteSettingValue> type,
      Supplier<? extends SiteSettingValue> empty) {
    this.code = code;
    this.type = type;
    this.empty = empty;
  }

  /** The value of the {@code key} column, which is also the last part of the admin URL. */
  public String code() {
    return code;
  }

  Class<? extends SiteSettingValue> type() {
    return type;
  }

  /** The value of a key that has no row yet: every field is empty. */
  SiteSettingValue empty() {
    return empty.get();
  }

  /** Finds the key by its exact code (no case change). */
  static Optional<SiteSettingKey> find(String code) {
    for (SiteSettingKey key : values()) {
      if (key.code.equals(code)) {
        return Optional.of(key);
      }
    }
    return Optional.empty();
  }

  /** Reads the key from a URL path segment; anything else answers 404. */
  public static SiteSettingKey fromPath(String path) {
    return find(path).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, NOT_FOUND));
  }
}
