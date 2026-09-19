package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class JdoodleExecutionProvider implements CodeExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(JdoodleExecutionProvider.class);

    private final RestClient restClient;

    @Value("${code-execution.jdoodle.url:https://api.jdoodle.com/v1/execute}")
    private String jdoodleUrl;

    @Value("${code-execution.jdoodle.client-id:}")
    private String clientId;

    @Value("${code-execution.jdoodle.client-secret:}")
    private String clientSecret;

    public JdoodleExecutionProvider() {
        this.restClient = RestClient.create();
    }

    @Override
    public String getName() {
        return "jdoodle";
    }

    @Override
    public String getDisplayName() {
        return "JDoodle Compiler";
    }

    @Override
    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    @Override
    public CodeExecutionResult execute(String script, String stdin, String language) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("JDoodle credentials are not configured");
        }

        String jdoodleLang = resolveJdoodleLanguage(language);
        String versionIndex = resolveJdoodleVersion(jdoodleLang);

        Map<String, String> providerRequest = Map.of(
                "clientId", clientId,
                "clientSecret", clientSecret,
                "script", script != null ? script : "",
                "stdin", stdin != null ? stdin : "",
                "language", jdoodleLang,
                "versionIndex", versionIndex
        );

        Map<?, ?> response = restClient.post()
                .uri(jdoodleUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(providerRequest)
                .retrieve()
                .body(Map.class);

        String output = responseValue(response, "output", "");
        String error = cleanStderr(responseValue(response, "error", ""));
        String stdout = responseValue(response, "stdout", output);
        String statusCode = responseValue(response, "statusCode", "200");
        String cpuTime = responseValue(response, "cpuTime", "0");
        String memory = responseValue(response, "memory", "0");

        // Check if JDoodle returned 429 or daily limit error in payload
        if ("429".equals(statusCode) || output.contains("Daily limit reached") || error.contains("Daily limit reached")) {
            log.warn("JDoodle daily limit reached (429)");
            throw new RuntimeException("JDoodle Daily Limit Reached (429)");
        }

        return new CodeExecutionResult(
                stdout,
                output,
                error,
                statusCode,
                cpuTime,
                memory,
                getName(),
                true
        );
    }

    private String resolveJdoodleLanguage(String lang) {
        if (lang == null) return "java";
        String l = lang.trim().toLowerCase();
        if (l.contains("cpp") || l.contains("c++")) return "cpp17";
        if (l.equals("c")) return "c";
        if (l.contains("python") || l.contains("py")) return "python3";
        return "java";
    }

    private String resolveJdoodleVersion(String jdoodleLang) {
        return switch (jdoodleLang) {
            case "cpp17" -> "1";
            case "c" -> "5";
            case "python3" -> "4";
            default -> "5"; // java
        };
    }

    private String cleanStderr(String error) {
        if (error == null || error.isBlank()) return "";
        return error.lines()
                .filter(line -> !line.startsWith("Picked up _JAVA_OPTIONS") &&
                                !line.startsWith("Picked up JAVA_TOOL_OPTIONS") &&
                                !line.contains("Picked up _JAVA_OPTIONS") &&
                                !line.contains("Picked up JAVA_TOOL_OPTIONS"))
                .reduce((a, b) -> a + "\n" + b)
                .orElse("")
                .trim();
    }

    private String responseValue(Map<?, ?> response, String key, String defaultValue) {
        if (response == null || response.get(key) == null) {
            return defaultValue;
        }
        return String.valueOf(response.get(key));
    }
}
