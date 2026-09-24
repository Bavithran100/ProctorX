package com.example.ProctorX.Controller;

import com.example.ProctorX.Service.Impl.AdminMonitoringService;
import com.example.ProctorX.Service.Impl.MalPracticeQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/monitor")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class AdminMonitoringController {

    private final AdminMonitoringService monitoringService;
    private final MalPracticeQueryService queryService;
    private final com.example.ProctorX.Service.AuthService authService;

    @GetMapping("/live-sessions")
    public ResponseEntity<?> liveSessions(org.springframework.security.core.Authentication auth) {
        var currentUser = auth != null ? authService.getCurrentUser(auth) : null;
        if (currentUser != null && currentUser.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(currentUser.getApproved())) {
            return ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        return ResponseEntity.ok(
                monitoringService.getLiveSessions(currentUser)
        );
    }

    @GetMapping("/exam-history")
    public ResponseEntity<?> examHistory(org.springframework.security.core.Authentication auth) {
        var currentUser = auth != null ? authService.getCurrentUser(auth) : null;
        if (currentUser != null && currentUser.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(currentUser.getApproved())) {
            return ResponseEntity.status(403).body(java.util.Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        return ResponseEntity.ok(
                monitoringService.getCoordinatorExamHistory(currentUser)
        );
    }

    @GetMapping("/{sessionId}/malpractice")
    public ResponseEntity<?> getMalpracticeLogs(
            @PathVariable Long sessionId
    ) {
        return ResponseEntity.ok(
                queryService.getLogsBySession(sessionId)
        );
    }
}
