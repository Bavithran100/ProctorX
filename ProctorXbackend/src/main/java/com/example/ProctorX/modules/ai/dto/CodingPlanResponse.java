package com.example.ProctorX.modules.ai.dto;

public record CodingPlanResponse(
        String topic,
        Integer questionCount,
        String difficulty,
        String targetComplexity,
        String constraints,
        String testCaseFocus,
        String additionalInstructions
) {
}
