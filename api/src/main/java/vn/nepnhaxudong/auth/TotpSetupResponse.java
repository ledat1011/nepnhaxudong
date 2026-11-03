package vn.nepnhaxudong.auth;

/** The new TOTP secret and the otpauth URI that an authenticator app reads (shown once, as a QR code). */
public record TotpSetupResponse(String secret, String otpauthUri) {}
