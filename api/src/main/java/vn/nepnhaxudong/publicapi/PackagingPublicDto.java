package vn.nepnhaxudong.publicapi;

/** One pack size. {@code priceVnd} is null when the product hides its prices or has no price. */
public record PackagingPublicDto(int weightGrams, Long priceVnd) {}
