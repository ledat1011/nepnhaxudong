package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "Mật khẩu tạm thời không được để trống.")
        @Size(min = PasswordRules.MIN_LENGTH, message = "Mật khẩu tạm thời phải có ít nhất 12 ký tự.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu tạm thời quá dài.")
        String temporaryPassword) {}
