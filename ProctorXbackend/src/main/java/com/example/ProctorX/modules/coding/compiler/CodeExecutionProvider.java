package com.example.ProctorX.modules.coding.compiler;

public interface CodeExecutionProvider {
    String getName();
    String getDisplayName();
    boolean isConfigured();
    default boolean isServerExecutable() {
        return true;
    }
    CodeExecutionResult execute(String script, String stdin, String language) throws Exception;
}
