package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
    @NotBlank(message = "Mật khẩu hiện tại không được để trống.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu hiện tại quá dài.")
        String currentPassword,
    @NotBlank(message = "Mật khẩu mới không được để trống.")
        @Size(min = PasswordRules.MIN_LENGTH, message = "Mật khẩu mới phải có ít nhất 12 ký tự.")
        @Size(max = PasswordRules.MAX_LENGTH, message = "Mật khẩu mới quá dài.")
        String newPassword) {}
