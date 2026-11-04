package vn.nepnhaxudong.publish;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Tells the website (Next.js) to drop cached pages: {@code POST {base-url}/api/revalidate} with
 * the secret in the header {@code x-revalidate-secret} and the body {@code {"tags":[...]}}.
 *
 * <p>The website is our own container, so the address is trusted and the call is a plain HTTP
 * call (not the SSRF-safe fetcher of the press preview). A failure never reaches the caller: the
 * content is already saved, so the call is repeated up to {@value #MAX_RETRIES} times with waits
 * that double (1 s, 2 s, 4 s by default) and then given up with a warning. A 400 answer means our
 * tags are wrong, and 401 or 403 means the secret is wrong; repeating cannot help, so these are
 * not repeated.
 *
 * <p>The call blocks until it ends; it must run on a worker thread, not on a request thread.
 */
@Component
public class RevalidateClient {

  static final int MAX_RETRIES = 3;
  /** The website refuses a request with more tags than this. */
  static final int MAX_TAGS_PER_REQUEST = 50;

  private static final Logger LOG = LoggerFactory.getLogger(RevalidateClient.class);

  private final RestClient rest;
  private final String secret;
  private final Duration firstRetryWait;
  private final boolean enabled;

  public RevalidateClient(
      @Value("${app.web.base-url:}") String baseUrl,
      @Value("${app.web.revalidate-secret:}") String secret,
      @Value("${app.web.retry-wait:1s}") Duration firstRetryWait,
      @Value("${app.web.timeout:5s}") Duration timeout) {
    String base = withoutTrailingSlashes(baseUrl.strip());
    this.secret = secret.strip();
    this.firstRetryWait = firstRetryWait;
    if (base.isEmpty()) {
      LOG.info("app.web.base-url is empty: the website is not told about content changes");
    } else if (this.secret.isEmpty()) {
      LOG.warn(
          "app.web.base-url is set but app.web.revalidate-secret is empty: the website is not told"
              + " about content changes");
    }
    this.enabled = !base.isEmpty() && !this.secret.isEmpty();
    this.rest = enabled ? buildRestClient(base, timeout) : null;
  }

  private static RestClient buildRestClient(String base, Duration timeout) {
    // HTTP/1.1 on purpose: by default the JDK client asks a plain http:// server to upgrade to
    // HTTP/2 (Upgrade: h2c). The website is a Node server that needs no such negotiation.
    var httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(timeout)
            .build();
    var requestFactory = new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(timeout);
    return RestClient.builder().baseUrl(base).requestFactory(requestFactory).build();
  }

  /** False when the base URL or the secret is missing; every call is then skipped. */
  public boolean isEnabled() {
    return enabled;
  }

  /** Sends the tags, sorted, in requests of at most 50 tags. Never throws because of the website. */
  public void revalidate(Set<String> tags) {
    if (!enabled || tags.isEmpty()) {
      return;
    }
    List<String> sorted = tags.stream().sorted().toList();
    for (int from = 0; from < sorted.size(); from += MAX_TAGS_PER_REQUEST) {
      send(sorted.subList(from, Math.min(from + MAX_TAGS_PER_REQUEST, sorted.size())));
    }
  }

  private void send(List<String> tags) {
    Duration wait = firstRetryWait;
    for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        post(tags);
        return;
      } catch (HttpClientErrorException.BadRequest e) {
        // Our tags are wrong; repeating cannot help. This stops this batch only: later batches of
        // the same event are still sent.
        LOG.warn("revalidate refused by the website with 400, not retried: tags={}", tags);
        return;
      } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
        // A wrong or missing secret is a configuration error; repeating cannot help.
        LOG.warn(
            "revalidate refused ({}): check REVALIDATE_SECRET: tags={}",
            e.getStatusCode().value(),
            tags);
        return;
      } catch (RuntimeException e) {
        LOG.warn(
            "revalidate attempt {} of {} failed: tags={} error={}",
            attempt + 1,
            MAX_RETRIES + 1,
            tags,
            e.getMessage());
      }
      if (attempt < MAX_RETRIES) {
        if (!pause(wait)) {
          return;
        }
        wait = wait.multipliedBy(2);
      }
    }
    LOG.warn("revalidate failed after {} retries: tags={}", MAX_RETRIES, tags);
  }

  private void post(List<String> tags) {
    rest.post()
        .uri("/api/revalidate")
        .header("x-revalidate-secret", secret)
        .body(Map.of("tags", tags))
        .retrieve()
        .toBodilessEntity();
  }

  /** Waits; false when the thread was interrupted (the application is stopping). */
  private static boolean pause(Duration wait) {
    try {
      Thread.sleep(wait);
      return true;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }
  }

  private static String withoutTrailingSlashes(String url) {
    int end = url.length();
    while (end > 0 && url.charAt(end - 1) == '/') {
      end--;
    }
    return url.substring(0, end);
  }
}
