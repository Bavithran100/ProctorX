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
@PreAuthorize("hasRole('ADMIN')")
public class AdminMonitoringController {

    private final AdminMonitoringService monitoringService;

    @GetMapping("/live-sessions")
    public ResponseEntity<?> liveSessions() {
        return ResponseEntity.ok(
                monitoringService.getLiveSessions()
        );
    }
    private final MalPracticeQueryService queryService;

    @GetMapping("/{sessionId}/malpractice")
    public ResponseEntity<?> getMalpracticeLogs(
            @PathVariable Long sessionId
    ) {
        return ResponseEntity.ok(
                queryService.getLogsBySession(sessionId)
        );
    }
}
