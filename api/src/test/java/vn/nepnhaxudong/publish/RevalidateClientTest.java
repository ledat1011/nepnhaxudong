package vn.nepnhaxudong.publish;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The HTTP call itself: the request, the retries, the timeouts and the start-up checks. */
class RevalidateClientTest {

  private static final String SECRET = "unit-test-secret-value";
  private static final Duration SHORT_WAIT = Duration.ofMillis(5);
  private static final Duration TIMEOUT = Duration.ofSeconds(5);

  private FakeWebServer web;
  private LogCapture log;

  @BeforeEach
  void startFakeWebsite() {
    web = FakeWebServer.start();
    log = new LogCapture(RevalidateClient.class);
  }

  @AfterEach
  void stopFakeWebsite() {
    log.close();
    web.close();
  }

  private RevalidateClient client() {
    return new RevalidateClient(web.baseUrl(), SECRET, SHORT_WAIT, TIMEOUT);
  }

  // ---- the request ---------------------------------------------------------------------------

  @Test
  void postsTheTagsAsJsonWithTheSecretHeader() {
    client().revalidate(Set.of("home"));

    ReceivedRequest request = web.next();
    assertThat(request.method()).isEqualTo("POST");
    assertThat(request.path()).isEqualTo("/api/revalidate");
    assertThat(request.secret()).isEqualTo(SECRET);
    assertThat(request.body()).isEqualTo("{\"tags\":[\"home\"]}");
    assertThat(web.takeAll()).isEmpty();
  }

  @Test
  void sendsTheTagsSorted() {
    client().revalidate(new LinkedHashSet<>(List.of("story:b", "home", "stories", "story:a")));

    assertThat(web.next().tags()).containsExactly("home", "stories", "story:a", "story:b");
  }

  @Test
  void aTrailingSlashOfTheBaseUrlIsRemoved() {
    new RevalidateClient(web.baseUrl() + "/", SECRET, SHORT_WAIT, TIMEOUT)
        .revalidate(Set.of("home"));

    assertThat(web.next().path()).isEqualTo("/api/revalidate");
  }

  @Test
  void anEmptySetOfTagsSendsNothing() {
    client().revalidate(Set.of());

    assertThat(web.staysQuietFor(Duration.ofMillis(100))).isTrue();
  }

  @Test
  void moreThan50TagsAreSentInBatchesOfAtMost50() {
    Set<String> tags = new TreeSet<>();
    IntStream.range(0, 120).forEach(i -> tags.add("story:s%03d".formatted(i)));

    client().revalidate(tags);

    List<ReceivedRequest> requests = List.of(web.next(), web.next(), web.next());
    assertThat(requests).extracting(request -> request.tags().size()).containsExactly(50, 50, 20);
    var all = new ArrayList<String>();
    requests.forEach(request -> all.addAll(request.tags()));
    assertThat(all).containsExactlyElementsOf(tags);
    assertThat(web.takeAll()).isEmpty();
  }

  // ---- retries -------------------------------------------------------------------------------

  @Test
  void aServerThatFailsTwiceAndThenAnswersOkIsCalledThreeTimes() {
    web.respondWith(500, 500, 200);

    client().revalidate(Set.of("home"));

    assertThat(List.of(web.next(), web.next(), web.next())).hasSize(3);
    assertThat(web.takeAll()).isEmpty();
    assertThat(log.messages(Level.WARN)).hasSize(2);
    assertThat(log.messages(Level.WARN)).allSatisfy(message -> assertThat(message).contains("[home]"));
  }

  @Test
  void aServerThatAlwaysFailsIsCalledFourTimesThenTheFailureIsLogged() {
    web.alwaysRespondWith(500);

    client().revalidate(Set.of("home", "stories"));

    assertThat(List.of(web.next(), web.next(), web.next(), web.next())).hasSize(4);
    assertThat(web.takeAll()).isEmpty();
    List<String> warnings = log.messages(Level.WARN);
    // One line per failed try (4) and the final line.
    assertThat(warnings).hasSize(5);
    assertThat(warnings.subList(0, 4))
        .allSatisfy(
            message -> assertThat(message).contains("[home, stories]").contains("500"));
    assertThat(warnings.get(4)).startsWith("revalidate failed after 3 retries");
  }

  @Test
  void aBadRequestIsNotRetried() {
    web.alwaysRespondWith(400);

    client().revalidate(Set.of("home"));

    assertThat(web.next().tags()).containsExactly("home");
    assertThat(web.takeAll()).isEmpty();
    assertThat(web.staysQuietFor(Duration.ofMillis(200))).isTrue();
    List<String> warnings = log.messages(Level.WARN);
    assertThat(warnings).hasSize(1);
    assertThat(warnings.get(0)).contains("400").contains("[home]");
  }

  @Test
  void usesPlainHttp11WithoutAnUpgradeHeader() {
    client().revalidate(Set.of("home"));

    ReceivedRequest request = web.next();
    assertThat(request.protocol()).isEqualTo("HTTP/1.1");
    assertThat(request.upgrade()).isNull();
  }

  @Test
  void aRefusedSecretIsNotRetriedAndIsLoggedOnceWithoutTheSecret() {
    for (int status : new int[] {401, 403}) {
      web.reset();
      web.alwaysRespondWith(status);

      client().revalidate(Set.of("home"));

      assertThat(web.next().tags()).containsExactly("home");
      assertThat(web.staysQuietFor(Duration.ofMillis(100))).isTrue();
    }
    List<String> warnings = log.messages(Level.WARN);
    assertThat(warnings).hasSize(2);
    assertThat(warnings.get(0)).contains("401").contains("REVALIDATE_SECRET");
    assertThat(warnings.get(1)).contains("403").contains("REVALIDATE_SECRET");
    assertThat(log.everything()).doesNotContain(SECRET);
  }

  @Test
  void aTimeoutIsRetriedLikeAnyOtherFailure() {
    web.alwaysRespondWith(FakeWebServer.HANG);
    var client = new RevalidateClient(web.baseUrl(), SECRET, SHORT_WAIT, Duration.ofMillis(100));

    client.revalidate(Set.of("home"));

    assertThat(List.of(web.next(), web.next(), web.next(), web.next())).hasSize(4);
    assertThat(log.messages(Level.WARN).get(4)).startsWith("revalidate failed after 3 retries");
  }

  @Test
  void aConnectionErrorIsRetriedAndNeverThrown() {
    String deadUrl = web.baseUrl();
    web.close();

    new RevalidateClient(deadUrl, SECRET, SHORT_WAIT, TIMEOUT).revalidate(Set.of("home"));

    List<String> warnings = log.messages(Level.WARN);
    assertThat(warnings).hasSize(5);
    assertThat(warnings.get(4)).startsWith("revalidate failed after 3 retries");
  }

  @Test
  void theSecretIsNeverLogged() {
    web.alwaysRespondWith(500);

    client().revalidate(Set.of("home"));

    assertThat(log.everything()).doesNotContain(SECRET);
  }

  // ---- start-up checks -----------------------------------------------------------------------

  @Test
  void aBlankBaseUrlLogsOneInfoAtStartAndSkipsEveryCall() {
    var client = new RevalidateClient("  ", SECRET, SHORT_WAIT, TIMEOUT);

    client.revalidate(Set.of("home"));
    client.revalidate(Set.of("home"));

    assertThat(client.isEnabled()).isFalse();
    assertThat(log.messages(Level.INFO)).hasSize(1);
    assertThat(log.messages(Level.WARN)).isEmpty();
    assertThat(web.staysQuietFor(Duration.ofMillis(100))).isTrue();
  }

  @Test
  void aBaseUrlWithoutASecretLogsOneWarningAtStartAndSkipsEveryCall() {
    var client = new RevalidateClient(web.baseUrl(), "", SHORT_WAIT, TIMEOUT);

    client.revalidate(Set.of("home"));
    client.revalidate(Set.of("home"));

    assertThat(client.isEnabled()).isFalse();
    assertThat(log.messages(Level.WARN)).hasSize(1);
    assertThat(web.staysQuietFor(Duration.ofMillis(100))).isTrue();
  }

  @Test
  void aBaseUrlWithASecretIsEnabledAndLogsNothingAtStart() {
    assertThat(client().isEnabled()).isTrue();
    assertThat(log.messages(Level.INFO)).isEmpty();
    assertThat(log.messages(Level.WARN)).isEmpty();
  }
}
