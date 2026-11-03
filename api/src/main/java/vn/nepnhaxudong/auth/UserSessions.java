package vn.nepnhaxudong.auth;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * Ends the login sessions of one user. Sessions are found by principal name, which is the user id
 * (see {@link SessionPrincipal#getName()}).
 *
 * <p>Spring Session JDBC runs its statements in its own transaction, so they commit at once, not
 * with the caller's transaction. To keep a rolled-back password change or disable from logging the
 * user out, the sessions end only after the caller's transaction has committed. Without a
 * transaction they end immediately.
 */
@Component
public class UserSessions {

  private final FindByIndexNameSessionRepository<? extends Session> sessions;

  public UserSessions(FindByIndexNameSessionRepository<? extends Session> sessions) {
    this.sessions = sessions;
  }

  /** Ends every session of the user. */
  public void endAll(long userId) {
    AfterCommitAction.run(() -> deleteSessionsOf(userId, null));
  }

  /** Ends every session of the user except the one with the given session id. */
  public void endAllExcept(long userId, String keepSessionId) {
    AfterCommitAction.run(() -> deleteSessionsOf(userId, keepSessionId));
  }

  private void deleteSessionsOf(long userId, String keepSessionId) {
    sessions.findByPrincipalName(Long.toString(userId)).keySet().stream()
        .filter(id -> !id.equals(keepSessionId))
        .forEach(sessions::deleteById);
  }
}
