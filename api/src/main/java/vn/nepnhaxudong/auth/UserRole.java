package vn.nepnhaxudong.auth;

/**
 * What a family account may do. The names are stored in {@code app_user.role} and sent as they are
 * in JSON. The admin web shows them as "Chủ" and "Người nhà".
 */
public enum UserRole {
  /** "Chủ": edits content and manages the accounts (create, lock, reset, change role, switch off 2FA). */
  OWNER,
  /** "Người nhà": edits content; cannot manage accounts. */
  MEMBER
}
