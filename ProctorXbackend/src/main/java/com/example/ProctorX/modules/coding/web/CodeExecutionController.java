package com.example.ProctorX.Controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/code-execution")
public class CodeExecutionController {

    private final RestClient restClient;

    @Value("${code-execution.jdoodle.url}")
    private String jdoodleUrl;

    @Value("${code-execution.jdoodle.client-id:}")
    private String clientId;

    @Value("${code-execution.jdoodle.client-secret:}")
    private String clientSecret;

    public CodeExecutionController() {
        this.restClient = RestClient.create();
    }

    @PostMapping("/generate-output")
    public ResponseEntity<?> generateOutput(@RequestBody CodeExecutionRequest request) {
        if (request == null || isBlank(request.script()) || isBlank(request.stdin())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Script and input are required"));
        }

        if (isBlank(clientId) || isBlank(clientSecret)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Code execution service is not configured"));
        }

        try {
            Map<String, String> providerRequest = Map.of(
                    "clientId", clientId,
                    "clientSecret", clientSecret,
                    "script", request.script(),
                    "stdin", request.stdin(),
                    "language", "java",
                    "versionIndex", "5"
            );

            Map<?, ?> response = restClient.post()
                    .uri(jdoodleUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(providerRequest)
                    .retrieve()
                    .body(Map.class);
            Map<String, String> result = new HashMap<>();
            result.put("stdout", responseValue(response, "stdout", responseValue(response, "output", "")));
            result.put("error", responseValue(response, "error", ""));

            return ResponseEntity.ok(result);
        } catch (Exception exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Unable to execute code"));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String responseValue(Map<?, ?> response, String key, String defaultValue) {
        if (response == null || response.get(key) == null) {
            return defaultValue;
        }
        return String.valueOf(response.get(key));
    }

    public record CodeExecutionRequest(String script, String stdin) {
    }
}
