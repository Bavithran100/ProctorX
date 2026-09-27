package com.example.ProctorX;

import com.example.ProctorX.modules.coding.compiler.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CodeExecutionRouterServiceTest {

    private BrowserWasmExecutionProvider wasmProvider;
    private BrowserTranspilerExecutionProvider transpilerProvider;

    @BeforeEach
    void setUp() {
        wasmProvider = new BrowserWasmExecutionProvider();
        transpilerProvider = new BrowserTranspilerExecutionProvider();
    }

    @Test
    void testClientProvidersAreNotServerExecutable() {
        assertFalse(wasmProvider.isServerExecutable());
        assertTrue(wasmProvider.isConfigured());
        assertEquals("wasm-local", wasmProvider.getName());

        assertFalse(transpilerProvider.isServerExecutable());
        assertTrue(transpilerProvider.isConfigured());
        assertEquals("transpiler-local", transpilerProvider.getName());
    }

    @Test
    void testRouterBypassesClientTranspilerAndWasmOnServer() {
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

        CodeExecutionRouterService router = new CodeExecutionRouterService(List.of(wasmProvider, transpilerProvider, mockServerProvider));
        router.setPrimaryProvider("wasm-local");

        CodeExecutionResult result = router.execute("public class Main {}", "", "java");
        assertNotNull(result);
        assertTrue(result.success());
        assertEquals("mock-server", result.providerUsed());
    }

    @Test
    void testPriorityChainOrder() {
        CodeExecutionProvider mock1 = new CodeExecutionProvider() {
            @Override public String getName() { return "onecompiler"; }
            @Override public String getDisplayName() { return "OneCompiler"; }
            @Override public boolean isConfigured() { return true; }
            @Override public boolean isServerExecutable() { return true; }
            @Override public CodeExecutionResult execute(String s, String i, String l) { return new CodeExecutionResult("OC", "OC", "", "200", "1ms", "1MB", "onecompiler", true); }
        };
        CodeExecutionProvider mock2 = new CodeExecutionProvider() {
            @Override public String getName() { return "jdoodle"; }
            @Override public String getDisplayName() { return "JDoodle"; }
            @Override public boolean isConfigured() { return true; }
            @Override public boolean isServerExecutable() { return true; }
            @Override public CodeExecutionResult execute(String s, String i, String l) { return new CodeExecutionResult("JD", "JD", "", "200", "1ms", "1MB", "jdoodle", true); }
        };

        CodeExecutionRouterService router = new CodeExecutionRouterService(List.of(wasmProvider, transpilerProvider, mock1, mock2));
        router.setPriorityChain(List.of("jdoodle", "wasm-local", "onecompiler", "transpiler-local"));

        assertEquals(List.of("jdoodle", "wasm-local", "onecompiler", "transpiler-local"), router.getPriorityChain());
        assertEquals("jdoodle", router.getPrimaryProviderName());

        CodeExecutionResult res = router.execute("print(1)", "", "python");
        assertEquals("jdoodle", res.providerUsed());
    }
}
