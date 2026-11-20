package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthEntity {

    public enum Role {
        STUDENT,
        COORDINATOR,
        COLLEGE_ADMIN,
        SUPER_ADMIN,
        ADMIN
    }

    public enum Provider {
        LOCAL,
        GOOGLE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    // nullable because Google users don't have password
    @Column(nullable = true)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "VARCHAR(32)")
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "VARCHAR(32)")
    private Provider provider;

    // approval required for students and coordinators before unlocking live exams & authoring
    @Builder.Default
    private Boolean approved = false;

    @Builder.Default
    private Boolean enabled = true;

    // Profile & Institution details
    @Column(nullable = true)
    private String institution;

    @Column(nullable = true)
    private String department;

    @Column(nullable = true)
    private String designation; // Year of study or Academic title

    @Column(columnDefinition = "TEXT", nullable = true)
    private String bio;

    @Column(nullable = true)
    private String skills;

    @Column(nullable = true, unique = true)
    private String username;

    @Builder.Default
    private Boolean profileCompleted = false;

    // Biometric Identification & Profile Photo
    @Column(columnDefinition = "LONGTEXT", nullable = true)
    private String profileImageUrl;

    @Column(columnDefinition = "TEXT", nullable = true)
    private String faceEmbedding;

    @Builder.Default
    private Boolean faceEnrolled = false;

    // Multi-Tenant Organization, Quotas & Dynamic Gateway Governance
    @Column(nullable = true)
    private Long organizationId;

    @Column(nullable = true, length = 32)
    private String orgCode;

    @Column(nullable = true)
    private String organizationName;

    @Column(nullable = true)
    private Long collegeAdminId;

    @Column(nullable = true)
    private Long coordinatorId;

    // Granular 2-Stage Approvals
    @Builder.Default
    private Boolean collegeAdminApproved = false; // Granted by College Admin

    @Builder.Default
    private Boolean coordinatorApproved = false;  // Granted by Faculty Coordinator

    @Column(nullable = true)
    @Builder.Default
    private Integer allocatedStudentQuota = 100; // Coordinator max students limit

    @Column(nullable = true)
    @Builder.Default
    private Integer maxCoordinatorsQuota = 3; // College Admin max coordinators

    @Column(nullable = true)
    @Builder.Default
    private Integer maxStudentsQuota = 150; // College Admin max total student seats

    @Column(nullable = true)
    @Builder.Default
    private String subscriptionPlan = "STARTER"; // STARTER, GROWTH, ENTERPRISE

    @Column(nullable = true)
    @Builder.Default
    private String paymentStatus = "PENDING_PAYMENT"; // PENDING_PAYMENT, ACTIVE, EXPIRED, LOCKED

    public boolean isStudentFullyApproved() {
        return Boolean.TRUE.equals(collegeAdminApproved) && Boolean.TRUE.equals(coordinatorApproved);
    }

    public boolean isCoordinatorFullyApproved() {
        return Boolean.TRUE.equals(collegeAdminApproved) || Boolean.TRUE.equals(approved);
    }
}