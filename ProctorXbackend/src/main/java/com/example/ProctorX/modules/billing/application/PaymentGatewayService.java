package com.example.ProctorX.modules.billing.application;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.modules.billing.domain.PaymentTransactionEntity;
import com.example.ProctorX.modules.billing.infrastructure.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayService.class);

    private final PaymentTransactionRepository paymentRepository;
    private final AuthRepository authRepository;

    public static final Map<String, Map<String, Object>> PRICING_PACKS = Map.of(
            "STARTER", Map.of(
                    "plan", "STARTER",
                    "name", "Starter Academy Pack",
                    "priceInr", 19999.00,
                    "maxCoordinators", 3,
                    "maxStudents", 150,
                    "description", "Ideal for departments & single cohort training with full proctoring."
            ),
            "PRO", Map.of(
                    "plan", "PRO",
                    "name", "Institution Pro Campus Pack",
                    "priceInr", 49999.00,
                    "maxCoordinators", 10,
                    "maxStudents", 750,
                    "description", "Full university license with AlgoCortex competency engine & live control room."
            ),
            "ENTERPRISE", Map.of(
                    "plan", "ENTERPRISE",
                    "name", "Enterprise University Suite",
                    "priceInr", 99999.00,
                    "maxCoordinators", 50,
                    "maxStudents", 2500,
                    "description", "Unlimited scale for engineering colleges with dedicated sandbox workers."
            )
    );

    @Transactional
    public Map<String, Object> initiateCheckout(AuthEntity collegeAdmin, String planName, String orgName, Integer customCoordinators, Integer customStudents) {
        String planKey = (planName != null) ? planName.trim().toUpperCase() : "PRO";
        Map<String, Object> pack = PRICING_PACKS.getOrDefault(planKey, PRICING_PACKS.get("PRO"));

        int coordSeats = customCoordinators != null ? customCoordinators : (int) pack.get("maxCoordinators");
        int studentSeats = customStudents != null ? customStudents : (int) pack.get("maxStudents");
        double basePrice = ((Number) pack.get("priceInr")).doubleValue();

        // Calculate custom seats add-ons if requested beyond tier baseline
        int extraCoordinators = Math.max(0, coordSeats - (int) pack.get("maxCoordinators"));
        int extraStudents = Math.max(0, studentSeats - (int) pack.get("maxStudents"));
        double totalAmount = basePrice + (extraCoordinators * 1500.0) + (extraStudents * 10.0);

        String txnId = "TXN_PX_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Dynamic URL gateway endpoint (PhonePe dynamic payload structure)
        String dynamicGatewayUrl = "https://mercury.phonepe.com/transact/pg?merchantId=PROCTORX_UAT&transactionId="
                + txnId + "&amount=" + Math.round(totalAmount * 100) + "&redirectUrl=/admin/billing/status?txn=" + txnId;

        PaymentTransactionEntity txn = PaymentTransactionEntity.builder()
                .transactionId(txnId)
                .collegeAdminEmail(collegeAdmin.getEmail())
                .organizationName(orgName != null && !orgName.isBlank() ? orgName : collegeAdmin.getInstitution())
                .planName(planKey)
                .coordinatorSeats(coordSeats)
                .studentSeats(studentSeats)
                .amount(totalAmount)
                .currency("INR")
                .status("PENDING")
                .paymentGateway("PHONEPE_DYNAMIC_GATEWAY")
                .gatewayUrl(dynamicGatewayUrl)
                .createdAt(LocalDateTime.now())
                .build();

        paymentRepository.save(txn);
        log.info("Initiated PhonePe dynamic checkout txn: {} for college admin: {} (Amount: INR {})", txnId, collegeAdmin.getEmail(), totalAmount);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("transactionId", txnId);
        response.put("amount", totalAmount);
        response.put("currency", "INR");
        response.put("planName", planKey);
        response.put("coordinatorSeats", coordSeats);
        response.put("studentSeats", studentSeats);
        response.put("organizationName", txn.getOrganizationName());
        response.put("status", "PENDING");
        response.put("dynamicGatewayUrl", dynamicGatewayUrl);
        response.put("callbackUrl", "/api/payment/verify?transactionId=" + txnId);
        return response;
    }

    @Transactional
    public Map<String, Object> verifyPayment(String transactionId, String verificationStatus) {
        PaymentTransactionEntity txn = paymentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + transactionId));

        boolean isSuccess = "COMPLETED".equalsIgnoreCase(verificationStatus) || "SUCCESS".equalsIgnoreCase(verificationStatus);

        txn.setStatus(isSuccess ? "COMPLETED" : "FAILED");
        txn.setCompletedAt(LocalDateTime.now());
        paymentRepository.save(txn);

        if (isSuccess) {
            AuthEntity admin = authRepository.findByEmail(txn.getCollegeAdminEmail());
            if (admin != null) {
                admin.setPaymentStatus("ACTIVE");
                admin.setSubscriptionPlan(txn.getPlanName());
                admin.setMaxCoordinatorsQuota(txn.getCoordinatorSeats());
                admin.setMaxStudentsQuota(txn.getStudentSeats());
                if (txn.getOrganizationName() != null && !txn.getOrganizationName().isBlank()) {
                    admin.setOrganizationName(txn.getOrganizationName());
                    admin.setInstitution(txn.getOrganizationName());
                }
                admin.setApproved(true);
                authRepository.save(admin);
                log.info("Successfully provisioned organization quotas for college admin: {}. Plan: {}, Coordinators: {}, Students: {}",
                        admin.getEmail(), txn.getPlanName(), txn.getCoordinatorSeats(), txn.getStudentSeats());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transactionId", transactionId);
        result.put("status", txn.getStatus());
        result.put("amount", txn.getAmount());
        result.put("planName", txn.getPlanName());
        result.put("completedAt", txn.getCompletedAt());
        result.put("success", isSuccess);
        result.put("plan", txn.getPlanName());
        return result;
    }

    @Transactional
    public Map<String, Object> allocateCoordinatorQuota(AuthEntity collegeAdmin, Long coordinatorId, int studentQuota) {
        AuthEntity coordinator = authRepository.findById(coordinatorId)
                .orElseThrow(() -> new IllegalArgumentException("Coordinator not found"));

        if (!collegeAdmin.getId().equals(coordinator.getCollegeAdminId())
                && collegeAdmin.getRole() != AuthEntity.Role.SUPER_ADMIN
                && collegeAdmin.getRole() != AuthEntity.Role.ADMIN) {
            throw new SecurityException("Unauthorized: Coordinator does not belong to your organization");
        }

        coordinator.setAllocatedStudentQuota(studentQuota);
        authRepository.save(coordinator);

        log.info("College Admin {} updated student quota for Coordinator {} to {}",
                collegeAdmin.getEmail(), coordinator.getEmail(), studentQuota);

        return Map.of(
                "coordinatorId", coordinator.getId(),
                "coordinatorName", coordinator.getName(),
                "allocatedStudentQuota", studentQuota
        );
    }

    public List<PaymentTransactionEntity> getBillingHistory(String collegeAdminEmail) {
        return paymentRepository.findByCollegeAdminEmailOrderByCreatedAtDesc(collegeAdminEmail);
    }
}
