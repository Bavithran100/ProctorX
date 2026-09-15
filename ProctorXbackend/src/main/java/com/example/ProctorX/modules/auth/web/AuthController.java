package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "https://*.vercel.app",
                "https://proctor-x-frontend.vercel.app"
        },
        allowCredentials = "true"
)
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private SecurityContextRepository securityContextRepository;

    @GetMapping("/auth/csrf")
    public ResponseEntity<?> getCsrfToken(CsrfToken csrfToken) {
        if (csrfToken == null) {
            return ResponseEntity.ok(Map.of("message", "CSRF token not active"));
        }
        return ResponseEntity.ok(
                Map.of(
                        "token", csrfToken.getToken(),
                        "headerName", csrfToken.getHeaderName(),
                        "parameterName", csrfToken.getParameterName()
                )
        );
    }

    @PostMapping("/Register")
    public ResponseEntity<?> register(@RequestBody AuthEntity authEntity) {
        authEntity.setRole(AuthEntity.Role.COORDINATOR);
        authEntity.setProvider(AuthEntity.Provider.LOCAL);
        authEntity.setApproved(false);

        authService.setUser(authEntity);

        return ResponseEntity.ok("Coordinator registration request sent");
    }

    @PostMapping("/Login")
    public ResponseEntity<?> login(@RequestBody AuthEntity request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Explicitly set in security context and save to HTTP session repository
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        AuthEntity user = authService.findByEmail(request.getEmail());

        return ResponseEntity.ok(
                Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "approved", user.getApproved()
                )
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }

        String email;

        // GOOGLE LOGIN
        if (authentication.getPrincipal() instanceof OAuth2User oauthUser) {
            email = oauthUser.getAttribute("email");
        }
        // NORMAL LOGIN
        else {
            email = authentication.getName();
        }

        AuthEntity user = authService.findByEmail(email);

        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        return ResponseEntity.ok(
                Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "approved", user.getApproved()
                )
        );
    }

    @PostMapping({"/auth/logout", "/logout"})
    public ResponseEntity<?> logout(HttpServletRequest request,
                                    HttpServletResponse response,
                                    Authentication authentication) {
        SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();
        logoutHandler.logout(request, response, authentication);

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

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/admin/users")
    public List<AuthEntity> getUsers() {
        return authService.getUsers();
    }

    @PutMapping("/admin/approve/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        authService.setApproval(id);
        return ResponseEntity.ok("User approved");
    }
}
