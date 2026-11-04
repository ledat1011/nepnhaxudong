package vn.nepnhaxudong.timeline;

import java.util.List;

/** The body of PUT /admin/timeline/order: every existing event id, once, in the wanted order. */
public record TimelineOrderRequest(List<Long> ids) {}
