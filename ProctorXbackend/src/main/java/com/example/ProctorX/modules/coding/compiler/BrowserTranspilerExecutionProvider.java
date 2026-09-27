package com.example.ProctorX.modules.coding.compiler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class BrowserTranspilerExecutionProvider implements CodeExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(BrowserTranspilerExecutionProvider.class);

    @Override
    public String getName() {
        return "transpiler-local";
    }

    @Override
    public String getDisplayName() {
        return "Browser JS Transpiler Engine (Client-Side - 1ms)";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public boolean isServerExecutable() {
        // Runs in the candidate's browser via high-speed JavaScript AST transpiler, not on the server JVM
        return false;
    }

    @Override
    public CodeExecutionResult execute(String script, String stdin, String language) throws Exception {
        return new CodeExecutionResult(
                "",
                "Browser JS Transpiler engine executes locally in the client browser.",
                "",
                "200",
                "0ms",
                "TRANSPILER-LOCAL-JS",
                getName(),
                true
        );
    }
}
