package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.Service.Impl.ExamSubmissionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import com.example.ProctorX.modules.adaptive.application.AdaptiveEngineService;
import com.example.ProctorX.modules.adaptive.infrastructure.LearnerModelRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
    private com.example.ProctorX.Service.PasswordResetService passwordResetService;

    @Autowired
    private ExamSubmissionService submissionService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private SecurityContextRepository securityContextRepository;

    @Autowired(required = false)
    private LearnerModelRepository learnerModelRepo;

    @Autowired(required = false)
    private AdaptiveEngineService adaptiveEngineService;

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
        if (authEntity.getEmail() == null || authEntity.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        String email = authEntity.getEmail().trim();
        AuthEntity existing = authService.findByEmail(email);
        if (existing != null) {
            if (existing.getPassword() == null || existing.getPassword().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "message", "This email is already registered via Google Sign-In. Please sign in with Google or use 'Forgot Password' to set a password."
                ));
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of("message", "An account with email " + email + " is already registered. Please sign in or use password reset.")
            );
        }

        if (authEntity.getRole() == null) {
            authEntity.setRole(AuthEntity.Role.STUDENT);
        }
        authEntity.setProvider(AuthEntity.Provider.LOCAL);

        // Approval is required for both Student and Coordinator before taking/creating exams
        if (authEntity.getRole() == AuthEntity.Role.ADMIN) {
            authEntity.setApproved(true);
        } else {
            authEntity.setApproved(false);
        }

        // If basic profile details provided during registration
        if (authEntity.getInstitution() != null && !authEntity.getInstitution().trim().isEmpty()) {
            authEntity.setProfileCompleted(true);
        }

        authService.setUser(authEntity);

        return ResponseEntity.ok(Map.of(
                "message", authEntity.getRole() == AuthEntity.Role.STUDENT
                        ? "Student registration successful. Please log in to complete your profile."
                        : "Coordinator registration received. Access request is pending administrator approval.",
                "role", authEntity.getRole().name(),
                "approved", authEntity.getApproved()
        ));
    }

    @PostMapping("/Login")
    public ResponseEntity<?> login(@RequestBody AuthEntity request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {

        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        String email = request.getEmail().trim();
        AuthEntity existing = authService.findByEmail(email);

        // Explicit notice ONLY if account has no password set yet
        if (existing != null && (existing.getPassword() == null || existing.getPassword().trim().isEmpty())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "This account was registered using Google Sign-In and does not have a password set yet. Please sign in with Google or use 'Forgot Password' to create a password.",
                    "isGoogleAccount", true
            ));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.getPassword()
                    )
            );

            // Explicitly set in security context and save to HTTP session repository
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            AuthEntity user = authService.findByEmail(email);

            return ResponseEntity.ok(formatUserResponse(user));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Invalid email or password. Please verify your credentials or reset your password."
            ));
        }
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        try {
            Map<String, Object> result = passwordResetService.requestPasswordReset(email);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Unable to process password reset request. Please try again later."));
        }
    }

    @GetMapping("/auth/validate-reset-token")
    public ResponseEntity<?> validateResetToken(@RequestParam String token) {
        try {
            var resetToken = passwordResetService.validateToken(token);
            boolean isGoogle = resetToken.getUser().getPassword() == null ||
                               resetToken.getUser().getPassword().trim().isEmpty() ||
                               resetToken.getUser().getProvider() == AuthEntity.Provider.GOOGLE;

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "email", resetToken.getUser().getEmail(),
                    "name", resetToken.getUser().getName(),
                    "isGoogleAccount", isGoogle
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        try {
            passwordResetService.resetPassword(token, newPassword);
            return ResponseEntity.ok(Map.of(
                    "message", "Password has been reset successfully. You can now sign in with your new credentials."
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to reset password. Please request a new reset link."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }

        AuthEntity user = authService.getCurrentUser(authentication);

        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        return ResponseEntity.ok(formatUserResponse(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody AuthEntity profileData, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            AuthEntity currentUser = authService.getCurrentUser(authentication);
            AuthEntity updatedUser = authService.updateProfile(currentUser, profileData);
            return ResponseEntity.ok(formatUserResponse(updatedUser));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Profile update failed: " + ex.getMessage()));
        }
    }

    // Public portfolio endpoint (accessible without login)
    @GetMapping("/public/profile/{username}")
    public ResponseEntity<?> getPublicProfile(@PathVariable String username) {
        AuthEntity user = authService.findByUsername(username);
        if (user == null) {
            // Also try email prefix fallback
            user = authService.findByEmail(username);
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Profile for @" + username + " not found."));
        }

        Map<String, Object> publicData = new HashMap<>();
        publicData.put("name", user.getName());
        publicData.put("username", user.getUsername() != null ? user.getUsername() : user.getEmail().split("@")[0]);
        publicData.put("role", user.getRole().name());
        publicData.put("institution", user.getInstitution() != null ? user.getInstitution() : "Educational Institution");
        publicData.put("department", user.getDepartment());
        publicData.put("designation", user.getDesignation());
        publicData.put("bio", user.getBio());
        publicData.put("skills", user.getSkills());
        publicData.put("provider", user.getProvider().name());
        publicData.put("profileCompleted", user.getProfileCompleted());
        publicData.put("approved", user.getApproved());

        // Attach candidate summary statistics if student
        if (user.getRole() == AuthEntity.Role.STUDENT) {
            try {
                var results = submissionService.getMyResults(user.getEmail());
                int totalExams = results.size();
                int passedExams = (int) results.stream()
                        .filter(s -> s.getScore() != null && s.getExam() != null && s.getScore() >= (s.getExam().getTotalMarks() / 2))
                        .count();
                int totalScore = results.stream().mapToInt(s -> s.getScore() != null ? s.getScore() : 0).sum();
                int totalMarks = results.stream().mapToInt(s -> s.getExam() != null ? s.getExam().getTotalMarks() : 0).sum();
                int passRate = totalExams > 0 ? Math.round((float) passedExams / totalExams * 100) : 0;

                publicData.put("totalAssessments", totalExams);
                publicData.put("passedAssessments", passedExams);
                publicData.put("averageAccuracy", totalMarks > 0 ? Math.round((float) totalScore / totalMarks * 100) : 0);
                publicData.put("examsCompleted", totalExams);
                publicData.put("examsPassed", passedExams);
                publicData.put("passRate", passRate);
            } catch (Exception e) {
                publicData.put("totalAssessments", 0);
                publicData.put("passedAssessments", 0);
                publicData.put("averageAccuracy", 0);
                publicData.put("examsCompleted", 0);
                publicData.put("examsPassed", 0);
                publicData.put("passRate", 0);
            }
        }

        // Attach adaptive AI competency telemetry
        if (learnerModelRepo != null && adaptiveEngineService != null) {
            try {
                learnerModelRepo.findByUser(user).ifPresent(lm -> {
                    publicData.put("adaptiveTelemetry", adaptiveEngineService.getLearnerModelSummary(lm));
                });
            } catch (Exception e) {
                // Ignore telemetry errors
            }
        }

        return ResponseEntity.ok(publicData);
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
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuthEntity> getUsers() {
        return authService.getUsers();
    }

    @PutMapping("/admin/approve/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        authService.setApproval(id);
        return ResponseEntity.ok(Map.of("message", "User approved successfully", "userId", id));
    }

    private Map<String, Object> formatUserResponse(AuthEntity user) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        map.put("approved", user.getApproved());
        map.put("institution", user.getInstitution());
        map.put("department", user.getDepartment());
        map.put("designation", user.getDesignation());
        map.put("bio", user.getBio());
        map.put("skills", user.getSkills());
        map.put("username", user.getUsername() != null ? user.getUsername() : user.getEmail().split("@")[0]);
        map.put("profileCompleted", user.getProfileCompleted());
        map.put("provider", user.getProvider().name());
        return map;
    }
}
