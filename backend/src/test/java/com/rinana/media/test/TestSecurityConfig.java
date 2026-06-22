package com.rinana.media.test;

import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.web.servlet.setup.ConfigurableMockMvcBuilder;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@Configuration
public class TestSecurityConfig {
  @Bean
  MockMvcBuilderCustomizer csrfDefaultRequestCustomizer() {
    return (ConfigurableMockMvcBuilder<?> builder) -> builder.defaultRequest(post("/").with(csrf()));
  }
}
