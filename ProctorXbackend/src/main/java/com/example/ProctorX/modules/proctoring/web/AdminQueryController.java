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
@PreAuthorize("hasRole('ADMIN')")
public class AdminQueryController {

    private final AdminActionQueryService malpracticeService;

    @GetMapping("/logs")
    public ResponseEntity<?> getAllMalpracticeLogs() {
        return ResponseEntity.ok(
                malpracticeService.getAllLogs()
        );
    }


    private final AdminActionQueryService actionService;

    @GetMapping("/history")
    public ResponseEntity<?> getAllAdminActions() {
        return ResponseEntity.ok(
                actionService.getAllActions()
        );
    }
}


