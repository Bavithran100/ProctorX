package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String orgCode; // e.g. "ORG-OXFORD-2026"

    @Column(nullable = false, unique = true)
    private String name; // Official Institution Name

    @Column(nullable = false)
    private Long collegeAdminId;

    @Column(nullable = true)
    private String collegeAdminEmail;

    @Column(nullable = true)
    private String collegeAdminName;

    @Column(nullable = true)
    @Builder.Default
    private String subscriptionPlan = "STARTER"; // STARTER, GROWTH, ENTERPRISE

    @Column(nullable = false)
    @Builder.Default
    private String paymentStatus = "PENDING_PAYMENT"; // PENDING_PAYMENT, ACTIVE, EXPIRED, LOCKED

    @Column(nullable = false)
    @Builder.Default
    private Integer maxCoordinatorsQuota = 3;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxStudentsQuota = 150;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isLocked = false; // Super Admin master kill-switch

    @Column(nullable = false)
    @Builder.Default
    private Boolean termsAccepted = false;

    private LocalDateTime termsAcceptedAt;

    private LocalDateTime subscriptionExpiresAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
