package com.example.ProctorX.modules.billing.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String transactionId;

    @Column(nullable = false)
    private String collegeAdminEmail;

    @Column(nullable = true)
    private String organizationName;

    @Column(nullable = false)
    private String planName; // STARTER, PRO, ENTERPRISE

    @Column(nullable = false)
    private Integer coordinatorSeats;

    @Column(nullable = false)
    private Integer studentSeats;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, COMPLETED, FAILED, REFUNDED

    @Column(nullable = false)
    @Builder.Default
    private String paymentGateway = "PHONEPE_DYNAMIC_GATEWAY";

    @Column(columnDefinition = "TEXT", nullable = true)
    private String gatewayUrl;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = true)
    private LocalDateTime completedAt;
}
