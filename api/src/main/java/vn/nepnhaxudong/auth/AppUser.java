package vn.nepnhaxudong.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import vn.nepnhaxudong.common.TimestampedEntity;

@Entity
@Table(name = "app_user")
public class AppUser extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String email;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword;

  @Column(nullable = false)
  private boolean enabled = true;

  @Column(name = "failed_attempts", nullable = false)
  private int failedAttempts;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "totp_secret")
  private String totpSecret;

  @Column(name = "totp_enabled", nullable = false)
  private boolean totpEnabled;

  protected AppUser() {}

  public static AppUser create(
      String email, String displayName, String passwordHash, boolean mustChangePassword) {
    var user = new AppUser();
    user.email = normalizeEmail(email);
    user.displayName = displayName;
    user.passwordHash = passwordHash;
    user.mustChangePassword = mustChangePassword;
    return user;
  }

  /** The database requires lower-case emails, so every insert and lookup goes through this method. */
  public static String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public boolean isMustChangePassword() {
    return mustChangePassword;
  }

  public void setMustChangePassword(boolean mustChangePassword) {
    this.mustChangePassword = mustChangePassword;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public int getFailedAttempts() {
    return failedAttempts;
  }

  public void setFailedAttempts(int failedAttempts) {
    this.failedAttempts = failedAttempts;
  }

  public Instant getLockedUntil() {
    return lockedUntil;
  }

  public void setLockedUntil(Instant lockedUntil) {
    this.lockedUntil = lockedUntil;
  }

  public String getTotpSecret() {
    return totpSecret;
  }

  public void setTotpSecret(String totpSecret) {
    this.totpSecret = totpSecret;
  }

  public boolean isTotpEnabled() {
    return totpEnabled;
  }

  public void setTotpEnabled(boolean totpEnabled) {
    this.totpEnabled = totpEnabled;
  }
}
