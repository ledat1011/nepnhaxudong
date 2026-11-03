package vn.nepnhaxudong.press;

import java.net.InetAddress;
import java.net.UnknownHostException;

/** Turns a host name into its addresses. It is an interface so that a test can use fixed answers. */
public interface HostResolver {

  InetAddress[] resolve(String host) throws UnknownHostException;
}
