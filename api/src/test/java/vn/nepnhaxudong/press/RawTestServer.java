package vn.nepnhaxudong.press;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.function.ThrowingConsumer;

/**
 * A server on the loopback address that runs a script on every connection, for cases a JDK
 * HttpServer cannot play: a drip-fed chunk, a client hello that is never answered. It does not read
 * the request. Threads are daemon threads, so a script that sleeps does not block the test run.
 */
final class RawTestServer implements AutoCloseable {

  private final ServerSocket server;
  private final List<Socket> clients = new CopyOnWriteArrayList<>();

  RawTestServer(ThrowingConsumer<OutputStream> script) throws IOException {
    server = new ServerSocket(0, 5, InetAddress.getLoopbackAddress());
    var acceptor =
        new Thread(
            () -> {
              while (!server.isClosed()) {
                try {
                  Socket client = server.accept();
                  clients.add(client);
                  var worker =
                      new Thread(
                          () -> {
                            try {
                              script.accept(client.getOutputStream());
                            } catch (Throwable e) {
                              // The client went away: the script ends.
                            }
                          });
                  worker.setDaemon(true);
                  worker.start();
                } catch (IOException e) {
                  return;
                }
              }
            });
    acceptor.setDaemon(true);
    acceptor.start();
  }

  int port() {
    return server.getLocalPort();
  }

  @Override
  public void close() throws IOException {
    server.close();
    for (Socket client : clients) {
      client.close();
    }
  }
}
