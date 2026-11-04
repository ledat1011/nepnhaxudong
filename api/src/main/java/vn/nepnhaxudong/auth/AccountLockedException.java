package vn.nepnhaxudong.auth;

import org.springframework.http.HttpStatus;
import vn.nepnhaxudong.common.ApiException;

public class AccountLockedException extends ApiException {

  public AccountLockedException() {
    super(HttpStatus.LOCKED, "Tài khoản tạm khóa 15 phút vì đăng nhập sai nhiều lần.");
  }
}
