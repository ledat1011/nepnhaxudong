package vn.nepnhaxudong.auth;

import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * Security of the API: a login session kept by Spring Session (JDBC), CSRF protection with a cookie,
 * and problem+json answers. There is no form login and no HTTP Basic; {@link AuthController} logs in.
 * Paths are relative to the context path {@code /api}.
 */
@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
  }

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain filterChain(
      HttpSecurity http,
      SecurityContextRepository securityContextRepository,
      LoginService loginService,
      ProblemSecurityHandlers problemHandlers)
      throws Exception {
    // The XSRF-TOKEN cookie is readable by the browser script (HttpOnly false) and is sent back in
    // the X-XSRF-TOKEN header. The plain request handler compares the header with the cookie value.
    var csrfTokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfTokens.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));

    return http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .securityContext(c -> c.securityContextRepository(securityContextRepository))
        // An API must not remember the request of an anonymous user (that would create a session).
        .requestCache(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .csrf(
            csrf ->
                csrf.csrfTokenRepository(csrfTokens)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                    .ignoringRequestMatchers(
                        PathPatternRequestMatcher.withDefaults()
                            .matcher(HttpMethod.POST, "/auth/login")))
        .exceptionHandling(
            e -> e.authenticationEntryPoint(problemHandlers).accessDeniedHandler(problemHandlers))
        .authorizeHttpRequests(
            auth ->
                auth.dispatcherTypeMatchers(DispatcherType.ERROR)
                    .permitAll()
                    .requestMatchers("/actuator/health", "/public/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/auth/login")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/auth/csrf")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .addFilterAfter(new MustChangePasswordFilter(loginService), AuthorizationFilter.class)
        .build();
  }
}
