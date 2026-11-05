package vn.nepnhaxudong.auth;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.audit.AuditAction;
import vn.nepnhaxudong.audit.AuditService;
import vn.nepnhaxudong.common.ApiException;

/**
 * Family account management. Only an owner ("Chủ") may use it; {@link AdminAccessFilter} refuses a
 * member before the request gets here, and every change checks the actor again inside its
 * transaction. At least one enabled owner always remains.
 *
 * <p>Every change locks all account rows first ({@link AppUserRepository#findAllForUpdate}), so two
 * owners who act at the same time run one after the other: the second one sees the first one's
 * result (for example that they were demoted or locked) and is refused when needed.
 *
 * <p>Every change is written to the audit log as {@code app_user} with a {@link UserSummary} (never
 * the password hash or the TOTP secret). No change event is published: accounts are not on the
 * website.
 */
@Service
public class UserAdminService {

  static final String LAST_OWNER = "Cần ít nhất một Chủ đang hoạt động.";

  private final AppUserRepository users;
  private final PasswordEncoder encoder;
  private final UserSessions userSessions;
  private final AuditService audit;

  public UserAdminService(
      AppUserRepository users,
      PasswordEncoder encoder,
      UserSessions userSessions,
      AuditService audit) {
    this.users = users;
    this.encoder = encoder;
    this.userSessions = userSessions;
    this.audit = audit;
  }

  /** The accounts, for an enabled owner only (read without the row locks: nothing changes here). */
  @Transactional(readOnly = true)
  public List<UserSummary> list(long actorId) {
    AppUser actor = users.findById(actorId).filter(AppUser::isEnabled).orElse(null);
    requireOwner(actor);
    return users.findAll(Sort.by("id")).stream().map(UserSummary::of).toList();
  }

  /** Creates a member ("Người nhà"). An owner can make them an owner afterwards. */
  @Transactional
  public UserSummary create(long actorId, CreateUserRequest request) {
    lockForOwner(actorId);
    String email = AppUser.normalizeEmail(request.email());
    if (users.findByEmail(email).isPresent()) {
      throw emailInUse();
    }
    var user =
        AppUser.create(email, request.displayName().trim(), encoder.encode(request.temporaryPassword()), true);
    UserSummary created;
    try {
      created = UserSummary.of(users.saveAndFlush(user));
    } catch (DataIntegrityViolationException e) {
      // Another request created the same email between the check and the insert.
      throw emailInUse();
    }
    audit.record(AppUserAuditedHandler.ENTITY_TYPE, created.id(), AuditAction.CREATE, null, created);
    return created;
  }

  /**
   * Disables a user and ends all their sessions. Nobody can disable their own account, and the last
   * enabled owner cannot be disabled.
   */
  @Transactional
  public void disable(long actorId, long targetId) {
    if (actorId == targetId) {
      throw new ApiException(HttpStatus.CONFLICT, "Bạn không thể khóa tài khoản của chính mình.");
    }
    var accounts = lockForOwner(actorId);
    AppUser target = target(accounts, targetId);
    requireAnotherActiveOwner(accounts, target);
    var before = UserSummary.of(target);
    target.setEnabled(false);
    recordUpdate(before, target);
    userSessions.endAll(targetId);
  }

  @Transactional
  public void enable(long actorId, long targetId) {
    AppUser user = target(lockForOwner(actorId), targetId);
    var before = UserSummary.of(user);
    user.setEnabled(true);
    recordUpdate(before, user);
  }

  /**
   * Makes the target an owner or a member. The last enabled owner cannot become a member. A demoted
   * user's sessions end; when owners demote themselves, the session with id {@code
   * currentSessionId} stays (they keep working as a member). The same role again changes nothing.
   */
  @Transactional
  public void changeRole(long actorId, long targetId, UserRole role, String currentSessionId) {
    var accounts = lockForOwner(actorId);
    AppUser target = target(accounts, targetId);
    if (target.getRole() == role) {
      return;
    }
    if (role == UserRole.MEMBER) {
      requireAnotherActiveOwner(accounts, target);
    }
    var before = UserSummary.of(target);
    target.setRole(role);
    recordUpdate(before, target);
    if (role == UserRole.MEMBER) {
      if (targetId == actorId) {
        userSessions.endAllExcept(targetId, currentSessionId);
      } else {
        userSessions.endAll(targetId);
      }
    }
  }

  /**
   * Sets a temporary password: the user must change it at the next login, the lock is cleared,
   * two-factor login is switched off and every session of the user ends. As with {@link
   * #disableTotp}, a user who had two-factor login must set it up again (after the password change).
   */
  @Transactional
  public void resetPassword(long actorId, long targetId, String temporaryPassword) {
    AppUser user = target(lockForOwner(actorId), targetId);
    var before = UserSummary.of(user);
    user.setPasswordHash(encoder.encode(temporaryPassword));
    user.setMustChangePassword(true);
    user.setFailedAttempts(0);
    user.setLockedUntil(null);
    switchOffTotp(user);
    recordUpdate(before, user);
    userSessions.endAll(targetId);
  }

  /**
   * Switches off the two-factor login of another user (who lost the phone, for example). The secret
   * is removed, the user must set up two-factor login again after the next sign-in, and every
   * session of the user ends (a lost phone may still hold one). Owners switch off their own with a
   * code, in {@link TotpService#disable}.
   */
  @Transactional
  public void disableTotp(long actorId, long targetId) {
    var accounts = lockForOwner(actorId);
    if (actorId == targetId) {
      throw new ApiException(HttpStatus.CONFLICT, "Hãy tắt xác thực 2 lớp của chính bạn bằng mã 6 số.");
    }
    AppUser user = target(accounts, targetId);
    if (!user.isTotpEnabled()) {
      throw new ApiException(HttpStatus.CONFLICT, "Xác thực 2 lớp chưa được bật.");
    }
    var before = UserSummary.of(user);
    switchOffTotp(user);
    recordUpdate(before, user);
    userSessions.endAll(targetId);
  }

  /** Removes the secret; a user who had two-factor login on must set it up again. */
  private static void switchOffTotp(AppUser user) {
    if (user.isTotpEnabled()) {
      user.setMustSetupTotp(true);
    }
    user.setTotpEnabled(false);
    user.setTotpSecret(null);
  }

  /**
   * Locks every account row and returns them by id, after checking that the actor is an enabled
   * owner. The filter has checked this already; this check is the one that counts, because it reads
   * the rows under the lock.
   */
  private Map<Long, AppUser> lockForOwner(long actorId) {
    Map<Long, AppUser> accounts =
        users.findAllForUpdate().stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
    requireOwner(accounts.get(actorId));
    return accounts;
  }

  private static void requireOwner(AppUser actor) {
    if (actor == null || !actor.isEnabled()) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản của bạn đã bị khóa.");
    }
    if (!actor.isOwner()) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, AdminAccessFilter.OWNER_ONLY, ProblemCodes.OWNER_REQUIRED);
    }
  }

  private static AppUser target(Map<Long, AppUser> accounts, long targetId) {
    AppUser target = accounts.get(targetId);
    if (target == null) {
      throw notFound();
    }
    return target;
  }

  /** Refuses a change that would take away the last enabled owner. */
  private static void requireAnotherActiveOwner(Map<Long, AppUser> accounts, AppUser target) {
    if (!target.isOwner() || !target.isEnabled()) {
      return;
    }
    boolean another =
        accounts.values().stream()
            .anyMatch(u -> u != target && u.isOwner() && u.isEnabled());
    if (!another) {
      throw new ApiException(HttpStatus.CONFLICT, LAST_OWNER);
    }
  }

  /** Writes the audit line of a change of an existing account. */
  private void recordUpdate(UserSummary before, AppUser after) {
    audit.record(
        AppUserAuditedHandler.ENTITY_TYPE,
        after.getId(),
        AuditAction.UPDATE,
        before,
        UserSummary.of(after));
  }

  private static ApiException notFound() {
    return new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
  }

  private static ApiException emailInUse() {
    return new ApiException(HttpStatus.CONFLICT, "Email đã được dùng.");
  }
}
