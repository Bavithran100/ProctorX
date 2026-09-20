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

import java.util.ArrayList;
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
            You are a senior competitive programming author and technical exam creator.

            Your task is to generate premium, assessable coding exam problems, robust reference solutions, and comprehensive test case suites.

            IMPORTANT:
            - Return ONLY valid JSON.
            - Do NOT wrap JSON with markdown fences outside the JSON string.
            - Do NOT include any conversation or explanation outside the JSON.

            ==================================================
            PROBLEM DESCRIPTION STRUCTURE (Markdown in 'description')
            ==================================================
            Each problem's 'description' MUST be formatted in clear, structured Markdown containing:

            ### Problem Statement
            Clear narrative describing the task, real-world context if relevant, and objective.

            ### Input Format
            Explicit line-by-line description of how standard input (stdin) is provided.
            - Format multi-line input clearly:
              * Line 1: Description of first line input (e.g., Integer N, or String s1).
              * Line 2: Description of second line input (e.g., N space-separated integers, or String s2).
              * Subsequent lines: Query/Target details if applicable.
            - If reading strings: Specify whether lines can be empty, contain spaces, or have leading/trailing whitespace.

            ### Output Format
            Explicit description of what to print to standard output (stdout).
            - Specify exact formatting: e.g., single integer, space-separated values, or each value on a new line.

            ### Constraints
            Numerical bounds on inputs (e.g., 1 <= N <= 10^5, -10^9 <= A[i] <= 10^9, length of string <= 1000).

            ### Sample Input 1
            Exact input formatted line by line.

            ### Sample Output 1
            Exact expected output.

            ### Explanation
            Step-by-step walkthrough explaining how Sample 1 yields Sample Output 1.

            ### Input Reading Instructions
            Provide concise guidance across languages:
            - Java: Use Scanner (e.g., sc.next(), sc.nextLine(), sc.nextInt()) or BufferedReader.
            - Python: Use input() or sys.stdin.read().split().
            - C++: Use cin >> var or getline(cin, str).
            - C: Use scanf() or fgets().

            ==================================================
            TEST CASES RULES (4 Test Cases per Problem)
            ==================================================
            Each question MUST include an array named "testCases" with exactly 4 valid, verified test cases:
            1. Case 1 (sample = true): Standard visible example matching Sample 1.
            2. Case 2 (sample = true): Visible boundary/edge case (e.g., minimum constraint, single element, negative numbers, empty or 1-character string).
            3. Case 3 (sample = false): Hidden comprehensive evaluation case with multi-line or maximum constraint inputs.
            4. Case 4 (sample = false): Hidden corner case (e.g., duplicate values, zeroes, sorted/reversed order, special characters).

            CRITICAL TEST CASE INPUT & OUTPUT FORMAT RULES:
            - Multi-line inputs: Separate lines strictly with '\\n' (e.g. "Line1\\nLine2\\nLine3").
            - Multi-line strings / String concatenation: If the problem asks for two strings on separate lines, input MUST be "first_string\\nsecond_string".
            - Expected Output: Must be the EXACT output produced by the reference solution for that input. Trim trailing spaces on each line.
            - Do NOT leave test cases with empty or null expectedOutput.

            ==================================================
            REFERENCE SOLUTION RULES
            ==================================================
            The reference solution MUST be a complete runnable Java program:
            - Class name MUST be: public class Main
            - Import: import java.util.*; import java.io.*;
            - Use safe input reading to prevent NoSuchElementException / NullPointerException.
            - Print final answers to System.out.println() or System.out.print().
            - Must directly compile with standard JDK 17 without third-party libraries.

            ==================================================
            JSON FORMAT SCHEMA
            ==================================================
            {
              "questions": [
                {
                  "title": "Two Sum Target Index",
                  "description": "### Problem Statement\\nGiven an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\\n\\n### Input Format\\nLine 1: An integer N representing the number of elements.\\nLine 2: N space-separated integers.\\nLine 3: An integer target.\\n\\n### Output Format\\nPrint the two zero-based indices separated by a space.\\n\\n### Constraints\\n2 <= N <= 10^5\\n-10^9 <= nums[i] <= 10^9\\n\\n### Sample Input 1\\n4\\n2 7 11 15\\n9\\n\\n### Sample Output 1\\n0 1\\n\\n### Explanation\\nnums[0] + nums[1] = 2 + 7 = 9.\\n\\n### Input Reading Instructions\\nRead N using sc.nextInt(), the array elements in a loop, and target with sc.nextInt().",
                  "difficulty": "EASY",
                  "allowedLanguage": "JAVA",
                  "referenceSolution": "import java.util.*;\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        if (!sc.hasNextInt()) return;\\n        int n = sc.nextInt();\\n        long[] arr = new long[n];\\n        for (int i = 0; i < n; i++) {\\n            arr[i] = sc.nextLong();\\n        }\\n        long target = sc.nextLong();\\n        Map<Long, Integer> map = new HashMap<>();\\n        for (int i = 0; i < n; i++) {\\n            long complement = target - arr[i];\\n            if (map.containsKey(complement)) {\\n                System.out.println(map.get(complement) + \\" \\" + i);\\n                sc.close();\\n                return;\\n            }\\n            map.put(arr[i], i);\\n        }\\n        sc.close();\\n    }\\n}",
                  "testCases": [
                    {
                      "input": "4\\n2 7 11 15\\n9",
                      "expectedOutput": "0 1",
                      "sample": true
                    },
                    {
                      "input": "3\\n3 2 4\\n6",
                      "expectedOutput": "1 2",
                      "sample": true
                    },
                    {
                      "input": "2\\n3 3\\n6",
                      "expectedOutput": "0 1",
                      "sample": false
                    },
                    {
                      "input": "5\\n1 5 3 7 9\\n12",
                      "expectedOutput": "1 3",
                      "sample": false
                    }
                  ]
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
                "temperature", 0.3,
                "response_format", Map.of("type", "json_object")
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
                        "Return exactly %d questions. Escape all newlines in strings as \\n. Keep each reference solution correct, efficient, and compatible with Java class Main.",
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
                "temperature", 0.4,
                "response_format", Map.of("type", "json_object")
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

        // Strip markdown code block fences if present
        if (cleaned.contains("```json")) {
            int start = cleaned.indexOf("```json") + 7;
            int end = cleaned.lastIndexOf("```");
            if (end > start) {
                cleaned = cleaned.substring(start, end).trim();
            }
        } else if (cleaned.contains("```")) {
            int start = cleaned.indexOf("```") + 3;
            int end = cleaned.lastIndexOf("```");
            if (end > start) {
                cleaned = cleaned.substring(start, end).trim();
            }
        }

        // Find outer boundary of JSON object or array
        int firstBrace = cleaned.indexOf('{');
        int firstBracket = cleaned.indexOf('[');
        int startIdx = -1;
        int endIdx = -1;

        if (firstBrace != -1 && (firstBracket == -1 || firstBrace < firstBracket)) {
            startIdx = firstBrace;
            endIdx = cleaned.lastIndexOf('}');
        } else if (firstBracket != -1) {
            startIdx = firstBracket;
            endIdx = cleaned.lastIndexOf(']');
        }

        if (startIdx != -1 && endIdx > startIdx) {
            cleaned = cleaned.substring(startIdx, endIdx + 1).trim();
        }

        return cleaned;
    }

    private String sanitizeJsonString(String json) {
        if (json == null) return "{}";
        StringBuilder sb = new StringBuilder();
        boolean inString = false;
        boolean isEscaped = false;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);

            if (inString) {
                if (isEscaped) {
                    sb.append(c);
                    isEscaped = false;
                } else if (c == '\\') {
                    sb.append(c);
                    isEscaped = true;
                } else if (c == '"') {
                    sb.append(c);
                    inString = false;
                } else if (c == '\n') {
                    sb.append("\\n");
                } else if (c == '\r') {
                    sb.append("\\r");
                } else if (c == '\t') {
                    sb.append("\\t");
                } else if (c < 32) {
                    sb.append(String.format("\\u%04x", (int) c));
                } else {
                    sb.append(c);
                }
            } else {
                if (c == '"') {
                    inString = true;
                }
                sb.append(c);
            }
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonObject(String json) {
        String cleaned = cleanJsonMarkdown(json);
        try {
            if (cleaned.startsWith("[")) {
                List<?> list = objectMapper.readValue(cleaned, List.class);
                return normalizeParsedResult(Map.of("questions", list));
            }
            Map<String, Object> parsed = objectMapper.readValue(cleaned, Map.class);
            return normalizeParsedResult(parsed);
        } catch (Exception firstErr) {
            try {
                // Retry with control-character sanitized JSON
                String sanitized = sanitizeJsonString(cleaned);
                if (sanitized.startsWith("[")) {
                    List<?> list = objectMapper.readValue(sanitized, List.class);
                    return normalizeParsedResult(Map.of("questions", list));
                }
                Map<String, Object> parsed = objectMapper.readValue(sanitized, Map.class);
                return normalizeParsedResult(parsed);
            } catch (Exception secondErr) {
                throw new RuntimeException("Failed to parse AI response as JSON: " + json, firstErr);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalizeParsedResult(Map<String, Object> map) {
        if (map == null) return new HashMap<>();
        Map<String, Object> normalized = new HashMap<>(map);
        if (normalized.containsKey("questions") && normalized.get("questions") instanceof List<?> list) {
            List<Object> normalizedList = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> qMap) {
                    Map<String, Object> normQ = new HashMap<>((Map<String, Object>) qMap);
                    if (normQ.get("testCases") instanceof List<?> tcList) {
                        List<Object> normTcList = new ArrayList<>();
                        for (Object tcObj : tcList) {
                            if (tcObj instanceof Map<?, ?> tcMap) {
                                Map<String, Object> normTc = new HashMap<>((Map<String, Object>) tcMap);
                                if (normTc.get("input") instanceof String inp) {
                                    normTc.put("input", unescapeString(inp));
                                }
                                if (normTc.get("expectedOutput") instanceof String exp) {
                                    normTc.put("expectedOutput", unescapeString(exp));
                                }
                                if (normTc.get("output") instanceof String out) {
                                    normTc.put("output", unescapeString(out));
                                }
                                normTcList.add(normTc);
                            } else {
                                normTcList.add(tcObj);
                            }
                        }
                        normQ.put("testCases", normTcList);
                    }
                    normalizedList.add(normQ);
                } else {
                    normalizedList.add(item);
                }
            }
            normalized.put("questions", normalizedList);
        }
        return normalized;
    }

    private String unescapeString(String str) {
        if (str == null) return "";
        return str.replace("\\r\\n", "\n")
                  .replace("\\n", "\n")
                  .replace("\\t", "\t");
    }
}
