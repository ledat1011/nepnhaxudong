package vn.nepnhaxudong.site;

import vn.nepnhaxudong.common.LocalizedText;

/** The setting {@code contact}: how a customer reaches the family. Every field is optional. */
public record ContactSettings(
    String phone,
    String zalo,
    String messenger,
    LocalizedText address,
    String mapUrl,
    LocalizedText hours)
    implements SiteSettingValue {

  public ContactSettings {
    phone = SettingRules.clean(phone);
    zalo = SettingRules.clean(zalo);
    messenger = SettingRules.clean(messenger);
    address = SettingRules.clean(address);
    mapUrl = SettingRules.clean(mapUrl);
    hours = SettingRules.clean(hours);
  }

  static ContactSettings empty() {
    return new ContactSettings(null, null, null, null, null, null);
  }

  @Override
  public void validate() {
    SettingRules.phone("Số điện thoại", phone);
    SettingRules.phone("Số Zalo", zalo);
    SettingRules.webAddress("Đường dẫn Messenger", messenger);
    SettingRules.webAddress("Đường dẫn bản đồ", mapUrl);
    SettingRules.text("Địa chỉ", address);
    SettingRules.text("Giờ làm việc", hours);
  }
}
