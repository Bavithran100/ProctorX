package com.example.ProctorX.modules.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CodingQuestionsGenerationRequest(
        String topic,
        Integer questionCount,
        String difficulty,
        String targetComplexity,
        String constraints,
        String testCaseFocus,
        String additionalInstructions
) {
}
