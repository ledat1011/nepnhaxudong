package vn.nepnhaxudong.auth;

import java.io.Serializable;
import java.security.Principal;

/**
 * What the session stores about the logged-in user. It must be {@link Serializable} because Spring
 * Session JDBC writes the security context to the database. It holds only the id and the email;
 * everything that can change (must-change-password, enabled) is read from the database per request.
 * The principal name is the user id: it is stored in a 100-character column of the session table,
 * which an email address (up to 320 characters) could overflow.
 */
public record SessionPrincipal(long userId, String email) implements Principal, Serializable {

  @Override
  public String getName() {
    return Long.toString(userId);
  }
}
