package vn.nepnhaxudong.press;

import java.net.InetAddress;
import java.net.UnknownHostException;

/** Turns a host name into its addresses. A test can use an implementation with fixed answers. */
public interface HostResolver {

  InetAddress[] resolve(String host) throws UnknownHostException;
}
