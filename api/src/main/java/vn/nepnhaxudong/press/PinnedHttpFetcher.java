package vn.nepnhaxudong.press;

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
 */
@Component
public class PinnedHttpFetcher {

  static final int MAX_BODY_BYTES = 2 * 1024 * 1024;
  static final int TIMEOUT_MILLIS = 5_000;
  private static final int MAX_ADDRESSES_TRIED = 3;
  private static final int MAX_LINE_BYTES = 8 * 1024;
  private static final int MAX_HEADER_LINES = 100;
  private static final String USER_AGENT = "Mozilla/5.0 (compatible; NepNhaLinkPreview/1.0)";

  /**
   * @param uri an http or https address with a host
   * @param addresses the checked addresses of the host, tried in order
   * @param deadlineNanos a {@link System#nanoTime()} value after which the call gives up
   */
  public FetchedPage fetch(URI uri, List<InetAddress> addresses, long deadlineNanos)
      throws IOException {
    boolean https = "https".equalsIgnoreCase(uri.getScheme());
    int port = uri.getPort() != -1 ? uri.getPort() : (https ? 443 : 80);
    String host = uri.getHost();
    try (Socket plain = connect(addresses, port)) {
      plain.setSoTimeout(TIMEOUT_MILLIS);
      Socket socket = https ? startTls(plain, unbracket(host), port) : plain;
      OutputStream out = socket.getOutputStream();
      out.write(request(uri, host).getBytes(StandardCharsets.ISO_8859_1));
      out.flush();
      return readResponse(new BufferedInputStream(socket.getInputStream()), deadlineNanos);
    }
  }

  private static Socket connect(List<InetAddress> addresses, int port) throws IOException {
    IOException last = new IOException("No address to connect to");
    for (InetAddress address : addresses.stream().limit(MAX_ADDRESSES_TRIED).toList()) {
      var socket = new Socket();
      try {
        socket.connect(new InetSocketAddress(address, port), TIMEOUT_MILLIS);
        return socket;
      } catch (IOException e) {
        last = e;
        socket.close();
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

  private static String request(URI uri, String host) {
    String path = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
    String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
    String hostHeader = uri.getPort() == -1 ? host : host + ":" + uri.getPort();
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
    if (redirect || status < 200) {
      return new FetchedPage(status, location, contentType, new byte[0]);
    }
    byte[] body =
        transferEncoding != null && transferEncoding.contains("chunked")
            ? readChunked(in, deadlineNanos)
            : readPlain(in, contentLength, deadlineNanos);
    return new FetchedPage(status, location, contentType, body);
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
    byte[] buffer = new byte[8192];
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
    while (body.size() < MAX_BODY_BYTES) {
      checkDeadline(deadlineNanos);
      String sizeLine = readLine(in, deadlineNanos);
      int semicolon = sizeLine.indexOf(';');
      String hex = (semicolon >= 0 ? sizeLine.substring(0, semicolon) : sizeLine).trim();
      int size;
      try {
        size = Integer.parseInt(hex, 16);
      } catch (NumberFormatException e) {
        throw new IOException("Bad chunk size");
      }
      if (size < 0) {
        throw new IOException("Bad chunk size");
      }
      if (size == 0) {
        break;
      }
      int remaining = Math.min(size, MAX_BODY_BYTES - body.size());
      byte[] chunk = in.readNBytes(remaining);
      body.write(chunk, 0, chunk.length);
      if (chunk.length < remaining || remaining < size) {
        break;
      }
      readLine(in, deadlineNanos);
    }
    return body.toByteArray();
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

  private static String unbracket(String host) {
    return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
  }
}
