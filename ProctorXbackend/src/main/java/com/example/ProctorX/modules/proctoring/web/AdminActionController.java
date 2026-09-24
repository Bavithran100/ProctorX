package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.AdminActionEntity;
import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.Service.Impl.AdminActionQueryService;
import com.example.ProctorX.Service.Impl.AdminActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/actions")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class AdminActionController {

    private final AdminActionService actionService;
    private final AuthService authService;

    @PostMapping("/{sessionId}")
    public ResponseEntity<?> takeAction(
            @PathVariable Long sessionId,
            @RequestParam String action,
            @RequestParam(required = false) String remark,
            Authentication authentication
    ) {
        AuthEntity admin = authService.getCurrentUser(authentication);
        if (admin.getRole() != AuthEntity.Role.ADMIN && Boolean.FALSE.equals(admin.getApproved())) {
            return org.springframework.http.ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }

        AdminActionEntity.ActionType actionType =
                AdminActionEntity.ActionType.valueOf(action);

        actionService.performAction(
                sessionId,
                admin,
                actionType,
                remark
        );

        return ResponseEntity.ok(java.util.Map.of("message", "Action performed successfully"));
    }

    @PostMapping("/{sessionId}/revoke")
    public ResponseEntity<?> revokeSubmission(
            @PathVariable Long sessionId,
            @RequestParam(required = false) String remark,
            Authentication authentication
    ) {
        AuthEntity admin = authService.getCurrentUser(authentication);
        if (admin.getRole() != AuthEntity.Role.ADMIN && Boolean.FALSE.equals(admin.getApproved())) {
            return org.springframework.http.ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        actionService.revokeSubmission(sessionId, admin, remark);
        return ResponseEntity.ok(java.util.Map.of("message", "Submission revoked and candidate attempt reopened successfully"));
    }

    @PostMapping("/{sessionId}/reset")
    public ResponseEntity<?> resetAttempt(
            @PathVariable Long sessionId,
            @RequestParam(required = false) String remark,
            Authentication authentication
    ) {
        AuthEntity admin = authService.getCurrentUser(authentication);
        if (admin.getRole() != AuthEntity.Role.ADMIN && Boolean.FALSE.equals(admin.getApproved())) {
            return org.springframework.http.ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        actionService.resetAttempt(sessionId, admin, remark);
        return ResponseEntity.ok(java.util.Map.of("message", "Candidate exam attempt has been fully reset with fresh timing"));
    }

    @PostMapping("/exam/{examId}/student/{studentId}/reset")
    public ResponseEntity<?> resetStudentAttempt(
            @PathVariable Long examId,
            @PathVariable Long studentId,
            @RequestParam(required = false) String remark,
            Authentication authentication
    ) {
        AuthEntity admin = authService.getCurrentUser(authentication);
        if (admin.getRole() != AuthEntity.Role.ADMIN && Boolean.FALSE.equals(admin.getApproved())) {
            return org.springframework.http.ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        actionService.resetStudentAttempt(examId, studentId, admin, remark);
        return ResponseEntity.ok(java.util.Map.of("message", "Candidate exam attempt has been fully reset with fresh timing"));
    }
}

