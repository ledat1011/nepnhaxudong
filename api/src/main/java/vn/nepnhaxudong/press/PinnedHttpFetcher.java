package vn.nepnhaxudong.press;

import jakarta.annotation.PreDestroy;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import org.springframework.stereotype.Component;

/**
 * Makes one HTTP GET to an address that the caller has already checked. It connects to that
 * address directly and never looks the host name up again, so a DNS answer that changes between the
 * check and the connection cannot lead to an internal address. For https it still sends the host
 * name for SNI and checks the certificate against it. It does not follow redirects, reads at most
 * 2 MB of the body, and uses a 5 second timeout to connect and for every read.
 *
 * <p>The total time is limited by a watchdog: one shared daemon thread closes the sockets of a call
 * when its deadline passes, so a blocked connect, TLS handshake or read ends at the deadline even
 * when a server sends one byte at a time. The body is read only for an HTML answer.
 */
@Component
public class PinnedHttpFetcher {

  static final int MAX_BODY_BYTES = 2 * 1024 * 1024;
  static final int TIMEOUT_MILLIS = 5_000;
  private static final int MAX_ADDRESSES_TRIED = 3;
  private static final int MAX_LINE_BYTES = 8 * 1024;
  private static final int MAX_HEADER_LINES = 100;
  private static final int BUFFER_BYTES = 8 * 1024;
  private static final String USER_AGENT = "Mozilla/5.0 (compatible; NepNhaLinkPreview/1.0)";

  private final ScheduledExecutorService watchdog = newWatchdog();

  private static ScheduledExecutorService newWatchdog() {
    var executor =
        new ScheduledThreadPoolExecutor(
            1,
            task -> {
              var thread = new Thread(task, "press-preview-watchdog");
              thread.setDaemon(true);
              return thread;
            });
    executor.setRemoveOnCancelPolicy(true);
    return Executors.unconfigurableScheduledExecutorService(executor);
  }

  @PreDestroy
  void stopWatchdog() {
    watchdog.shutdownNow();
  }

  /**
   * @param uri an http or https address with a host
   * @param addresses the checked addresses of the host, tried in order
   * @param deadlineNanos a {@link System#nanoTime()} value after which the call gives up
   */
  public FetchedPage fetch(URI uri, List<InetAddress> addresses, long deadlineNanos)
      throws IOException {
    var sockets = new CopyOnWriteArrayList<Socket>();
    ScheduledFuture<?> close =
        watchdog.schedule(
            () -> sockets.forEach(PinnedHttpFetcher::closeQuietly),
            Math.max(0, deadlineNanos - System.nanoTime()),
            TimeUnit.NANOSECONDS);
    try {
      return fetchOn(uri, addresses, deadlineNanos, sockets);
    } finally {
      close.cancel(false);
      sockets.forEach(PinnedHttpFetcher::closeQuietly);
    }
  }

  private FetchedPage fetchOn(
      URI uri, List<InetAddress> addresses, long deadlineNanos, List<Socket> sockets)
      throws IOException {
    boolean https = "https".equalsIgnoreCase(uri.getScheme());
    int port = uri.getPort() != -1 ? uri.getPort() : (https ? 443 : 80);
    Socket plain = connect(addresses, port, deadlineNanos, sockets);
    plain.setSoTimeout(TIMEOUT_MILLIS);
    Socket socket = https ? startTls(plain, WebAddress.resolvableHost(uri), port) : plain;
    OutputStream out = socket.getOutputStream();
    out.write(request(uri).getBytes(StandardCharsets.ISO_8859_1));
    out.flush();
    return readResponse(new BufferedInputStream(socket.getInputStream()), deadlineNanos);
  }

  private static Socket connect(
      List<InetAddress> addresses, int port, long deadlineNanos, List<Socket> sockets)
      throws IOException {
    IOException last = new IOException("No address to connect to");
    for (InetAddress address : addresses.stream().limit(MAX_ADDRESSES_TRIED).toList()) {
      checkDeadline(deadlineNanos);
      var socket = new Socket();
      sockets.add(socket);
      try {
        socket.connect(new InetSocketAddress(address, port), TIMEOUT_MILLIS);
        return socket;
      } catch (IOException e) {
        last = e;
        closeQuietly(socket);
      }
    }
    throw last;
  }

  private static Socket startTls(Socket plain, String host, int port) throws IOException {
    var factory = (SSLSocketFactory) SSLSocketFactory.getDefault();
    var tls = (SSLSocket) factory.createSocket(plain, host, port, true);
    SSLParameters parameters = tls.getSSLParameters();
    parameters.setEndpointIdentificationAlgorithm("HTTPS");
    tls.setSSLParameters(parameters);
    tls.startHandshake();
    return tls;
  }

  /**
   * The request line and headers. The path and query come from the ASCII form of the address, so
   * letters outside ASCII are sent percent-encoded (as UTF-8), never as "?".
   */
  private static String request(URI uri) {
    URI ascii = URI.create(uri.toASCIIString());
    String rawPath = ascii.getRawPath();
    String path = rawPath == null || rawPath.isEmpty() ? "/" : rawPath;
    String query = ascii.getRawQuery() == null ? "" : "?" + ascii.getRawQuery();
    String hostHeader =
        uri.getPort() == -1 ? uri.getHost() : uri.getHost() + ":" + uri.getPort();
    return "GET "
        + path
        + query
        + " HTTP/1.1\r\nHost: "
        + hostHeader
        + "\r\nUser-Agent: "
        + USER_AGENT
        + "\r\nAccept: text/html\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n";
  }

  private static FetchedPage readResponse(InputStream in, long deadlineNanos) throws IOException {
    String statusLine = readLine(in, deadlineNanos);
    String[] parts = statusLine.split(" ", 3);
    if (parts.length < 2 || !parts[0].startsWith("HTTP/")) {
      throw new IOException("Answer is not HTTP");
    }
    int status;
    try {
      status = Integer.parseInt(parts[1].trim());
    } catch (NumberFormatException e) {
      throw new IOException("Bad status line");
    }
    String location = null;
    String contentType = null;
    String transferEncoding = null;
    long contentLength = -1;
    for (int i = 0; ; i++) {
      String line = readLine(in, deadlineNanos);
      if (line.isEmpty()) {
        break;
      }
      if (i >= MAX_HEADER_LINES) {
        throw new IOException("Too many header lines");
      }
      int colon = line.indexOf(':');
      if (colon <= 0) {
        continue;
      }
      String name = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
      String value = line.substring(colon + 1).trim();
      switch (name) {
        case "location" -> location = location == null ? value : location;
        case "content-type" -> contentType = contentType == null ? value : contentType;
        case "transfer-encoding" -> transferEncoding = value.toLowerCase(Locale.ROOT);
        case "content-length" -> contentLength = parseLength(value);
        default -> {}
      }
    }
    boolean redirect = status >= 300 && status < 400;
    if (redirect || status < 200 || !isHtml(contentType)) {
      return new FetchedPage(status, location, contentType, new byte[0]);
    }
    byte[] body =
        transferEncoding != null && transferEncoding.contains("chunked")
            ? readChunked(in, deadlineNanos)
            : readPlain(in, contentLength, deadlineNanos);
    return new FetchedPage(status, location, contentType, body);
  }

  /** Only an HTML answer has its body read; the caller refuses any other content type. */
  private static boolean isHtml(String contentType) {
    return contentType != null
        && contentType.trim().toLowerCase(Locale.ROOT).startsWith("text/html");
  }

  private static long parseLength(String value) {
    try {
      return Long.parseLong(value);
    } catch (NumberFormatException e) {
      return -1;
    }
  }

  /** Reads up to the content length, or to the end of the connection when there is none. */
  private static byte[] readPlain(InputStream in, long contentLength, long deadlineNanos)
      throws IOException {
    long wanted = contentLength >= 0 ? Math.min(contentLength, MAX_BODY_BYTES) : MAX_BODY_BYTES;
    var body = new ByteArrayOutputStream();
    byte[] buffer = new byte[BUFFER_BYTES];
    while (body.size() < wanted) {
      checkDeadline(deadlineNanos);
      int read = in.read(buffer, 0, (int) Math.min(buffer.length, wanted - body.size()));
      if (read < 0) {
        break;
      }
      body.write(buffer, 0, read);
    }
    return body.toByteArray();
  }

  private static byte[] readChunked(InputStream in, long deadlineNanos) throws IOException {
    var body = new ByteArrayOutputStream();
    byte[] buffer = new byte[BUFFER_BYTES];
    while (body.size() < MAX_BODY_BYTES) {
      checkDeadline(deadlineNanos);
      int size = chunkSize(readLine(in, deadlineNanos));
      if (size == 0) {
        break;
      }
      int remaining = Math.min(size, MAX_BODY_BYTES - body.size());
      int left = remaining;
      while (left > 0) {
        checkDeadline(deadlineNanos);
        int read = in.read(buffer, 0, Math.min(buffer.length, left));
        if (read < 0) {
          return body.toByteArray();
        }
        body.write(buffer, 0, read);
        left -= read;
      }
      if (remaining < size) {
        break;
      }
      readLine(in, deadlineNanos);
    }
    return body.toByteArray();
  }

  private static int chunkSize(String sizeLine) throws IOException {
    int semicolon = sizeLine.indexOf(';');
    String hex = (semicolon >= 0 ? sizeLine.substring(0, semicolon) : sizeLine).trim();
    try {
      int size = Integer.parseInt(hex, 16);
      if (size < 0) {
        throw new IOException("Bad chunk size");
      }
      return size;
    } catch (NumberFormatException e) {
      throw new IOException("Bad chunk size");
    }
  }

  /** Reads one line (up to the line feed) as ISO-8859-1, without the line ending. */
  private static String readLine(InputStream in, long deadlineNanos) throws IOException {
    var line = new ByteArrayOutputStream();
    while (true) {
      checkDeadline(deadlineNanos);
      int next = in.read();
      if (next < 0) {
        throw new IOException("The connection ended inside the headers");
      }
      if (next == '\n') {
        break;
      }
      if (next != '\r') {
        line.write(next);
      }
      if (line.size() > MAX_LINE_BYTES) {
        throw new IOException("Header line too long");
      }
    }
    return line.toString(StandardCharsets.ISO_8859_1);
  }

  private static void checkDeadline(long deadlineNanos) throws IOException {
    if (System.nanoTime() - deadlineNanos > 0) {
      throw new IOException("The answer took too long");
    }
  }

  private static void closeQuietly(Socket socket) {
    try {
      socket.close();
    } catch (IOException e) {
      // Closing is best effort: the call is over or failing anyway.
    }
  }
}
