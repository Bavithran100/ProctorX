package com.example.ProctorX.Controller;


import com.example.ProctorX.Service.Impl.AdminActionQueryService;
import com.example.ProctorX.Service.Impl.MalPracticeQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/malpractice")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class AdminQueryController {

    private final AdminActionQueryService malpracticeService;
    private final com.example.ProctorX.Service.AuthService authService;

    @GetMapping("/logs")
    public ResponseEntity<?> getAllMalpracticeLogs(org.springframework.security.core.Authentication authentication) {
        var user = authService.getCurrentUser(authentication);
        return ResponseEntity.ok(
                malpracticeService.getAllLogs(user)
        );
    }

    @GetMapping("/history")
    public ResponseEntity<?> getAllAdminActions(org.springframework.security.core.Authentication authentication) {
        var user = authService.getCurrentUser(authentication);
        return ResponseEntity.ok(
                malpracticeService.getAllActions(user)
        );
    }
}


