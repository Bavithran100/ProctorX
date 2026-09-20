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

    @Value("${code-execution.primary-provider:onecompiler}")
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
                    "isServerExecutable", p.isServerExecutable(),
                    "isPrimary", p.getName().equalsIgnoreCase(this.primaryProviderName)
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

        // 1. Filter only server-executable providers for backend requests (exclude client-only browser WASM)
        List<CodeExecutionProvider> serverProviders = providers.stream()
                .filter(CodeExecutionProvider::isServerExecutable)
                .toList();

        List<CodeExecutionProvider> executionChain = new ArrayList<>();

        // 2. Select primary server provider
        Optional<CodeExecutionProvider> primary = serverProviders.stream()
                .filter(p -> p.getName().equalsIgnoreCase(primaryProviderName) && p.isConfigured())
                .findFirst();

        // If configured primary was wasm-local or not a server provider, pick OneCompiler (or first configured server provider)
        if (primary.isEmpty()) {
            primary = serverProviders.stream()
                    .filter(p -> p.getName().equalsIgnoreCase("onecompiler") && p.isConfigured())
                    .findFirst()
                    .or(() -> serverProviders.stream().filter(CodeExecutionProvider::isConfigured).findFirst());
        }

        primary.ifPresent(executionChain::add);

        // 3. Add fallbacks
        if (fallbackEnabled) {
            for (CodeExecutionProvider p : serverProviders) {
                if (!executionChain.contains(p) && p.isConfigured()) {
                    executionChain.add(p);
                }
            }
        }

        if (executionChain.isEmpty()) {
            throw new IllegalStateException("No server code execution compiler engines are configured. Please check API keys.");
        }

        List<String> failureReasons = new ArrayList<>();

        for (int i = 0; i < executionChain.size(); i++) {
            CodeExecutionProvider provider = executionChain.get(i);
            boolean isPrimary = (i == 0);

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
