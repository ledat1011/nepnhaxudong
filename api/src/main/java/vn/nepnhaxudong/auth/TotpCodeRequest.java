package vn.nepnhaxudong.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TotpCodeRequest(
    @NotBlank(message = "Mã xác thực không được để trống.")
        @Size(max = 16, message = "Mã xác thực không đúng.")
        String code) {}
