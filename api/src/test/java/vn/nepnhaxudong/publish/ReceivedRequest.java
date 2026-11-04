package vn.nepnhaxudong.publish;

import java.util.List;

/**
 * One request that the fake website received. {@code tags} is empty when the body had none.
 * {@code protocol} is the HTTP version of the request line; {@code upgrade} is the value of the
 * Upgrade header, or null.
 */
record ReceivedRequest(
    String method,
    String path,
    String protocol,
    String upgrade,
    String secret,
    String body,
    List<String> tags) {}
