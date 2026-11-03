package vn.nepnhaxudong.publicapi;

import vn.nepnhaxudong.site.SocialSettings;

/** The addresses of the family pages. A missing value is null. */
public record SocialPublicDto(String facebook, String youtube, String tiktok) {

  static SocialPublicDto from(SocialSettings social) {
    return new SocialPublicDto(social.facebook(), social.youtube(), social.tiktok());
  }
}
