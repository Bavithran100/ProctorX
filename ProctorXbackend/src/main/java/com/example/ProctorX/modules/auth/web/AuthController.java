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
import com.example.ProctorX.modules.adaptive.domain.LearnerModelEntity;
import com.example.ProctorX.modules.adaptive.infrastructure.LearnerModelRepository;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.Entity.OrganizationEntity;
import com.example.ProctorX.Repository.OrganizationRepository;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

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

    @Autowired
    private com.example.ProctorX.Service.UsernameBloomFilterService bloomFilterService;

    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam(required = false) String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "available", false,
                    "message", "Username cannot be empty."
            ));
        }
        String clean = username.trim();
        if (clean.length() < 3 || clean.length() > 30) {
            return ResponseEntity.badRequest().body(Map.of(
                    "available", false,
                    "message", "Username must be between 3 and 30 characters."
            ));
        }
        if (!clean.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "available", false,
                    "message", "Username may only contain letters, numbers, and underscores."
            ));
        }

        boolean available = bloomFilterService.isUsernameAvailable(clean);
        return ResponseEntity.ok(Map.of(
                "username", clean,
                "available", available,
                "message", available
                        ? "Username '" + clean + "' is available!"
                        : "The username '" + clean + "' is already taken. Please choose another username."
        ));
    }

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

        // Multi-tenant organization setup and quota verification
        if (authEntity.getRole() == AuthEntity.Role.ADMIN || authEntity.getRole() == AuthEntity.Role.SUPER_ADMIN) {
            authEntity.setApproved(true);
            authEntity.setCollegeAdminApproved(true);
            authEntity.setCoordinatorApproved(true);
        } else if (authEntity.getRole() == AuthEntity.Role.COLLEGE_ADMIN) {
            String orgName = authEntity.getOrganizationName();
            if (orgName == null || orgName.trim().isEmpty()) {
                orgName = authEntity.getInstitution();
            }
            if (orgName == null || orgName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", 400,
                        "error", "ORGANIZATION_REQUIRED",
                        "message", "Organization / College Name is required to register as College Administrator.",
                        "field", "institution"
                ));
            }
            orgName = orgName.trim();
            if (organizationRepository.existsByNameIgnoreCase(orgName)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "status", 409,
                        "error", "ORGANIZATION_EXISTS",
                        "message", "An institution named '" + orgName + "' is already registered. Please sign in or contact your institutional dean.",
                        "field", "institution"
                ));
            }

            // Generate clean unique orgCode
            String cleanSlug = orgName.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (cleanSlug.length() > 8) cleanSlug = cleanSlug.substring(0, 8);
            if (cleanSlug.isEmpty()) cleanSlug = "CAMPUS";
            String orgCode;
            int attempts = 0;
            do {
                int rnd = 1000 + new Random().nextInt(9000);
                orgCode = "ORG-" + cleanSlug + "-" + rnd;
                attempts++;
            } while (organizationRepository.existsByOrgCode(orgCode) && attempts < 20);

            authEntity.setOrganizationName(orgName);
            authEntity.setInstitution(orgName);
            authEntity.setOrgCode(orgCode);
            authEntity.setSubscriptionPlan("STARTER");
            authEntity.setPaymentStatus("PENDING_PAYMENT");
            authEntity.setMaxCoordinatorsQuota(3);
            authEntity.setMaxStudentsQuota(150);
            authEntity.setCollegeAdminApproved(true);
            authEntity.setApproved(false); // Locked until Plan chosen and mock payment complete
        } else {
            // Coordinator or Student
            authEntity.setApproved(false);
            authEntity.setCollegeAdminApproved(false);
            authEntity.setCoordinatorApproved(false);

            String orgIdentifier = authEntity.getOrgCode();
            if (orgIdentifier == null || orgIdentifier.trim().isEmpty()) {
                orgIdentifier = authEntity.getOrganizationName();
            }
            if (orgIdentifier == null || orgIdentifier.trim().isEmpty()) {
                orgIdentifier = authEntity.getInstitution();
            }

            if (orgIdentifier != null && !orgIdentifier.trim().isEmpty()) {
                String clean = orgIdentifier.trim();
                OrganizationEntity org = organizationRepository.findByOrgCode(clean)
                        .orElseGet(() -> organizationRepository.findByNameIgnoreCase(clean).orElse(null));

                if (org != null) {
                    if (Boolean.TRUE.equals(org.getIsLocked())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                "status", 403,
                                "error", "ORGANIZATION_LOCKED",
                                "message", "Registration is suspended because '" + org.getName() + "' is locked by the platform administrator.",
                                "field", "institution"
                        ));
                    }
                    if (!"ACTIVE".equalsIgnoreCase(org.getPaymentStatus())) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                                "status", 400,
                                "error", "ORGANIZATION_INACTIVE",
                                "message", "Campus not ready: '" + org.getName() + "' has not completed plan activation yet.",
                                "field", "institution"
                        ));
                    }

                    // Enforce institutional quotas
                    if (authEntity.getRole() == AuthEntity.Role.COORDINATOR) {
                        long currentCoords = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.COORDINATOR);
                        if (currentCoords >= org.getMaxCoordinatorsQuota()) {
                            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                                    "status", 409,
                                    "error", "COORDINATOR_QUOTA_EXCEEDED",
                                    "message", "Registration limit reached: '" + org.getName() + "' has reached its coordinator quota (" + org.getMaxCoordinatorsQuota() + "). Please contact your College Administrator.",
                                    "field", "institution"
                            ));
                        }
                    } else if (authEntity.getRole() == AuthEntity.Role.STUDENT) {
                        long currentStudents = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.STUDENT);
                        if (currentStudents >= org.getMaxStudentsQuota()) {
                            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                                    "status", 409,
                                    "error", "STUDENT_QUOTA_EXCEEDED",
                                    "message", "Registration limit reached: '" + org.getName() + "' has reached its student quota (" + org.getMaxStudentsQuota() + "). Please contact your College Administrator.",
                                    "field", "institution"
                            ));
                        }
                    }

                    authEntity.setOrganizationId(org.getId());
                    authEntity.setOrgCode(org.getOrgCode());
                    authEntity.setOrganizationName(org.getName());
                    authEntity.setInstitution(org.getName());
                    authEntity.setCollegeAdminId(org.getCollegeAdminId());
                } else {
                    authEntity.setOrganizationName(clean);
                    authEntity.setInstitution(clean);
                }
            }
        }

        // If basic profile details provided during registration
        if (authEntity.getInstitution() != null && !authEntity.getInstitution().trim().isEmpty()) {
            authEntity.setProfileCompleted(true);
        }

        // Bloom Filter Username Uniqueness Validation (reject taken usernames explicitly)
        if (authEntity.getUsername() != null && !authEntity.getUsername().trim().isEmpty()) {
            String u = authEntity.getUsername().trim();
            if (u.length() < 3 || u.length() > 30 || !u.matches("^[a-zA-Z0-9_]+$")) {
                return ResponseEntity.badRequest().body(Map.of(
                        "status", 400,
                        "error", "INVALID_USERNAME",
                        "message", "Username must be 3-30 characters and contain only letters, numbers, and underscores.",
                        "field", "username"
                ));
            }
            if (!bloomFilterService.isUsernameAvailable(u)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "status", 409,
                        "error", "USERNAME_TAKEN",
                        "message", "The username '" + u + "' is already taken. Please choose another username.",
                        "field", "username"
                ));
            }
        }

        try {
            authService.setUser(authEntity);

            if (authEntity.getRole() == AuthEntity.Role.COLLEGE_ADMIN) {
                OrganizationEntity org = OrganizationEntity.builder()
                        .name(authEntity.getOrganizationName())
                        .orgCode(authEntity.getOrgCode())
                        .collegeAdminId(authEntity.getId())
                        .collegeAdminEmail(authEntity.getEmail())
                        .collegeAdminName(authEntity.getName())
                        .subscriptionPlan("STARTER")
                        .paymentStatus("PENDING_PAYMENT")
                        .maxCoordinatorsQuota(3)
                        .maxStudentsQuota(150)
                        .isLocked(false)
                        .termsAccepted(false)
                        .build();
                OrganizationEntity savedOrg = organizationRepository.save(org);
                authEntity.setOrganizationId(savedOrg.getId());
                authRepository.save(authEntity);
            }
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", 409,
                    "error", "USERNAME_TAKEN",
                    "message", ex.getMessage(),
                    "field", "username"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "message", authEntity.getRole() == AuthEntity.Role.STUDENT
                        ? "Student registration received! Access requires College Admin affiliation check and Faculty Coordinator clearance."
                        : (authEntity.getRole() == AuthEntity.Role.COLLEGE_ADMIN
                                ? "College Administrator account registered! Please sign in to accept Terms & Conditions, choose your subscription plan, and activate your campus."
                                : "Coordinator registration received! Access requires College Administrator approval."),
                "role", authEntity.getRole().name(),
                "orgCode", authEntity.getOrgCode() != null ? authEntity.getOrgCode() : "",
                "approved", authEntity.getApproved()
        ));
    }

    @Autowired(required = false)
    private com.example.ProctorX.Config.RedisCacheService redisCacheService;

    @PostMapping("/Login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {

        String email = request.get("email") != null ? String.valueOf(request.get("email")).trim() : null;
        String password = request.get("password") != null ? String.valueOf(request.get("password")) : null;
        boolean forceLogin = Boolean.TRUE.equals(request.get("forceLogin")) || "true".equalsIgnoreCase(String.valueOf(request.get("forceLogin")));

        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }

        AuthEntity existing = authService.findByEmail(email);

        // Explicit notice ONLY if account has no password set yet
        if (existing != null && (existing.getPassword() == null || existing.getPassword().trim().isEmpty())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "This account was registered using Google Sign-In and does not have a password set yet. Please sign in with Google or use 'Forgot Password' to create a password.",
                    "isGoogleAccount", true
            ));
        }

        // Concurrent session single-device lock check via Redis
        if (existing != null && redisCacheService != null) {
            String activeKey = "proctorx:user_active_session:" + existing.getId();
            String existingSessionId = redisCacheService.get(activeKey, String.class);
            if (existingSessionId != null && !existingSessionId.isBlank()) {
                boolean sessionAlive = redisCacheService.hasKey("proctorx:session:sessions:" + existingSessionId);
                if (sessionAlive) {
                    if (!forceLogin) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                                "message", "This account is currently active on another device or browser. Only one active login is permitted at a time.",
                                "concurrentLoginBlocked", true
                        ));
                    } else {
                        // Invalidate previous session in Redis
                        redisCacheService.delete("proctorx:session:sessions:" + existingSessionId);
                        redisCacheService.delete("proctorx:session:sessions:expires:" + existingSessionId);
                        redisCacheService.delete(activeKey);
                    }
                } else {
                    redisCacheService.delete(activeKey);
                }
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            password
                    )
            );

            // Explicitly set in security context and save to HTTP session repository
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, httpRequest, httpResponse);

            AuthEntity user = authService.findByEmail(email);

            // Register current session in Redis
            if (redisCacheService != null && httpRequest.getSession(false) != null) {
                String sessionId = httpRequest.getSession(false).getId();
                redisCacheService.set("proctorx:user_active_session:" + user.getId(), sessionId, 172800, java.util.concurrent.TimeUnit.SECONDS);
            }

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

    @PostMapping("/profile/photo")
    public ResponseEntity<?> updateProfilePhoto(@RequestBody Map<String, String> payload, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            AuthEntity currentUser = authService.getCurrentUser(authentication);
            String imageUrl = payload.get("profileImageUrl");
            String faceEmbedding = payload.get("faceEmbedding");

            if ((imageUrl == null || imageUrl.trim().isEmpty()) && (faceEmbedding == null || faceEmbedding.trim().isEmpty())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Profile image or face biometric vector is required."));
            }

            AuthEntity updatedUser = authService.updateProfilePhoto(currentUser, imageUrl, faceEmbedding);
            return ResponseEntity.ok(formatUserResponse(updatedUser));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to update profile photo: " + ex.getMessage()));
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
        publicData.put("profileImageUrl", user.getProfileImageUrl());
        publicData.put("faceEnrolled", Boolean.TRUE.equals(user.getFaceEnrolled()));
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

        // Attach adaptive AI competency telemetry & activity heatmap
        if (adaptiveEngineService != null) {
            try {
                LearnerModelEntity lm = adaptiveEngineService.getOrCreateLearnerModel(user);
                publicData.put("adaptiveTelemetry", adaptiveEngineService.getLearnerModelSummary(lm));
            } catch (Exception e) {
                // Ignore telemetry errors
            }
        }

        // Attach isolated institutional assessment radar summary
        if (adaptiveEngineService != null) {
            try {
                publicData.put("officialAssessment", adaptiveEngineService.getOfficialAssessmentSummary(user));
            } catch (Exception ignored) {}
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
    public List<AuthEntity> getUsers(Authentication authentication) {
        if (authentication != null) {
            try {
                AuthEntity current = authService.getCurrentUser(authentication);
                if (current != null && current.getRole() == AuthEntity.Role.COLLEGE_ADMIN) {
                    List<AuthEntity> byAdminId = authRepository.findByCollegeAdminId(current.getId());
                    if (current.getOrganizationName() != null && !current.getOrganizationName().trim().isEmpty()) {
                        List<AuthEntity> all = authService.getUsers();
                        Set<Long> ids = new HashSet<>();
                        List<AuthEntity> filtered = new ArrayList<>();
                        for (AuthEntity u : byAdminId) {
                            if (ids.add(u.getId())) filtered.add(u);
                        }
                        for (AuthEntity u : all) {
                            if (current.getOrganizationName().equalsIgnoreCase(u.getOrganizationName()) ||
                                current.getOrganizationName().equalsIgnoreCase(u.getInstitution())) {
                                if (ids.add(u.getId())) filtered.add(u);
                            }
                        }
                        return filtered;
                    }
                    return byAdminId;
                }
            } catch (Exception ignored) {}
        }
        return authService.getUsers();
    }

    @PutMapping("/admin/approve/{id}")
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
        authService.setApproval(id);
        return ResponseEntity.ok(Map.of("message", "User approved successfully", "userId", id));
    }

    // 1. College Admin approves Faculty Coordinator
    @PutMapping("/admin/approve-coordinator/{id}")
    public ResponseEntity<?> approveCoordinator(@PathVariable Long id, Authentication authentication) {
        AuthEntity current = authService.getCurrentUser(authentication);
        AuthEntity coordinator = authRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Coordinator not found"));

        if (!Boolean.TRUE.equals(coordinator.getProfileCompleted())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Coordinator " + coordinator.getName() + " must complete their profile before institutional verification can be granted."));
        }

        if (current.getRole() == AuthEntity.Role.COLLEGE_ADMIN) {
            if (!Objects.equals(coordinator.getOrganizationId(), current.getOrganizationId()) &&
                !Objects.equals(coordinator.getCollegeAdminId(), current.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only approve coordinators in your own organization."));
            }
        }

        coordinator.setCollegeAdminApproved(true);
        coordinator.setApproved(true);
        authRepository.save(coordinator);

        return ResponseEntity.ok(Map.of("success", true, "message", "Coordinator " + coordinator.getName() + " approved successfully!"));
    }

    // 2. College Admin approves Student enrollment (Stage 1)
    @PutMapping("/admin/approve-student-college/{id}")
    public ResponseEntity<?> approveStudentByCollegeAdmin(@PathVariable Long id, Authentication authentication) {
        AuthEntity current = authService.getCurrentUser(authentication);
        AuthEntity student = authRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (!Boolean.TRUE.equals(student.getProfileCompleted())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student " + student.getName() + " must complete their institutional profile (department, designation) before college verification can be granted."));
        }

        if (current.getRole() == AuthEntity.Role.COLLEGE_ADMIN) {
            if (!Objects.equals(student.getOrganizationId(), current.getOrganizationId()) &&
                !Objects.equals(student.getCollegeAdminId(), current.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only verify students in your own organization."));
            }
        }

        student.setCollegeAdminApproved(true);
        if (Boolean.TRUE.equals(student.getCoordinatorApproved())) {
            student.setApproved(true);
        }
        authRepository.save(student);

        return ResponseEntity.ok(Map.of("success", true, "message", "Student " + student.getName() + " verified by College Administrator!"));
    }

    // 3. Student fetches available approved coordinators in their organization
    @GetMapping("/student/coordinators")
    public ResponseEntity<?> getAvailableCoordinatorsForStudent(Authentication authentication) {
        AuthEntity student = authService.getCurrentUser(authentication);
        if (student == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<AuthEntity> coords = new ArrayList<>();
        if (student.getOrganizationId() != null) {
            coords = authRepository.findByOrganizationIdAndRole(student.getOrganizationId(), AuthEntity.Role.COORDINATOR);
        } else if (student.getCollegeAdminId() != null) {
            coords = authRepository.findByCollegeAdminIdAndRole(student.getCollegeAdminId(), AuthEntity.Role.COORDINATOR);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (AuthEntity c : coords) {
            if (Boolean.TRUE.equals(c.getCollegeAdminApproved()) || Boolean.TRUE.equals(c.getApproved())) {
                result.add(Map.of(
                        "id", c.getId(),
                        "name", c.getName(),
                        "email", c.getEmail(),
                        "department", c.getDepartment() != null ? c.getDepartment() : "General Department",
                        "designation", c.getDesignation() != null ? c.getDesignation() : "Faculty Coordinator"
                ));
            }
        }

        return ResponseEntity.ok(result);
    }

    // 4. Student selects their Faculty Coordinator (Stage 2 setup)
    @PutMapping("/student/assign-coordinator")
    public ResponseEntity<?> assignCoordinatorToStudent(@RequestBody Map<String, Object> payload, Authentication authentication) {
        AuthEntity student = authService.getCurrentUser(authentication);
        if (!Boolean.TRUE.equals(student.getCollegeAdminApproved())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Stage 1 College Administrator approval is required before selecting a Faculty Coordinator."));
        }

        Long coordId = ((Number) payload.get("coordinatorId")).longValue();

        AuthEntity coordinator = authRepository.findById(coordId)
                .orElseThrow(() -> new RuntimeException("Selected coordinator not found"));

        student.setCoordinatorId(coordId);
        student.setCoordinatorApproved(false); // Reset coordinator approval so coordinator can review
        student.setApproved(false);
        authRepository.save(student);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Assigned to Coordinator: " + coordinator.getName() + ". Awaiting faculty clearance.",
                "coordinatorName", coordinator.getName()
        ));
    }

    // 5. Coordinator lists students assigned to them
    @GetMapping("/coordinator/my-students")
    public ResponseEntity<?> getMyAssignedStudents(Authentication authentication) {
        AuthEntity coordinator = authService.getCurrentUser(authentication);
        if (coordinator == null || coordinator.getRole() != AuthEntity.Role.COORDINATOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access restricted to Coordinators."));
        }

        List<AuthEntity> students = authRepository.findByCoordinatorIdAndRole(coordinator.getId(), AuthEntity.Role.STUDENT);
        List<Map<String, Object>> result = new ArrayList<>();
        for (AuthEntity s : students) {
            result.add(Map.of(
                    "id", s.getId(),
                    "name", s.getName(),
                    "email", s.getEmail(),
                    "department", s.getDepartment() != null ? s.getDepartment() : "-",
                    "designation", s.getDesignation() != null ? s.getDesignation() : "-",
                    "username", s.getUsername() != null ? s.getUsername() : s.getEmail().split("@")[0],
                    "profileCompleted", Boolean.TRUE.equals(s.getProfileCompleted()),
                    "collegeAdminApproved", Boolean.TRUE.equals(s.getCollegeAdminApproved()),
                    "coordinatorApproved", Boolean.TRUE.equals(s.getCoordinatorApproved()),
                    "isFullyApproved", s.isStudentFullyApproved()
            ));
        }

        return ResponseEntity.ok(result);
    }

    // 6. Coordinator approves student (Stage 2)
    @PutMapping("/coordinator/approve-student/{id}")
    public ResponseEntity<?> approveStudentByCoordinator(@PathVariable Long id, Authentication authentication) {
        AuthEntity coordinator = authService.getCurrentUser(authentication);
        AuthEntity student = authRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (!Objects.equals(student.getCoordinatorId(), coordinator.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only approve students assigned to you."));
        }

        if (!Boolean.TRUE.equals(student.getCollegeAdminApproved())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student must have Stage 1 College Administrator approval before coordinator clearance can be granted."));
        }

        if (!Boolean.TRUE.equals(student.getProfileCompleted())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Student must complete their profile before faculty clearance can be granted."));
        }

        student.setCoordinatorApproved(true);
        if (Boolean.TRUE.equals(student.getCollegeAdminApproved())) {
            student.setApproved(true);
        }
        authRepository.save(student);

        return ResponseEntity.ok(Map.of("success", true, "message", "Student " + student.getName() + " cleared by Faculty Coordinator!"));
    }

    private Map<String, Object> formatUserResponse(AuthEntity user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole().name());
        map.put("approved", user.getApproved());
        map.put("institution", user.getInstitution());
        map.put("organizationId", user.getOrganizationId());
        map.put("orgCode", user.getOrgCode());
        map.put("organizationName", user.getOrganizationName());
        map.put("collegeAdminId", user.getCollegeAdminId());
        map.put("coordinatorId", user.getCoordinatorId());
        map.put("collegeAdminApproved", Boolean.TRUE.equals(user.getCollegeAdminApproved()));
        map.put("coordinatorApproved", Boolean.TRUE.equals(user.getCoordinatorApproved()));
        map.put("isFullyApproved", user.getRole() == AuthEntity.Role.STUDENT 
                ? user.isStudentFullyApproved() 
                : (user.getRole() == AuthEntity.Role.COORDINATOR 
                   ? user.isCoordinatorFullyApproved() 
                   : Boolean.TRUE.equals(user.getApproved())));
        map.put("maxCoordinatorsQuota", user.getMaxCoordinatorsQuota());
        map.put("maxStudentsQuota", user.getMaxStudentsQuota());
        map.put("subscriptionPlan", user.getSubscriptionPlan());
        map.put("paymentStatus", user.getPaymentStatus());
        map.put("department", user.getDepartment());
        map.put("designation", user.getDesignation());
        map.put("bio", user.getBio());
        map.put("skills", user.getSkills());
        map.put("username", user.getUsername() != null ? user.getUsername() : user.getEmail().split("@")[0]);
        map.put("profileCompleted", user.getProfileCompleted());
        map.put("provider", user.getProvider().name());
        map.put("profileImageUrl", user.getProfileImageUrl());
        map.put("faceEnrolled", Boolean.TRUE.equals(user.getFaceEnrolled()));
        map.put("faceEmbedding", user.getFaceEmbedding());

        // Check organization status
        if (user.getOrganizationId() != null) {
            organizationRepository.findById(user.getOrganizationId()).ifPresent(org -> {
                map.put("organizationIsLocked", Boolean.TRUE.equals(org.getIsLocked()));
                map.put("organizationPaymentStatus", org.getPaymentStatus());
                map.put("organizationTermsAccepted", Boolean.TRUE.equals(org.getTermsAccepted()));
            });
        }

        return map;
    }
}
