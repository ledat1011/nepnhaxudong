package vn.nepnhaxudong.audit;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes the audit log. It runs inside the transaction of the caller (it never starts one), so a
 * change and its audit line are saved together or not at all.
 */
@Service
public class JpaAuditService implements AuditService {

  private static final Logger LOG = LoggerFactory.getLogger(JpaAuditService.class);

  private final AuditLogRepository lines;
  private final JsonMapper json;
  private final Clock clock;

  public JpaAuditService(AuditLogRepository lines, JsonMapper json, Clock clock) {
    this.lines = lines;
    this.json = json;
    this.clock = clock;
  }

  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void record(
      String entityType, long entityId, AuditAction action, Object before, Object after) {
    lines.save(
        AuditLog.create(
            currentUserId(),
            entityType,
            entityId,
            action,
            toJson(before),
            toJson(after),
            clock.instant()));
  }

  private String toJson(Object snapshot) {
    return snapshot == null ? null : json.writeValueAsString(snapshot);
  }

  /**
   * The principal name of a login is the user id (see SessionPrincipal). It is null when nobody is
   * logged in, for example in a system call.
   */
  private static Long currentUserId() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || authentication instanceof AnonymousAuthenticationToken
        || !authentication.isAuthenticated()) {
      return null;
    }
    try {
      return Long.valueOf(authentication.getName());
    } catch (NumberFormatException e) {
      // The name itself is not logged: it could be an email address.
      LOG.warn("The principal name of the login is not a user id; the audit line has no user");
      return null;
    }
  }
}
