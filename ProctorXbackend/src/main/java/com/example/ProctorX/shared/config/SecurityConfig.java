package com.example.ProctorX.Config;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
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
                "http://localhost:5174",
                "http://localhost:5175",
                "https://*.vercel.app",
                "https://proctor-x-frontend.vercel.app"
        ));

        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        config.setAllowedHeaders(List.of(
                "*",
                "Authorization",
                "Content-Type",
                "X-XSRF-TOKEN",
                "X-Requested-With",
                "Accept"
        ));
        config.setAllowCredentials(true);

        config.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-EXAM-WARNING",
                "XSRF-TOKEN",
                "Set-Cookie"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
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
    // SECURITY CONTEXT REPOSITORY
    // ===============================
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
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
                    .password(user.getPassword() != null ? user.getPassword() : "")
                    .roles(
                            user.getRole() == null
                                    ? "STUDENT"
                                    : user.getRole().name()
                    )
                    .build();
        };
    }

    // ===============================
    // OAUTH2 AUTHORITIES MAPPER
    // Maps Google OAuth2 user to their DB role authority
    // ===============================
    @Bean
    public GrantedAuthoritiesMapper grantedAuthoritiesMapper() {
        return authorities -> {
            Set<org.springframework.security.core.GrantedAuthority> mappedAuthorities = new HashSet<>(authorities);
            for (org.springframework.security.core.GrantedAuthority authority : authorities) {
                if (authority instanceof OAuth2UserAuthority oauth2Auth) {
                    Map<String, Object> attributes = oauth2Auth.getAttributes();
                    String email = (String) attributes.get("email");
                    if (email != null) {
                        AuthEntity user = authRepository.findByEmail(email);
                        if (user != null && user.getRole() != null) {
                            mappedAuthorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                        } else {
                            mappedAuthorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));
                        }
                    }
                }
            }
            return mappedAuthorities;
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
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookiePath("/");

        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null);

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // REST Exception Handling: return 401 instead of HTML login redirects for APIs
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )

                // Single-Page Application CSRF Configuration
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(requestHandler)
                        .ignoringRequestMatchers(
                                "/api/Register",
                                "/api/Login",
                                "/api/auth/csrf",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/validate-reset-token",
                                "/api/auth/reset-password",
                                "/logout",
                                "/oauth2/**",
                                "/login/oauth2/**"
                        )
                )
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)

                // Session Management
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(sessionFixation -> sessionFixation.migrateSession())
                )

                .securityContext(securityContext ->
                        securityContext.securityContextRepository(securityContextRepository())
                )

                // Authorization Rules
                .authorizeHttpRequests(auth -> auth
                        // Preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public APIs and OAuth
                        .requestMatchers(
                                "/",
                                "/api/Register",
                                "/api/Login",
                                "/api/auth/csrf",
                                "/api/auth/forgot-password",
                                "/api/auth/validate-reset-token",
                                "/api/auth/reset-password",
                                "/api/public/**",
                                "/oauth2/**",
                                "/login/oauth2/**",
                                "/css/**",
                                "/js/**",
                                "/error"
                        ).permitAll()

                        // Explicit Logout Endpoint
                        .requestMatchers("/api/auth/logout", "/logout", "/api/logout").permitAll()

                        // Admin & Coordinator role-restricted endpoints
                        .requestMatchers("/api/admin/users", "/api/admin/users/**", "/api/admin/approve/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "COORDINATOR")

                        // Student role-restricted endpoints
                        .requestMatchers("/api/student/**").hasAnyRole("STUDENT", "ADMIN")

                        // Protected general API endpoints
                        .requestMatchers("/api/me", "/api/code-execution/**", "/api/**").authenticated()

                        .anyRequest().authenticated()
                )

                // GOOGLE OAUTH2 LOGIN
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo
                                .userAuthoritiesMapper(grantedAuthoritiesMapper())
                        )
                        .successHandler(oAuth2SuccessHandler)
                )

                // EXPLICIT LOGOUT CONFIGURATION
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .addLogoutHandler(new SecurityContextLogoutHandler())
                        .logoutSuccessHandler((request, response, authentication) -> {
                            HttpSession session = request.getSession(false);
                            if (session != null) {
                                session.invalidate();
                            }
                            SecurityContextHolder.clearContext();

                            ResponseCookie jsessionCookie = ResponseCookie.from("JSESSIONID", "")
                                    .path("/")
                                    .maxAge(0)
                                    .httpOnly(true)
                                    .sameSite("Lax")
                                    .build();

                            ResponseCookie xsrfCookie = ResponseCookie.from("XSRF-TOKEN", "")
                                    .path("/")
                                    .maxAge(0)
                                    .httpOnly(false)
                                    .sameSite("Lax")
                                    .build();

                            response.addHeader(HttpHeaders.SET_COOKIE, jsessionCookie.toString());
                            response.addHeader(HttpHeaders.SET_COOKIE, xsrfCookie.toString());

                            response.setStatus(HttpServletResponse.SC_OK);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Logged out successfully\"}");
                            response.getWriter().flush();
                        })
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                )

                // Disable default basic auth & form login
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(form -> form.disable());

        return http.build();
    }
}