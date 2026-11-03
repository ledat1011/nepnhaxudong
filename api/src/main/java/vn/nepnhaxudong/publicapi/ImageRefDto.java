package vn.nepnhaxudong.publicapi;

/** A picture for the web page. {@code url} is the public address {@code /media/<path>}. */
public record ImageRefDto(String url, int width, int height, String alt) {}
