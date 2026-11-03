package vn.nepnhaxudong.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Temporary chain: only the health endpoint is open and every other request needs authentication.
 * It is replaced by the full security configuration of the admin area.
 */
@Configuration(proxyBeanMethods = false)
public class TemporarySecurityConfig {

  @Bean
  SecurityFilterChain temporaryFilterChain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(
            auth -> auth.requestMatchers("/actuator/health").permitAll().anyRequest().authenticated())
        .build();
  }
}
