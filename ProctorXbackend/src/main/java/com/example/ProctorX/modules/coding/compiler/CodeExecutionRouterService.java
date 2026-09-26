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

    @Value("${code-execution.primary-provider:wasm-local}")
    private String primaryProviderName;

    @Value("${code-execution.fallback-enabled:true}")
    private boolean fallbackEnabled;

    private List<String> priorityChain = new ArrayList<>(List.of("wasm-local", "onecompiler", "jdoodle"));

    public CodeExecutionRouterService(List<CodeExecutionProvider> providers) {
        this.providers = providers;
    }

    public synchronized void setPrimaryProvider(String providerName) {
        if (providerName != null && !providerName.isBlank()) {
            String name = providerName.trim().toLowerCase();
            this.primaryProviderName = name;
            // Update priority chain to place this provider first
            List<String> newChain = new ArrayList<>(this.priorityChain);
            newChain.remove(name);
            newChain.add(0, name);
            this.priorityChain = newChain;
            log.info("Primary compiler provider dynamically set to: {}. Updated priority chain: {}", this.primaryProviderName, this.priorityChain);
        }
    }

    public synchronized void setPriorityChain(List<String> newChain) {
        if (newChain != null && !newChain.isEmpty()) {
            List<String> sanitized = new ArrayList<>();
            for (String p : newChain) {
                if (p != null && !p.isBlank()) {
                    String norm = p.trim().toLowerCase();
                    if (!sanitized.contains(norm)) {
                        sanitized.add(norm);
                    }
                }
            }
            // Ensure any known providers not in list are appended
            for (CodeExecutionProvider p : providers) {
                if (!sanitized.contains(p.getName().toLowerCase())) {
                    sanitized.add(p.getName().toLowerCase());
                }
            }
            this.priorityChain = sanitized;
            this.primaryProviderName = sanitized.get(0);
            log.info("Updated compiler priority chain to: {}", this.priorityChain);
        }
    }

    public synchronized List<String> getPriorityChain() {
        return new ArrayList<>(this.priorityChain);
    }

    public String getPrimaryProviderName() {
        return (this.priorityChain != null && !this.priorityChain.isEmpty())
                ? this.priorityChain.get(0)
                : this.primaryProviderName;
    }

    public List<Map<String, Object>> getProvidersInfo() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (CodeExecutionProvider p : providers) {
            String name = p.getName().toLowerCase();
            int rank = this.priorityChain.indexOf(name);
            list.add(Map.of(
                    "name", p.getName(),
                    "displayName", p.getDisplayName(),
                    "configured", p.isConfigured(),
                    "isServerExecutable", p.isServerExecutable(),
                    "isPrimary", rank == 0,
                    "priorityRank", rank >= 0 ? (rank + 1) : 99
            ));
        }
        return list;
    }

    public CodeExecutionResult executeDirect(String providerName, String script, String stdin, String language) throws Exception {
        if (script == null || script.isBlank()) {
            throw new IllegalArgumentException("Script code is required");
        }

        CodeExecutionProvider provider = providers.stream()
                .filter(p -> p.getName().equalsIgnoreCase(providerName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Compiler provider not found: " + providerName));

        if (!provider.isConfigured()) {
            throw new IllegalStateException("Compiler provider '" + providerName + "' is not configured.");
        }

        String normalizedStdin = normalizeInput(stdin);
        return provider.execute(script, normalizedStdin, language);
    }

    public CodeExecutionResult execute(String script, String stdin, String language) {
        if (script == null || script.isBlank()) {
            throw new IllegalArgumentException("Script code is required");
        }

        String normalizedStdin = normalizeInput(stdin);

        // 1. Filter only server-executable providers for backend requests
        List<CodeExecutionProvider> serverProviders = providers.stream()
                .filter(CodeExecutionProvider::isServerExecutable)
                .toList();

        // 2. Build execution chain ordered by priorityChain
        List<CodeExecutionProvider> executionChain = new ArrayList<>();
        for (String priorityEngine : this.priorityChain) {
            serverProviders.stream()
                    .filter(p -> p.getName().equalsIgnoreCase(priorityEngine) && p.isConfigured())
                    .findFirst()
                    .ifPresent(p -> {
                        if (!executionChain.contains(p)) {
                            executionChain.add(p);
                        }
                    });
        }

        // Add any remaining configured server providers
        for (CodeExecutionProvider p : serverProviders) {
            if (!executionChain.contains(p) && p.isConfigured()) {
                executionChain.add(p);
            }
        }

        if (executionChain.isEmpty()) {
            throw new IllegalStateException("No server code execution compiler engines are configured. Please check API keys.");
        }

        List<String> failureReasons = new ArrayList<>();

        for (int i = 0; i < executionChain.size(); i++) {
            CodeExecutionProvider provider = executionChain.get(i);
            boolean isFirst = (i == 0);

            try {
                log.info("Executing assessment via compiler engine: '{}' (rank={})", provider.getName(), (i + 1));
                CodeExecutionResult result = provider.execute(script, normalizedStdin, language);

                // If provider successfully returned output (even if candidate's code has syntax or runtime errors)
                log.info("Assessment successfully executed via engine: '{}'", provider.getName());
                return result;
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                log.warn("Compiler engine '{}' failed (Quota/Outage): {}. Cascading to next configured fallback.", provider.getName(), errorMsg);
                failureReasons.add(provider.getName() + " Provider Error: " + errorMsg);

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
