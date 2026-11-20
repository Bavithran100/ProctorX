package com.example.ProctorX.modules.organization.web;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.OrganizationEntity;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.Repository.OrganizationRepository;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.modules.billing.domain.PaymentTransactionEntity;
import com.example.ProctorX.modules.billing.infrastructure.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrganizationController {

    private static final Logger log = LoggerFactory.getLogger(OrganizationController.class);

    private final OrganizationRepository organizationRepository;
    private final AuthRepository authRepository;
    private final AuthService authService;
    private final PaymentTransactionRepository paymentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    // ==========================================
    // 1. PUBLIC: Active Organizations for Registration
    // ==========================================
    @GetMapping({"/public/organizations", "/organizations"})
    public ResponseEntity<?> getPublicActiveOrganizations() {
        List<OrganizationEntity> activeOrgs = organizationRepository.findByPaymentStatusAndIsLockedFalse("ACTIVE");
        List<Map<String, Object>> result = new ArrayList<>();

        for (OrganizationEntity org : activeOrgs) {
            long coordCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.COORDINATOR);
            long studentCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.STUDENT);

            Map<String, Object> map = new HashMap<>();
            map.put("id", org.getId());
            map.put("name", org.getName());
            map.put("orgCode", org.getOrgCode());
            map.put("adminName", org.getCollegeAdminName());
            map.put("subscriptionPlan", org.getSubscriptionPlan());
            map.put("maxCoordinatorsQuota", org.getMaxCoordinatorsQuota());
            map.put("maxStudentsQuota", org.getMaxStudentsQuota());
            map.put("currentCoordinators", coordCount);
            map.put("currentStudents", studentCount);
            map.put("isFull", studentCount >= org.getMaxStudentsQuota());
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // ==========================================
    // 2. COLLEGE ADMIN: My Organization & Onboarding Status
    // ==========================================
    @GetMapping("/organization/my-organization")
    public ResponseEntity<?> getMyOrganization(Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || user.getRole() != AuthEntity.Role.COLLEGE_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access restricted to College Administrators."));
        }

        OrganizationEntity org = null;
        if (user.getOrganizationId() != null) {
            org = organizationRepository.findById(user.getOrganizationId()).orElse(null);
        }
        if (org == null) {
            org = organizationRepository.findByCollegeAdminId(user.getId()).orElse(null);
        }
        if (org == null && user.getOrganizationName() != null) {
            org = organizationRepository.findByNameIgnoreCase(user.getOrganizationName()).orElse(null);
        }

        if (org == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No organization registered under this account."));
        }

        long coordCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.COORDINATOR);
        long studentCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.STUDENT);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", org.getId());
        resp.put("name", org.getName());
        resp.put("orgCode", org.getOrgCode());
        resp.put("collegeAdminId", org.getCollegeAdminId());
        resp.put("subscriptionPlan", org.getSubscriptionPlan());
        resp.put("paymentStatus", org.getPaymentStatus());
        resp.put("maxCoordinatorsQuota", org.getMaxCoordinatorsQuota());
        resp.put("maxStudentsQuota", org.getMaxStudentsQuota());
        resp.put("currentCoordinators", coordCount);
        resp.put("currentStudents", studentCount);
        resp.put("isLocked", org.getIsLocked());
        resp.put("termsAccepted", org.getTermsAccepted());
        resp.put("termsAcceptedAt", org.getTermsAcceptedAt());
        resp.put("subscriptionExpiresAt", org.getSubscriptionExpiresAt());

        return ResponseEntity.ok(resp);
    }

    // ==========================================
    // 3. COLLEGE ADMIN: Accept T&C and Select Plan
    // ==========================================
    @PostMapping("/organization/accept-terms-and-plan")
    @Transactional
    public ResponseEntity<?> acceptTermsAndPlan(@RequestBody Map<String, Object> payload, Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || user.getRole() != AuthEntity.Role.COLLEGE_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access restricted to College Administrators."));
        }

        boolean acceptTerms = Boolean.TRUE.equals(payload.get("termsAccepted"));
        if (!acceptTerms) {
            return ResponseEntity.badRequest().body(Map.of("message", "You must accept the institutional terms and conditions."));
        }

        String plan = (String) payload.getOrDefault("subscriptionPlan", "GROWTH");
        plan = plan.trim().toUpperCase();

        OrganizationEntity org = organizationRepository.findByCollegeAdminId(user.getId())
                .orElseGet(() -> {
                    if (user.getOrganizationId() != null) {
                        return organizationRepository.findById(user.getOrganizationId()).orElse(null);
                    }
                    return null;
                });

        if (org == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Organization not found."));
        }

        int maxCoords = "STARTER".equals(plan) ? 3 : ("GROWTH".equals(plan) ? 10 : 35);
        int maxStudents = "STARTER".equals(plan) ? 150 : ("GROWTH".equals(plan) ? 600 : 2500);

        org.setTermsAccepted(true);
        org.setTermsAcceptedAt(LocalDateTime.now());
        org.setSubscriptionPlan(plan);
        org.setMaxCoordinatorsQuota(maxCoords);
        org.setMaxStudentsQuota(maxStudents);

        organizationRepository.save(org);

        user.setSubscriptionPlan(plan);
        user.setMaxCoordinatorsQuota(maxCoords);
        user.setMaxStudentsQuota(maxStudents);
        authRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Terms accepted and plan updated successfully.",
                "organization", org
        ));
    }

    // ==========================================
    // 4. COLLEGE ADMIN: Mock Payment Activation
    // ==========================================
    @PostMapping("/organization/mock-activate")
    @Transactional
    public ResponseEntity<?> mockActivateOrganization(@RequestBody Map<String, Object> payload, Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || user.getRole() != AuthEntity.Role.COLLEGE_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access restricted to College Administrators."));
        }

        OrganizationEntity org = organizationRepository.findByCollegeAdminId(user.getId())
                .orElseGet(() -> {
                    if (user.getOrganizationId() != null) {
                        return organizationRepository.findById(user.getOrganizationId()).orElse(null);
                    }
                    return null;
                });

        if (org == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Organization not found."));
        }

        String plan = (String) payload.getOrDefault("plan", org.getSubscriptionPlan() != null ? org.getSubscriptionPlan() : "GROWTH");
        plan = plan.trim().toUpperCase();

        int maxCoords = "STARTER".equals(plan) ? 3 : ("GROWTH".equals(plan) ? 10 : 35);
        int maxStudents = "STARTER".equals(plan) ? 150 : ("GROWTH".equals(plan) ? 600 : 2500);
        double amount = "STARTER".equals(plan) ? 4999.00 : ("GROWTH".equals(plan) ? 12499.00 : 29999.00);

        // Record mock transaction
        String txnId = "TXN_MOCK_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        PaymentTransactionEntity tx = PaymentTransactionEntity.builder()
                .transactionId(txnId)
                .collegeAdminEmail(user.getEmail())
                .organizationName(org.getName())
                .planName(plan)
                .amount(amount)
                .coordinatorSeats(maxCoords)
                .studentSeats(maxStudents)
                .status("COMPLETED")
                .paymentGateway("MOCK_GATEWAY")
                .createdAt(LocalDateTime.now())
                .completedAt(LocalDateTime.now())
                .build();
        paymentRepository.save(tx);

        // Activate Organization
        org.setTermsAccepted(true);
        if (org.getTermsAcceptedAt() == null) {
            org.setTermsAcceptedAt(LocalDateTime.now());
        }
        org.setPaymentStatus("ACTIVE");
        org.setIsLocked(false);
        org.setSubscriptionPlan(plan);
        org.setMaxCoordinatorsQuota(maxCoords);
        org.setMaxStudentsQuota(maxStudents);
        org.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
        organizationRepository.save(org);

        // Activate Admin Account
        user.setApproved(true);
        user.setPaymentStatus("ACTIVE");
        user.setSubscriptionPlan(plan);
        user.setMaxCoordinatorsQuota(maxCoords);
        user.setMaxStudentsQuota(maxStudents);
        authRepository.save(user);

        log.info("✓ Organization '{}' ({}) activated via mock checkout. Plan: {}, Expiry: 1 Month", org.getName(), org.getOrgCode(), plan);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Institutional license activated successfully! Your campus is now ready to accept faculty and candidates.",
                "transactionId", txnId,
                "orgCode", org.getOrgCode(),
                "organizationName", org.getName(),
                "plan", plan,
                "maxCoordinatorsQuota", maxCoords,
                "maxStudentsQuota", maxStudents
        ));
    }

    // ==========================================
    // 5. SUPER ADMIN: Master Organizations Overview Tree
    // ==========================================
    @GetMapping("/super-admin/organizations")
    public ResponseEntity<?> getSuperAdminOverview(Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || (user.getRole() != AuthEntity.Role.SUPER_ADMIN && user.getRole() != AuthEntity.Role.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Super Administrator access required."));
        }

        List<OrganizationEntity> orgs = organizationRepository.findAllByOrderByCreatedAtDesc();
        List<Map<String, Object>> orgTrees = new ArrayList<>();

        for (OrganizationEntity org : orgs) {
            Map<String, Object> orgMap = new HashMap<>();
            orgMap.put("id", org.getId());
            orgMap.put("name", org.getName());
            orgMap.put("orgCode", org.getOrgCode());
            orgMap.put("subscriptionPlan", org.getSubscriptionPlan());
            orgMap.put("paymentStatus", org.getPaymentStatus());
            orgMap.put("isLocked", org.getIsLocked());
            orgMap.put("termsAccepted", org.getTermsAccepted());
            orgMap.put("maxCoordinatorsQuota", org.getMaxCoordinatorsQuota());
            orgMap.put("maxStudentsQuota", org.getMaxStudentsQuota());
            orgMap.put("createdAt", org.getCreatedAt());

            // Admin info
            AuthEntity admin = authRepository.findById(org.getCollegeAdminId()).orElse(null);
            if (admin != null) {
                orgMap.put("admin", Map.of(
                        "id", admin.getId(),
                        "name", admin.getName(),
                        "email", admin.getEmail(),
                        "designation", admin.getDesignation() != null ? admin.getDesignation() : "College Administrator"
                ));
            }

            // Coordinators under this org
            List<AuthEntity> coords = authRepository.findByOrganizationIdAndRole(org.getId(), AuthEntity.Role.COORDINATOR);
            List<Map<String, Object>> coordList = new ArrayList<>();
            for (AuthEntity c : coords) {
                long studentCount = authRepository.countByCoordinatorIdAndRole(c.getId(), AuthEntity.Role.STUDENT);
                Map<String, Object> cMap = new HashMap<>();
                cMap.put("id", c.getId());
                cMap.put("name", c.getName());
                cMap.put("email", c.getEmail());
                cMap.put("department", c.getDepartment());
                cMap.put("collegeAdminApproved", c.getCollegeAdminApproved());
                cMap.put("approved", c.getApproved());
                cMap.put("studentsCount", studentCount);
                coordList.add(cMap);
            }
            orgMap.put("coordinators", coordList);

            // Students under this org
            List<AuthEntity> students = authRepository.findByOrganizationIdAndRole(org.getId(), AuthEntity.Role.STUDENT);
            List<Map<String, Object>> studentList = new ArrayList<>();
            for (AuthEntity s : students) {
                Map<String, Object> sMap = new HashMap<>();
                sMap.put("id", s.getId());
                sMap.put("name", s.getName());
                sMap.put("email", s.getEmail());
                sMap.put("department", s.getDepartment());
                sMap.put("designation", s.getDesignation());
                sMap.put("collegeAdminApproved", s.getCollegeAdminApproved());
                sMap.put("coordinatorApproved", s.getCoordinatorApproved());
                sMap.put("coordinatorId", s.getCoordinatorId());
                sMap.put("isFullyApproved", s.isStudentFullyApproved());
                studentList.add(sMap);
            }
            orgMap.put("students", studentList);

            orgMap.put("coordinatorsCount", coords.size());
            orgMap.put("studentsCount", students.size());

            orgTrees.add(orgMap);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalOrganizations", orgs.size());
        summary.put("activeOrganizations", orgs.stream().filter(o -> "ACTIVE".equals(o.getPaymentStatus()) && !o.getIsLocked()).count());
        summary.put("lockedOrganizations", orgs.stream().filter(OrganizationEntity::getIsLocked).count());
        summary.put("totalCoordinators", authRepository.findByRole(AuthEntity.Role.COORDINATOR).size());
        summary.put("totalStudents", authRepository.findByRole(AuthEntity.Role.STUDENT).size());

        return ResponseEntity.ok(Map.of(
                "summary", summary,
                "organizations", orgTrees
        ));
    }

    // ==========================================
    // 6. SUPER ADMIN: Master Kill Switch (Lock/Unlock Organization)
    // ==========================================
    @PutMapping("/super-admin/organizations/{id}/toggle-lock")
    @Transactional
    public ResponseEntity<?> toggleOrganizationLock(@PathVariable Long id, Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || (user.getRole() != AuthEntity.Role.SUPER_ADMIN && user.getRole() != AuthEntity.Role.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Super Administrator access required."));
        }

        OrganizationEntity org = organizationRepository.findById(id).orElse(null);
        if (org == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Organization not found."));
        }

        boolean newLockedState = !Boolean.TRUE.equals(org.getIsLocked());
        org.setIsLocked(newLockedState);
        organizationRepository.save(org);

        log.info("Super Admin {} toggled lock for organization '{}' (id: {}): locked={}", user.getEmail(), org.getName(), id, newLockedState);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "isLocked", newLockedState,
                "message", newLockedState ? "Organization locked. All member access suspended." : "Organization unlocked. Member access restored."
        ));
    }

    // ==========================================
    // 7. SUPER ADMIN: Cascading Delete Organization & Tenant Data
    // ==========================================
    @DeleteMapping("/super-admin/organizations/{id}")
    @Transactional
    public ResponseEntity<?> deleteOrganization(@PathVariable Long id, Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || (user.getRole() != AuthEntity.Role.SUPER_ADMIN && user.getRole() != AuthEntity.Role.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Super Administrator access required."));
        }

        OrganizationEntity org = organizationRepository.findById(id).orElse(null);
        if (org == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Organization not found."));
        }

        String orgName = org.getName();
        String orgCode = org.getOrgCode();

        // 1. Delete associated students & coordinators
        authRepository.deleteByOrganizationId(id);

        // 2. Delete college admin if owned
        if (org.getCollegeAdminId() != null) {
            authRepository.deleteById(org.getCollegeAdminId());
        }

        // 3. Delete organization
        organizationRepository.delete(org);

        log.info("Super Admin {} purged organization '{}' (code: {}) and all tenant accounts.", user.getEmail(), orgName, orgCode);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Organization '" + orgName + "' [" + orgCode + "] and all associated coordinators and students have been completely removed."
        ));
    }

    // ==========================================
    // 8. SUPER ADMIN: Clean Fresh Start / Database Reset
    // ==========================================
    @PostMapping("/super-admin/clean-database")
    @Transactional
    public ResponseEntity<?> cleanDatabase(Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        if (user == null || (user.getRole() != AuthEntity.Role.SUPER_ADMIN && user.getRole() != AuthEntity.Role.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Super Administrator access required."));
        }

        try {
            log.warn("Super Admin {} requested complete database clean & reset to fresh start.", user.getEmail());

            // 1. Clean tenant organizations & payments
            organizationRepository.deleteAll();
            paymentRepository.deleteAll();

            // 2. Delete all non-admin users
            List<AuthEntity> allUsers = authRepository.findAll();
            for (AuthEntity u : allUsers) {
                if (!"admin@proctorx.com".equalsIgnoreCase(u.getEmail()) && u.getRole() != AuthEntity.Role.SUPER_ADMIN && u.getRole() != AuthEntity.Role.ADMIN) {
                    authRepository.delete(u);
                }
            }

            // 3. Ensure pristine super admin exists with admin123
            AuthEntity admin = authRepository.findByEmail("admin@proctorx.com");
            if (admin == null) {
                admin = AuthEntity.builder()
                        .name("System Administrator")
                        .email("admin@proctorx.com")
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .role(AuthEntity.Role.SUPER_ADMIN)
                        .provider(AuthEntity.Provider.LOCAL)
                        .approved(true)
                        .enabled(true)
                        .profileCompleted(true)
                        .collegeAdminApproved(true)
                        .coordinatorApproved(true)
                        .institution("ProctorX Central Governance")
                        .build();
                authRepository.save(admin);
            } else {
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(AuthEntity.Role.SUPER_ADMIN);
                admin.setApproved(true);
                admin.setCollegeAdminApproved(true);
                admin.setCoordinatorApproved(true);
                admin.setOrganizationId(null);
                admin.setOrgCode(null);
                authRepository.save(admin);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Database successfully cleaned and reset to pristine fresh state! Super Admin seeded (admin@proctorx.com / admin123)."
            ));
        } catch (Exception e) {
            log.error("Clean database error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Clean database failed: " + e.getMessage()));
        }
    }
}
