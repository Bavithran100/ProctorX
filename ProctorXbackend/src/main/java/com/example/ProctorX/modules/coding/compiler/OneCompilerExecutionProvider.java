package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class OneCompilerExecutionProvider implements CodeExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(OneCompilerExecutionProvider.class);

    private final RestClient restClient;

    @Value("${code-execution.onecompiler.url:https://api.onecompiler.com/v1/run}")
    private String oneCompilerUrl;

    @Value("${code-execution.onecompiler.api-key:}")
    private String apiKey;

    public OneCompilerExecutionProvider() {
        this.restClient = RestClient.create();
    }

    @Override
    public String getName() {
        return "onecompiler";
    }

    @Override
    public String getDisplayName() {
        return "OneCompiler Engine";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public CodeExecutionResult execute(String script, String stdin, String language) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("OneCompiler API Key is not configured");
        }

        String targetLang = resolveLanguage(language);
        String fileName = resolveFileName(targetLang);

        Map<String, Object> fileObj = Map.of(
                "name", fileName,
                "content", script != null ? script : ""
        );

        String targetStdin = (stdin != null && !stdin.isEmpty()) ? stdin : "\n";

        Map<String, Object> requestBody = Map.of(
                "language", targetLang,
                "stdin", targetStdin,
                "files", List.of(fileObj)
        );

        Map<?, ?> response;
        try {
            response = restClient.post()
                    .uri(oneCompilerUrl)
                    .header("X-API-Key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);
        } catch (org.springframework.web.client.RestClientResponseException rre) {
            log.warn("OneCompiler API HTTP {} failure: {}", rre.getStatusCode(), rre.getResponseBodyAsString());
            throw new RuntimeException("OneCompiler API Error (HTTP " + rre.getStatusCode() + "): " + rre.getResponseBodyAsString(), rre);
        } catch (Exception ex) {
            log.warn("OneCompiler network/connection failure: {}", ex.getMessage());
            throw new RuntimeException("OneCompiler connection failed: " + ex.getMessage(), ex);
        }

        if (response == null) {
            throw new RuntimeException("Empty response received from OneCompiler");
        }

        String stdout = responseValue(response, "stdout", "");
        String stderr = responseValue(response, "stderr", "");
        String exception = responseValue(response, "exception", "");
        String status = responseValue(response, "status", "success");

        // Combine stderr and exception if both exist
        String fullError = "";
        if (!stderr.isBlank()) fullError = stderr;
        if (!exception.isBlank()) {
            fullError = fullError.isBlank() ? exception : fullError + "\n" + exception;
        }

        String output = !stdout.isBlank() ? stdout : fullError;
        String executionTime = responseValue(response, "executionTime", "0");
        String memoryUsed = responseValue(response, "memoryUsed", "0");
        boolean isCodeSuccess = "success".equalsIgnoreCase(status) && exception.isBlank();
        String statusCode = isCodeSuccess ? "200" : "400";

        return new CodeExecutionResult(
                stdout,
                output,
                fullError,
                statusCode,
                executionTime + "ms",
                memoryUsed + "KB",
                getName(),
                true
        );
    }

    private String resolveLanguage(String lang) {
        if (lang == null) return "java";
        String l = lang.trim().toLowerCase();
        if (l.contains("cpp") || l.contains("c++")) return "cpp";
        if (l.equals("c")) return "c";
        if (l.contains("python") || l.contains("py")) return "python";
        return "java";
    }

    private String resolveFileName(String lang) {
        return switch (lang) {
            case "java" -> "Main.java";
            case "cpp" -> "main.cpp";
            case "c" -> "main.c";
            case "python" -> "main.py";
            default -> "Main.java";
        };
    }

    private String responseValue(Map<?, ?> response, String key, String defaultValue) {
        if (response == null || response.get(key) == null) {
            return defaultValue;
        }
        return String.valueOf(response.get(key));
    }
}
