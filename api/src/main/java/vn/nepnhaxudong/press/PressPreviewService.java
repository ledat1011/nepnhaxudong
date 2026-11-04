package vn.nepnhaxudong.press;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import jakarta.annotation.PreDestroy;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Reads the title, date and site name of a newspaper article from its meta tags, so the admin does
 * not have to type them. The address comes from the admin, so the server must not be tricked into
 * calling its own network (SSRF):
 *
 * <ul>
 *   <li>only http and https; the host is resolved here and every address must pass
 *       {@link AddressPolicy}; the connection goes to a checked address
 *       ({@link PinnedHttpFetcher});
 *   <li>redirects are not followed by the client; at most 3 are followed here, and each target is
 *       checked again like the first address;
 *   <li>5 second timeout, at most 2 MB, and only an HTML answer with status 200 to 299.
 * </ul>
 *
 * Any failure gives an empty preview and one WARN line with the host only (never the query).
 */
@Service
public class PressPreviewService {

  static final int MAX_REDIRECTS = 3;
  private static final Set<Integer> REDIRECT_STATUSES = Set.of(301, 302, 303, 307, 308);
  private static final int MAX_TITLE_LENGTH = 500;
  private static final int MAX_SOURCE_LENGTH = 200;
  private static final int DATE_LENGTH = "2024-05-01".length();
  private static final Pattern CHARSET =
      Pattern.compile("charset=\"?([^;\"\\s]+)", Pattern.CASE_INSENSITIVE);
  private static final Logger LOG = LoggerFactory.getLogger(PressPreviewService.class);

  private final AddressPolicy policy;
  private final HostResolver resolver;
  private final PinnedHttpFetcher fetcher;
  private final Duration totalTime;
  private final ExecutorService lookups = newLookupExecutor();

  public PressPreviewService(
      AddressPolicy policy,
      HostResolver resolver,
      PinnedHttpFetcher fetcher,
      @Value("${press.preview.total-time:15s}") Duration totalTime) {
    this.policy = policy;
    this.resolver = resolver;
    this.fetcher = fetcher;
    this.totalTime = totalTime;
  }

  /**
   * Name lookups run on their own daemon threads, because the system resolver cannot be
   * interrupted; the caller waits only for the time that is left and then gives up.
   */
  private static ExecutorService newLookupExecutor() {
    return Executors.newCachedThreadPool(
        task -> {
          var thread = new Thread(task, "press-preview-lookup");
          thread.setDaemon(true);
          return thread;
        });
  }

  @PreDestroy
  void stopLookups() {
    lookups.shutdownNow();
  }

  public PressPreviewDto preview(String url) {
    URI uri = WebAddress.parse(url).orElse(null);
    if (uri == null) {
      LOG.warn("Press preview refused: the address is not a usable http or https address");
      return PressPreviewDto.EMPTY;
    }
    String host = uri.getHost();
    try {
      return read(uri);
    } catch (PreviewFailedException e) {
      LOG.warn("Press preview failed for host {}: {}", host, e.getMessage());
    } catch (IOException | RuntimeException e) {
      LOG.warn("Press preview failed for host {}: {}", host, e.toString());
    }
    return PressPreviewDto.EMPTY;
  }

  private PressPreviewDto read(URI start) throws IOException, PreviewFailedException {
    long deadline = System.nanoTime() + totalTime.toNanos();
    URI uri = start;
    for (int redirects = 0; ; redirects++) {
      List<InetAddress> addresses = checkedAddresses(uri, deadline);
      FetchedPage page = fetcher.fetch(uri, addresses, deadline);
      if (REDIRECT_STATUSES.contains(page.status())) {
        if (redirects == MAX_REDIRECTS) {
          throw new PreviewFailedException("Too many redirects");
        }
        uri = redirectTarget(uri, page.location());
        continue;
      }
      if (page.status() < 200 || page.status() > 299) {
        throw new PreviewFailedException("The server answered with status " + page.status());
      }
      return parse(page, uri);
    }
  }

  /**
   * Resolves the host within the time that is left; every address must be allowed, otherwise the
   * host is refused.
   */
  private List<InetAddress> checkedAddresses(URI uri, long deadline)
      throws PreviewFailedException {
    String name = WebAddress.resolvableHost(uri);
    InetAddress[] addresses = lookup(name, deadline);
    if (addresses.length == 0) {
      throw new PreviewFailedException("The host name has no address");
    }
    for (InetAddress address : addresses) {
      if (!policy.allows(address)) {
        throw new PreviewFailedException("The host is not on the public internet");
      }
    }
    return Arrays.asList(addresses);
  }

  private InetAddress[] lookup(String name, long deadline) throws PreviewFailedException {
    Future<InetAddress[]> answer = lookups.submit(() -> resolver.resolve(name));
    try {
      return answer.get(Math.max(0, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
    } catch (TimeoutException e) {
      answer.cancel(true);
      throw new PreviewFailedException("The host name lookup took too long");
    } catch (ExecutionException e) {
      throw new PreviewFailedException("The host name cannot be resolved");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new PreviewFailedException("The preview was interrupted");
    }
  }

  private static URI redirectTarget(URI current, String location) throws PreviewFailedException {
    if (location == null || location.isBlank()) {
      throw new PreviewFailedException("A redirect without a target");
    }
    try {
      URI target = current.resolve(new URI(location.trim()));
      return WebAddress.parse(target.toString())
          .orElseThrow(() -> new PreviewFailedException("A redirect to an unusable address"));
    } catch (URISyntaxException e) {
      throw new PreviewFailedException("A redirect to an unreadable address");
    }
  }

  private static PressPreviewDto parse(FetchedPage page, URI uri)
      throws IOException, PreviewFailedException {
    String contentType = page.contentType() == null ? "" : page.contentType().trim();
    if (!contentType.toLowerCase(Locale.ROOT).startsWith("text/html")) {
      throw new PreviewFailedException("The answer is not text/html");
    }
    Document document =
        Jsoup.parse(new ByteArrayInputStream(page.body()), charset(contentType), uri.toString());
    String title = firstNonBlank(meta(document, "og:title"), document.title());
    return new PressPreviewDto(
        limit(title, MAX_TITLE_LENGTH),
        publishedDate(meta(document, "article:published_time")),
        limit(meta(document, "og:site_name"), MAX_SOURCE_LENGTH));
  }

  private static String charset(String contentType) {
    Matcher matcher = CHARSET.matcher(contentType);
    if (!matcher.find()) {
      return null;
    }
    try {
      return Charset.isSupported(matcher.group(1)) ? matcher.group(1) : null;
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private static String meta(Document document, String name) {
    Element tag =
        document.selectFirst(
            "meta[property=\"" + name + "\"], meta[name=\"" + name + "\"]");
    return tag == null ? null : tag.attr("content");
  }

  private static LocalDate publishedDate(String text) {
    if (text == null || text.trim().length() < DATE_LENGTH) {
      return null;
    }
    try {
      return LocalDate.parse(text.trim().substring(0, DATE_LENGTH));
    } catch (DateTimeParseException e) {
      return null;
    }
  }

  private static String firstNonBlank(String first, String second) {
    return first != null && !first.isBlank() ? first : second;
  }

  /** Trims, folds white space, and returns null for an empty text. */
  private static String limit(String text, int maxLength) {
    if (text == null) {
      return null;
    }
    String clean = text.replaceAll("\\s+", " ").trim();
    if (clean.isEmpty()) {
      return null;
    }
    return clean.length() <= maxLength ? clean : clean.substring(0, maxLength);
  }
}
