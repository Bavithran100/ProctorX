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

    public CodeExecutionController(CodeExecutionRouterService routerService) {
        this.routerService = routerService;
    }

    @PostMapping("/generate-output")
    public ResponseEntity<?> generateOutput(@RequestBody CodeExecutionRequest request) {
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

    @GetMapping("/providers")
    public ResponseEntity<?> getProviders() {
        return ResponseEntity.ok(Map.of(
                "primaryProvider", routerService.getPrimaryProviderName(),
                "providers", routerService.getProvidersInfo()
        ));
    }

    @PostMapping("/primary-provider")
    public ResponseEntity<?> setPrimaryProvider(@RequestBody Map<String, String> body) {
        String provider = body != null ? body.get("provider") : null;
        if (provider == null || provider.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Provider name is required"));
        }
        routerService.setPrimaryProvider(provider);
        return ResponseEntity.ok(Map.of(
                "message", "Primary compiler engine set to " + provider,
                "primaryProvider", routerService.getPrimaryProviderName()
        ));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record CodeExecutionRequest(String script, String stdin, String language) {
    }
}

