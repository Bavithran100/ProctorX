package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CodeExecutionRouterService {

    private static final Logger log = LoggerFactory.getLogger(CodeExecutionRouterService.class);

    private final List<CodeExecutionProvider> providers;

    @Value("${code-execution.primary-provider:jdoodle}")
    private String primaryProviderName;

    @Value("${code-execution.fallback-enabled:true}")
    private boolean fallbackEnabled;

    public CodeExecutionRouterService(List<CodeExecutionProvider> providers) {
        this.providers = providers;
    }

    public synchronized void setPrimaryProvider(String providerName) {
        if (providerName != null && !providerName.isBlank()) {
            this.primaryProviderName = providerName.trim().toLowerCase();
            log.info("Primary compiler provider dynamically set to: {}", this.primaryProviderName);
        }
    }

    public String getPrimaryProviderName() {
        return this.primaryProviderName;
    }

    public List<Map<String, Object>> getProvidersInfo() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (CodeExecutionProvider p : providers) {
            list.add(Map.of(
                    "name", p.getName(),
                    "displayName", p.getDisplayName(),
                    "configured", p.isConfigured(),
                    "isPrimary", p.getName().equalsIgnoreCase(this.primaryProviderName)
            ));
        }
        return list;
    }

    public CodeExecutionResult execute(String script, String stdin, String language) {
        if (script == null || script.isBlank()) {
            throw new IllegalArgumentException("Script code is required");
        }

        String normalizedStdin = normalizeInput(stdin);

        // 1. Build prioritized execution chain: Primary provider first, followed by fallbacks
        List<CodeExecutionProvider> executionChain = new ArrayList<>();

        Optional<CodeExecutionProvider> primary = providers.stream()
                .filter(p -> p.getName().equalsIgnoreCase(primaryProviderName))
                .findFirst();

        primary.ifPresent(executionChain::add);

        if (fallbackEnabled) {
            for (CodeExecutionProvider p : providers) {
                if (!executionChain.contains(p) && p.isConfigured()) {
                    executionChain.add(p);
                }
            }
        }

        if (executionChain.isEmpty()) {
            // If primary was not configured or not found, try any configured provider
            for (CodeExecutionProvider p : providers) {
                if (p.isConfigured()) {
                    executionChain.add(p);
                }
            }
        }

        if (executionChain.isEmpty()) {
            throw new IllegalStateException("No code execution compiler engines are configured. Please check API keys.");
        }

        List<String> failureReasons = new ArrayList<>();

        for (int i = 0; i < executionChain.size(); i++) {
            CodeExecutionProvider provider = executionChain.get(i);
            boolean isPrimary = (i == 0);

            if (!provider.isConfigured()) {
                log.warn("Compiler provider '{}' is not configured, skipping", provider.getName());
                continue;
            }

            try {
                log.info("Executing code assessment via engine: '{}' (isPrimary={})", provider.getName(), isPrimary);
                CodeExecutionResult result = provider.execute(script, normalizedStdin, language);

                if (result.success()) {
                    return result;
                } else if (!fallbackEnabled) {
                    return result;
                } else {
                    failureReasons.add(provider.getName() + ": Status " + result.statusCode() + " - " + result.error());
                }
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                log.warn("Compiler provider '{}' failed with error: {}. Falling back to next available engine.", provider.getName(), errorMsg);
                failureReasons.add(provider.getName() + " Error: " + errorMsg);

                if (!fallbackEnabled) {
                    throw new RuntimeException("Code execution failed on " + provider.getName() + ": " + errorMsg, e);
                }
            }
        }

        throw new RuntimeException("All compiler execution engines failed: " + String.join(" | ", failureReasons));
    }

    private String normalizeInput(String raw) {
        if (raw == null) return "";
        return raw.replace("\\r\\n", "\n")
                  .replace("\\n", "\n")
                  .replace("\\t", "\t");
    }
}
