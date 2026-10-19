package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class BrowserWasmExecutionProvider implements CodeExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(BrowserWasmExecutionProvider.class);

    @Override
    public String getName() {
        return "wasm-local";
    }

    @Override
    public String getDisplayName() {
        return "Browser WASM Engine (Client-Side Toolchain)";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public boolean isServerExecutable() {
        // Runs in the candidate's browser via WebAssembly (Pyodide, CheerpJ+ECJ, Clang/WASM in Web Workers), not on the server JVM
        return false;
    }

    @Override
    public CodeExecutionResult execute(String script, String stdin, String language) throws Exception {
        return new CodeExecutionResult(
                "",
                "Browser WASM Engine executes locally in the client browser Web Worker sandbox.",
                "",
                "200",
                "0ms",
                "WASM-LOCAL",
                getName(),
                true
        );
    }
}
