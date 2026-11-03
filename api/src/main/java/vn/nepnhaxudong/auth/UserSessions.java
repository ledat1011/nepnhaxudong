package vn.nepnhaxudong.auth;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * Ends the login sessions of one user. Sessions are found by principal name, which is the user id
 * (see {@link SessionPrincipal#getName()}).
 */
@Component
public class UserSessions {

  private final FindByIndexNameSessionRepository<? extends Session> sessions;

  public UserSessions(FindByIndexNameSessionRepository<? extends Session> sessions) {
    this.sessions = sessions;
  }

  /** Ends every session of the user. */
  public void endAll(long userId) {
    sessions.findByPrincipalName(Long.toString(userId)).keySet().forEach(sessions::deleteById);
  }

  /** Ends every session of the user except the one with the given session id. */
  public void endAllExcept(long userId, String keepSessionId) {
    sessions.findByPrincipalName(Long.toString(userId)).keySet().stream()
        .filter(id -> !id.equals(keepSessionId))
        .forEach(sessions::deleteById);
  }
}
