package vn.nepnhaxudong.site;

/** The setting {@code social}: the addresses of the family's pages. Every field is optional. */
public record SocialSettings(String facebook, String youtube, String tiktok)
    implements SiteSettingValue {

  public SocialSettings {
    facebook = SettingRules.clean(facebook);
    youtube = SettingRules.clean(youtube);
    tiktok = SettingRules.clean(tiktok);
  }

  static SocialSettings empty() {
    return new SocialSettings(null, null, null);
  }

  @Override
  public void validate() {
    SettingRules.webAddress("Đường dẫn Facebook", facebook);
    SettingRules.webAddress("Đường dẫn YouTube", youtube);
    SettingRules.webAddress("Đường dẫn TikTok", tiktok);
  }
}
