package com.example.ProctorX.modules.ai.application;

import com.example.ProctorX.modules.ai.dto.CodingPlanRequest;
import com.example.ProctorX.modules.ai.dto.CodingQuestionsGenerationRequest;
import com.example.ProctorX.modules.ai.dto.McqGenerationRequest;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiQuestionService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.groq.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqUrl;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    @Value("${ai.groq.model.mcq:openai/gpt-oss-120b}")
    private String mcqModel;

    @Value("${ai.groq.model.coding:openai/gpt-oss-120b}")
    private String codingModel;

    public AiQuestionService(ObjectMapper objectMapper) {
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    private static final String MCQ_SYSTEM_PROMPT = """
            You are an exam question generator AI for an online proctoring system.

            Rules:
            - Generate ONLY multiple choice questions (MCQs)
            - Each question must have exactly 4 options: A, B, C, D
            - Clearly mention the correct option (A/B/C/D)
            - Questions must be exam-oriented
            - No explanations
            - Output MUST be valid JSON

            JSON format:
            {
              "questions": [
                {
                  "questionText": "",
                  "optionA": "",
                  "optionB": "",
                  "optionC": "",
                  "optionD": "",
                  "correctOption": "A",
                  "marks": 1
                }
              ]
            }
            """;

    private static final String CODING_PLAN_SYSTEM_PROMPT = """
            You are an academic coding-exam planner for CSE students.

            Turn the coordinator's brief into a practical plan for Java coding questions.
            Choose appropriate difficulty, algorithms, constraints,
            and edge-case coverage for the stated student level. Aim for correct, efficient,
            and assessable questions.

            Return ONLY valid JSON in this exact format:
            {
              "topic": "",
              "questionCount": 5,
              "difficulty": "EASY",
              "targetComplexity": "",
              "constraints": "",
              "testCaseFocus": "",
              "additionalInstructions": ""
            }

            Use difficulty only as EASY, MEDIUM, HARD, or MIXED.
            """;

    private static final String CODING_QUESTIONS_SYSTEM_PROMPT = """
            You are an expert programming exam generator.

            Your task is to generate coding interview/exam questions and their reference solutions.

            IMPORTANT:
            Return ONLY valid JSON.
            Do NOT use markdown.
            Do NOT include explanations outside the JSON.

            ========================
            QUESTION RULES
            ========================

            Generate realistic coding interview questions.

            Each question must contain:

            - title
            - description
            - difficulty
            - allowedLanguage
            - referenceSolution

            Do NOT generate:
            - test cases
            - expected outputs
            - hints
            - explanations

            ========================
            REFERENCE SOLUTION RULES
            ========================

            The reference solution MUST be a complete runnable Java program.

            The class name MUST be:

            public class Main

            The solution MUST ALWAYS contain:

            import java.util.*;

            public class Main {
                public static void main(String[] args) {
                    Scanner sc = new Scanner(System.in);

                    // solution

                    sc.close();
                }
            }

            The reference solution MUST:

            ✓ Use Scanner for ALL input.
            ✓ Read input from System.in only.
            ✓ Print answers using System.out.print or System.out.println.
            ✓ Be directly compilable.
            ✓ Be directly executable.
            ✓ Have exactly one public class named Main.

            ========================
            STRICTLY FORBIDDEN
            ========================

            NEVER generate or import:

            org.junit.*
            junit.*
            @Test
            Assertions
            assertEquals
            assertTrue
            assertFalse
            Mockito
            Spring Boot
            JUnit
            TestNG
            Maven
            Gradle
            Packages other than java.util.*, java.io.*, java.math.*, java.lang.*

            Do NOT create:

            test methods
            helper test classes
            unit tests
            mock tests
            sample tests

            Never generate:

            public class Solution

            Always generate:

            public class Main

            JSON format:
            {
              "questions": [
                {
                  "title": "",
                  "description": "",
                  "difficulty": "EASY",
                  "allowedLanguage": "JAVA",
                  "referenceSolution": ""
                }
              ]
            }
            """;

    public Map<String, Object> generateMcqQuestions(McqGenerationRequest request) {
        ensureApiKeyConfigured();

        int count = request.count() != null ? request.count() : 5;
        String topic = request.topic() != null ? request.topic() : "General Computer Science";

        Map<String, Object> requestBody = Map.of(
                "model", mcqModel,
                "messages", List.of(
                        Map.of("role", "system", "content", MCQ_SYSTEM_PROMPT),
                        Map.of("role", "user", "content", "Generate " + count + " MCQ questions on " + topic)
                ),
                "temperature", 0.4,
                "response_format", Map.of("type", "json_object")
        );

        String content = callGroqChat(requestBody);
        return parseJsonObject(content);
    }

    public Map<String, Object> generateCodingPlan(CodingPlanRequest request) {
        ensureApiKeyConfigured();

        int count = request.questionCount() != null ? request.questionCount() : 1;
        String prompt = request.prompt() != null ? request.prompt() : "Coding assessment";

        Map<String, Object> requestBody = Map.of(
                "model", codingModel,
                "messages", List.of(
                        Map.of("role", "system", "content", CODING_PLAN_SYSTEM_PROMPT),
                        Map.of("role", "user", "content", prompt + "\n\nThis exam must contain exactly " + count + " coding questions. Return that exact value in questionCount.")
                ),
                "temperature", 0.3
        );

        String content = callGroqChat(requestBody);
        Map<String, Object> parsed = parseJsonObject(content);

        // Ensure defaults if missing
        Map<String, Object> result = new HashMap<>();
        result.put("topic", parsed.getOrDefault("topic", prompt));
        result.put("questionCount", count);
        result.put("difficulty", parsed.getOrDefault("difficulty", "MEDIUM"));
        result.put("targetComplexity", parsed.getOrDefault("targetComplexity", ""));
        result.put("constraints", parsed.getOrDefault("constraints", ""));
        result.put("testCaseFocus", parsed.getOrDefault("testCaseFocus", ""));
        result.put("additionalInstructions", parsed.getOrDefault("additionalInstructions", ""));
        return result;
    }

    public Map<String, Object> generateCodingQuestions(CodingQuestionsGenerationRequest request) {
        ensureApiKeyConfigured();

        int count = request.questionCount() != null ? request.questionCount() : 1;
        String userContent = String.format(
                "Generate %d coding questions using this planning brief:\n" +
                        "Topic: %s\n" +
                        "Difficulty: %s\n" +
                        "Target complexity: %s\n" +
                        "Input constraints: %s\n" +
                        "Test-case focus: %s\n" +
                        "Additional instructions: %s\n" +
                        "Return exactly %d questions. Keep each reference solution correct, efficient, and compatible with Java class Main.",
                count,
                request.topic() != null ? request.topic() : "General",
                request.difficulty() != null ? request.difficulty() : "EASY",
                request.targetComplexity() != null ? request.targetComplexity() : "Choose an appropriate efficient complexity",
                request.constraints() != null ? request.constraints() : "Define realistic constraints",
                request.testCaseFocus() != null ? request.testCaseFocus() : "Cover normal, boundary, and edge cases",
                request.additionalInstructions() != null ? request.additionalInstructions() : "None",
                count
        );

        Map<String, Object> requestBody = Map.of(
                "model", codingModel,
                "messages", List.of(
                        Map.of("role", "system", "content", CODING_QUESTIONS_SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userContent)
                ),
                "temperature", 0.4
        );

        String content = callGroqChat(requestBody);
        return parseJsonObject(content);
    }

    private void ensureApiKeyConfigured() {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("AI service is not configured. Please provide GROQ_API_KEY.");
        }
    }

    @SuppressWarnings("unchecked")
    private String callGroqChat(Map<String, Object> requestBody) {
        try {
            Map<?, ?> response = restClient.post()
                    .uri(groqUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !response.containsKey("choices")) {
                throw new RuntimeException("Empty response from AI service");
            }

            List<Map<?, ?>> choices = (List<Map<?, ?>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new RuntimeException("No completion choices returned by AI service");
            }

            Map<?, ?> message = (Map<?, ?>) choices.get(0).get("message");
            if (message == null || !message.containsKey("content")) {
                throw new RuntimeException("No message content in AI completion");
            }

            String content = String.valueOf(message.get("content"));
            return cleanJsonMarkdown(content);
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Groq AI service: " + e.getMessage(), e);
        }
    }

    private String cleanJsonMarkdown(String raw) {
        if (raw == null) return "{}";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonObject(String json) {
        try {
            String trimmed = json != null ? json.trim() : "{}";
            if (trimmed.startsWith("[")) {
                List<?> list = objectMapper.readValue(trimmed, List.class);
                return Map.of("questions", list);
            }
            return objectMapper.readValue(trimmed, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI response as JSON: " + json, e);
        }
    }
}
