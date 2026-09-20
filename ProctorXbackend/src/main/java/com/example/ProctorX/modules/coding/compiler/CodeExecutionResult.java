package com.example.ProctorX.modules.coding.compiler;

public record CodeExecutionResult(
        String stdout,
        String output,
        String error,
        String statusCode,
        String cpuTime,
        String memory,
        String providerUsed,
        boolean success
) {
    public static CodeExecutionResult error(String providerUsed, String errorMessage, String statusCode) {
        return new CodeExecutionResult("", "", errorMessage, statusCode, "0", "0", providerUsed, false);
    }
}
