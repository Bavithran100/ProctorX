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
@PreAuthorize("hasRole('ADMIN')")
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

        AdminActionEntity.ActionType actionType =
                AdminActionEntity.ActionType.valueOf(action);

        actionService.performAction(
                sessionId,
                admin,
                actionType,
                remark
        );

        return ResponseEntity.ok().build();
    }

}

