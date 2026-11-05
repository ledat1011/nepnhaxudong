package vn.nepnhaxudong.auth;

/** The machine-readable {@code code} values of the refusals the admin web must tell apart. */
public final class ProblemCodes {

  public static final String TOTP_REQUIRED = "totp-required";
  public static final String TOTP_INVALID = "totp-invalid";
  public static final String INVALID_CREDENTIALS = "invalid-credentials";
  public static final String ACCOUNT_LOCKED = "account-locked";
  public static final String SESSION_EXPIRED = "session-expired";
  public static final String MUST_CHANGE_PASSWORD = "must-change-password";
  public static final String CSRF_INVALID = "csrf-invalid";
  /** The two-factor login was switched off by an owner; the user must set it up again first. */
  public static final String MUST_SETUP_TOTP = "must-setup-totp";
  /** Only an owner ("Chủ") may manage accounts. */
  public static final String OWNER_REQUIRED = "owner-required";

  private ProblemCodes() {}
}
