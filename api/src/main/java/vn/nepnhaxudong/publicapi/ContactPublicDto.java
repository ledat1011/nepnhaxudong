package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.site.ContactSettings;

/** The contact details, with the texts already chosen by language. A missing value is null. */
public record ContactPublicDto(
    String phone, String zalo, String messenger, String address, String mapUrl, String hours) {

  static ContactPublicDto from(ContactSettings contact, Lang lang) {
    return new ContactPublicDto(
        contact.phone(),
        contact.zalo(),
        contact.messenger(),
        contact.address().resolve(lang),
        contact.mapUrl(),
        contact.hours().resolve(lang));
  }
}
