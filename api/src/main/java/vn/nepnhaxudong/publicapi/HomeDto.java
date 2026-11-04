package vn.nepnhaxudong.publicapi;

import java.util.List;

/** The whole content of the home page in one language. */
public record HomeDto(
    String lang,
    BrandDto brand,
    List<ProductPublicDto> products,
    List<TimelinePublicDto> timeline,
    List<PressPublicDto> press,
    List<StorySummaryDto> stories,
    ContactPublicDto contact,
    SocialPublicDto social) {}
