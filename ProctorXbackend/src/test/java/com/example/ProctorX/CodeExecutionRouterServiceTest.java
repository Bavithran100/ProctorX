package com.example.ProctorX;

import com.example.ProctorX.modules.coding.compiler.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CodeExecutionRouterServiceTest {

    private BrowserWasmExecutionProvider wasmProvider;

    @BeforeEach
    void setUp() {
        wasmProvider = new BrowserWasmExecutionProvider();
    }

    @Test
    void testBrowserWasmIsNotServerExecutable() {
        assertFalse(wasmProvider.isServerExecutable());
        assertTrue(wasmProvider.isConfigured());
        assertEquals("wasm-local", wasmProvider.getName());
    }

    @Test
    void testRouterBypassesClientWasmOnServer() {
        CodeExecutionProvider mockServerProvider = new CodeExecutionProvider() {
            @Override
            public String getName() { return "mock-server"; }
            @Override
            public String getDisplayName() { return "Mock Server"; }
            @Override
            public boolean isConfigured() { return true; }
            @Override
            public boolean isServerExecutable() { return true; }
            @Override
            public CodeExecutionResult execute(String script, String stdin, String language) {
                return new CodeExecutionResult("Output OK", "Output OK", "", "200", "5ms", "1MB", "mock-server", true);
            }
        };

        CodeExecutionRouterService router = new CodeExecutionRouterService(List.of(wasmProvider, mockServerProvider));
        router.setPrimaryProvider("wasm-local");

        CodeExecutionResult result = router.execute("public class Main {}", "", "java");
        assertNotNull(result);
        assertTrue(result.success());
        assertEquals("mock-server", result.providerUsed());
    }
}
