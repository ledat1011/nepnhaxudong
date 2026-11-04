package vn.nepnhaxudong.site;

import vn.nepnhaxudong.common.LocalizedText;

/** The setting {@code brand}: the short line under the name of the family. */
public record BrandSettings(LocalizedText tagline) implements SiteSettingValue {

  public BrandSettings {
    tagline = SettingRules.clean(tagline);
  }

  static BrandSettings empty() {
    return new BrandSettings(null);
  }

  @Override
  public void validate() {
    SettingRules.text("Khẩu hiệu", tagline);
  }
}
