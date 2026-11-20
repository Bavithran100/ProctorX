package com.example.ProctorX.modules.billing.web;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.modules.billing.application.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentGatewayService paymentService;
    private final AuthService authService;

    @GetMapping("/pricing-packs")
    public ResponseEntity<?> getPricingPacks() {
        return ResponseEntity.ok(PaymentGatewayService.PRICING_PACKS);
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        AuthEntity user = authService.getCurrentUser(authentication);
        String plan = (String) payload.getOrDefault("plan", "PRO");
        String orgName = (String) payload.getOrDefault("organizationName", user.getOrganizationName());
        Integer coordSeats = payload.get("coordinatorSeats") instanceof Number n ? n.intValue() : null;
        Integer studentSeats = payload.get("studentSeats") instanceof Number n ? n.intValue() : null;

        Map<String, Object> checkout = paymentService.initiateCheckout(user, plan, orgName, coordSeats, studentSeats);
        return ResponseEntity.ok(checkout);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(
            @RequestBody Map<String, Object> payload
    ) {
        String txnId = (String) payload.get("transactionId");
        String status = (String) payload.getOrDefault("status", "COMPLETED");

        if (txnId == null || txnId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "transactionId is required"));
        }

        Map<String, Object> result = paymentService.verifyPayment(txnId, status);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/allocate-quota")
    public ResponseEntity<?> allocateQuota(
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        AuthEntity user = authService.getCurrentUser(authentication);
        Long coordId = ((Number) payload.get("coordinatorId")).longValue();
        int quota = ((Number) payload.get("allocatedStudentQuota")).intValue();

        Map<String, Object> res = paymentService.allocateCoordinatorQuota(user, coordId, quota);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(Authentication authentication) {
        AuthEntity user = authService.getCurrentUser(authentication);
        return ResponseEntity.ok(paymentService.getBillingHistory(user.getEmail()));
    }
}
