package vn.nepnhaxudong.common;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Test-only endpoints that fail in different ways, to check how errors are answered. */
@RestController
@RequestMapping("/public/test-probe")
class FailureProbeController {

  static final String LEAK = "internal detail that must never reach the client";

  @GetMapping("/boom")
  String boom() {
    throw new IllegalStateException(LEAK);
  }

  @GetMapping("/denied")
  String denied() {
    throw new AccessDeniedException(LEAK);
  }

  @GetMapping("/status")
  String status() {
    throw new ResponseStatusException(HttpStatus.I_AM_A_TEAPOT, "short and stout");
  }

  @GetMapping("/needs-param")
  String needsParam(@RequestParam String name) {
    return name;
  }
}
