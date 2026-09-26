package com.example.ProctorX.Controller;

import com.example.ProctorX.modules.coding.compiler.CodeExecutionResult;
import com.example.ProctorX.modules.coding.compiler.CodeExecutionRouterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/code-execution")
public class CodeExecutionController {

    private final CodeExecutionRouterService routerService;
    private final com.example.ProctorX.Service.AuthService authService;

    public CodeExecutionController(CodeExecutionRouterService routerService, com.example.ProctorX.Service.AuthService authService) {
        this.routerService = routerService;
        this.authService = authService;
    }

    @PostMapping("/generate-output")
    public ResponseEntity<?> generateOutput(@RequestBody CodeExecutionRequest request, org.springframework.security.core.Authentication auth) {
        if (auth != null) {
            var user = authService.getCurrentUser(auth);
            if (user != null && user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
                return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
            }
        }
        if (request == null || isBlank(request.script())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Script code is required"));
        }

        try {
            CodeExecutionResult result = routerService.execute(
                    request.script(),
                    request.stdin(),
                    request.language()
            );

            return ResponseEntity.ok(Map.of(
                    "stdout", result.stdout() != null ? result.stdout() : "",
                    "output", result.output() != null ? result.output() : "",
                    "error", result.error() != null ? result.error() : "",
                    "statusCode", result.statusCode() != null ? result.statusCode() : "200",
                    "cpuTime", result.cpuTime() != null ? result.cpuTime() : "0",
                    "memory", result.memory() != null ? result.memory() : "0",
                    "providerUsed", result.providerUsed() != null ? result.providerUsed() : ""
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Execution failed: " + ex.getMessage()));
        }
    }

    @PostMapping("/test/{providerName}")
    public ResponseEntity<?> testProvider(
            @PathVariable String providerName,
            @RequestBody(required = false) CodeExecutionRequest request,
            org.springframework.security.core.Authentication auth) {
        if (auth != null) {
            var user = authService.getCurrentUser(auth);
            if (user != null && user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
                return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
            }
        }
        try {
            String script = (request != null && !isBlank(request.script()))
                    ? request.script()
                    : "public class Main { public static void main(String[] args) { System.out.println(\"Engine Diagnostic OK\"); } }";
            String stdin = request != null ? request.stdin() : "";
            String language = (request != null && !isBlank(request.language())) ? request.language() : "java";

            CodeExecutionResult result = routerService.executeDirect(providerName, script, stdin, language);

            return ResponseEntity.ok(Map.of(
                    "stdout", result.stdout() != null ? result.stdout() : "",
                    "output", result.output() != null ? result.output() : "",
                    "error", result.error() != null ? result.error() : "",
                    "statusCode", result.statusCode() != null ? result.statusCode() : "200",
                    "cpuTime", result.cpuTime() != null ? result.cpuTime() : "0",
                    "memory", result.memory() != null ? result.memory() : "0",
                    "providerUsed", result.providerUsed() != null ? result.providerUsed() : providerName,
                    "success", result.success()
            ));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Direct test failed: " + ex.getMessage()));
        }
    }

    @GetMapping("/providers")
    public ResponseEntity<?> getProviders() {
        return ResponseEntity.ok(Map.of(
                "primaryProvider", routerService.getPrimaryProviderName(),
                "priorityChain", routerService.getPriorityChain(),
                "providers", routerService.getProvidersInfo()
        ));
    }

    @GetMapping("/priority-chain")
    public ResponseEntity<?> getPriorityChain() {
        return ResponseEntity.ok(Map.of(
                "primaryProvider", routerService.getPrimaryProviderName(),
                "priorityChain", routerService.getPriorityChain(),
                "providers", routerService.getProvidersInfo()
        ));
    }

    @PostMapping("/priority-chain")
    public ResponseEntity<?> setPriorityChain(@RequestBody Map<String, Object> body, org.springframework.security.core.Authentication auth) {
        if (auth != null) {
            var user = authService.getCurrentUser(auth);
            if (user != null && user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
                return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
            }
        }
        Object chainObj = body != null ? body.get("priorityChain") : null;
        if (chainObj instanceof java.util.List<?> list) {
            java.util.List<String> stringList = list.stream().map(String::valueOf).toList();
            routerService.setPriorityChain(stringList);
            return ResponseEntity.ok(Map.of(
                    "message", "Compiler priority chain updated successfully",
                    "priorityChain", routerService.getPriorityChain(),
                    "primaryProvider", routerService.getPrimaryProviderName()
            ));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "priorityChain array is required"));
    }

    @PostMapping("/primary-provider")
    public ResponseEntity<?> setPrimaryProvider(@RequestBody Map<String, String> body, org.springframework.security.core.Authentication auth) {
        if (auth != null) {
            var user = authService.getCurrentUser(auth);
            if (user != null && user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
                return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
            }
        }
        String provider = body != null ? body.get("provider") : null;
        if (provider == null || provider.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Provider name is required"));
        }
        routerService.setPrimaryProvider(provider);
        return ResponseEntity.ok(Map.of(
                "message", "Primary compiler engine set to " + provider,
                "primaryProvider", routerService.getPrimaryProviderName(),
                "priorityChain", routerService.getPriorityChain()
        ));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record CodeExecutionRequest(String script, String stdin, String language) {
    }
}

