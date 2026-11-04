package vn.nepnhaxudong.auth;

/** What the password and the two-factor code of one login attempt showed, before it is recorded. */
enum CredentialCheck {
  /** The password is wrong. */
  WRONG_PASSWORD,
  /** The password is right, the user has two-factor login and sent no code. Not a failed attempt. */
  CODE_MISSING,
  /** The password is right and the two-factor code is wrong. */
  WRONG_CODE,
  /** The password and, when needed, the code are right. */
  PASSED
}
