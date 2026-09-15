package com.example.ProctorX.modules.ai.web;

import com.example.ProctorX.modules.ai.application.AiQuestionService;
import com.example.ProctorX.modules.ai.dto.CodingPlanRequest;
import com.example.ProctorX.modules.ai.dto.CodingQuestionsGenerationRequest;
import com.example.ProctorX.modules.ai.dto.McqGenerationRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class AiQuestionController {

    private final AiQuestionService aiQuestionService;

    @PostMapping("/generate-mcq")
    public ResponseEntity<?> generateMcq(@RequestBody McqGenerationRequest request) {
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
    public ResponseEntity<?> generateCodingPlan(@RequestBody CodingPlanRequest request) {
        try {
            Map<String, Object> result = aiQuestionService.generateCodingPlan(request);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "AI coding plan generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/generate-coding-questions")
    public ResponseEntity<?> generateCodingQuestions(@RequestBody CodingQuestionsGenerationRequest request) {
        try {
            Map<String, Object> result = aiQuestionService.generateCodingQuestions(request);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "AI coding questions generation failed: " + e.getMessage()));
        }
    }
}
