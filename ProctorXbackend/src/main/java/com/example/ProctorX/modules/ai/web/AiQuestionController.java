package com.example.ProctorX.modules.ai.web;

import com.example.ProctorX.modules.adaptive.application.AdaptiveEngineService;
import com.example.ProctorX.modules.ai.application.AiQuestionService;
import com.example.ProctorX.modules.ai.dto.CodingPlanRequest;
import com.example.ProctorX.modules.ai.dto.McqGenerationRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class AiQuestionController {

    private final AiQuestionService aiQuestionService;
    private final AdaptiveEngineService adaptiveEngineService;
    private final com.example.ProctorX.Service.AuthService authService;

    @PostMapping("/generate-mcq")
    public ResponseEntity<?> generateMcq(@RequestBody McqGenerationRequest request, org.springframework.security.core.Authentication auth) {
        var user = authService.getCurrentUser(auth);
        if (user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
            return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        try {
            Map<String, Object> result = aiQuestionService.generateMcqQuestions(request);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "AI MCQ generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/coding-plan")
    public ResponseEntity<?> generateCodingPlan(@RequestBody CodingPlanRequest request, org.springframework.security.core.Authentication auth) {
        var user = authService.getCurrentUser(auth);
        if (user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
            return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        try {
            Map<String, Object> result = aiQuestionService.generateCodingPlan(request);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "AI coding plan generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/generate-single-coding-question")
    public ResponseEntity<?> generateSingleCodingQuestion(@RequestBody Map<String, Object> payload, org.springframework.security.core.Authentication auth) {
        var user = authService.getCurrentUser(auth);
        if (user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
            return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        try {
            Map<String, Object> params = new LinkedHashMap<>(payload);

            // Clean topic from composite string e.g. "ARRAYS_STRINGS (TWO_POINTERS)" -> "ARRAYS_STRINGS"
            String topic = (String) payload.getOrDefault("concept", payload.getOrDefault("topic", "ARRAYS_STRINGS"));
            if (topic != null && topic.contains(" (")) {
                topic = topic.substring(0, topic.indexOf(" (")).trim();
            }
            params.put("targetSkill", topic);

            if (payload.containsKey("pattern")) {
                params.put("pattern", payload.get("pattern"));
            }
            if (payload.containsKey("difficulty")) {
                params.put("difficulty", payload.get("difficulty"));
            }
            if (payload.containsKey("modality")) {
                params.put("modality", payload.get("modality"));
            }

            // Power question generation with exact same Adaptive Vector Engine
            Map<String, Object> adaptiveResult = adaptiveEngineService.testGenerateSingleAdaptiveQuestion(params);

            @SuppressWarnings("unchecked")
            Map<String, Object> qMap = (Map<String, Object>) adaptiveResult.get("question");

            if (qMap != null) {
                // Bridge canonicalSolution <-> referenceSolution compatibility
                if (!qMap.containsKey("referenceSolution") && qMap.containsKey("canonicalSolution")) {
                    qMap.put("referenceSolution", qMap.get("canonicalSolution"));
                }
                if (!qMap.containsKey("canonicalSolution") && qMap.containsKey("referenceSolution")) {
                    qMap.put("canonicalSolution", qMap.get("referenceSolution"));
                }
                return ResponseEntity.ok(Map.of(
                        "questions", List.of(qMap),
                        "question", qMap,
                        "status", "SUCCESS"
                ));
            }

            return ResponseEntity.ok(adaptiveResult);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Adaptive question generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/generate-coding-questions")
    public ResponseEntity<?> generateCodingQuestions(@RequestBody Map<String, Object> payload, org.springframework.security.core.Authentication auth) {
        var user = authService.getCurrentUser(auth);
        if (user.getRole() != com.example.ProctorX.Entity.AuthEntity.Role.ADMIN && Boolean.FALSE.equals(user.getApproved())) {
            return ResponseEntity.status(403).body(Map.of("message", "ACCOUNT_NOT_APPROVED"));
        }
        try {
            int count = payload.get("questionCount") instanceof Number n ? n.intValue() : 1;
            if (count <= 1) {
                return generateSingleCodingQuestion(payload, auth);
            }

            List<Map<String, Object>> aggregatedQuestions = new ArrayList<>();
            for (int i = 1; i <= count; i++) {
                Map<String, Object> singlePayload = new LinkedHashMap<>(payload);
                singlePayload.put("questionCount", i);
                ResponseEntity<?> singleRes = generateSingleCodingQuestion(singlePayload, auth);
                if (singleRes.getStatusCode().is2xxSuccessful() && singleRes.getBody() instanceof Map<?, ?> bodyMap) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> qList = (List<Map<String, Object>>) bodyMap.get("questions");
                    if (qList != null && !qList.isEmpty()) {
                        aggregatedQuestions.addAll(qList);
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "questions", aggregatedQuestions,
                    "status", "SUCCESS"
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Adaptive coding questions generation failed: " + e.getMessage()));
        }
    }
}
