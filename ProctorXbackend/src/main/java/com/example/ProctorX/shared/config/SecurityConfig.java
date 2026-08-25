package com.example.ProctorX.Config;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private OAuth2SuccessHandler oAuth2SuccessHandler;

    // ===============================
    // CORS CONFIG
    // ===============================
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "https://*.vercel.app",
                "https://proctor-x-frontend.vercel.app"
        ));

        config.setAllowedMethods(List.of(
                "GET","POST","PUT","DELETE","OPTIONS"
        ));

        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        config.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-EXAM-WARNING"
        ));

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    // ===============================
    // PASSWORD ENCODER
    // ===============================
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ===============================
    // USER DETAILS SERVICE
    // ===============================
    @Bean
    public UserDetailsService userDetailsService() {

        return username -> {

            AuthEntity user = authRepository.findByEmail(username);

            if (user == null) {
                throw new UsernameNotFoundException(
                        "User not found with email: " + username
                );
            }

            return org.springframework.security.core.userdetails.User
                    .builder()
                    .username(user.getEmail())
                    .password(user.getPassword())
                    .roles(
                            user.getRole() == null
                                    ? "STUDENT"
                                    : user.getRole().name()
                    )
                    .build();
        };
    }

    // ===============================
    // AUTHENTICATION MANAGER
    // ===============================
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }

    // ===============================
    // SECURITY FILTER CHAIN
    // ===============================
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http

                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.IF_REQUIRED
                        )
                )

                .securityContext(securityContext ->
                        securityContext.requireExplicitSave(false)
                )

                .authorizeHttpRequests(auth -> auth

                        // PUBLIC APIs
                        .requestMatchers(
                                "/",
                                "/api/Register",
                                "/api/Login",

                                // OAuth endpoints
                                "/oauth2/**",
                                "/login/oauth2/**",

                                "/css/**",
                                "/js/**"
                        ).permitAll()

                        // Preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // Protected API
                        .requestMatchers("/api/**").authenticated()

                        .anyRequest().permitAll()
                )

                // GOOGLE LOGIN
                .oauth2Login(oauth -> oauth
                        .successHandler(oAuth2SuccessHandler)
                )

                // LOGOUT
                .logout(logout -> logout
                        .logoutSuccessUrl("http://localhost:5173/")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                )

                // Disable default login pages
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(form -> form.disable());

        return http.build();
    }
}