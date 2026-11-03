package vn.nepnhaxudong.publish;

import java.util.List;

/** One request that the fake website received. {@code tags} is empty when the body had none. */
record ReceivedRequest(String method, String path, String secret, String body, List<String> tags) {}
