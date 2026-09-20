package com.example.ProctorX.modules.adaptive.web;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.modules.adaptive.application.AdaptiveEngineService;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingExamEntity;
import com.example.ProctorX.modules.adaptive.domain.LearnerModelEntity;
import com.example.ProctorX.modules.adaptive.infrastructure.AdaptiveTrainingExamRepository;
import com.example.ProctorX.modules.adaptive.infrastructure.LearnerModelRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/adaptive")
public class AdaptiveCoachController {

    private final AdaptiveEngineService adaptiveEngineService;
    private final AdaptiveTrainingExamRepository trainingExamRepo;
    private final LearnerModelRepository learnerModelRepo;
    private final AuthService authService;

    public AdaptiveCoachController(
            AdaptiveEngineService adaptiveEngineService,
            AdaptiveTrainingExamRepository trainingExamRepo,
            LearnerModelRepository learnerModelRepo,
            AuthService authService) {
        this.adaptiveEngineService = adaptiveEngineService;
        this.trainingExamRepo = trainingExamRepo;
        this.learnerModelRepo = learnerModelRepo;
        this.authService = authService;
    }

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> getAdaptiveProfile(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(user);
        Map<String, Object> summary = adaptiveEngineService.getLearnerModelSummary(model);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/diagnostic/questions")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<?> getDiagnosticQuestions(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        List<Map<String, Object>> questions = adaptiveEngineService.getDiagnosticQuestions();
        return ResponseEntity.ok(questions);
    }

    @PostMapping("/diagnostic/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<?> submitDiagnosticExam(
            Authentication auth,
            @RequestBody Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> submissions = (List<Map<String, Object>>) payload.getOrDefault("submissions", Collections.emptyList());

        Map<String, Object> result = adaptiveEngineService.evaluateDiagnosticExam(user, submissions);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/training/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<?> startTrainingSession(
            Authentication auth,
            @RequestBody(required = false) Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);

        String topic = (payload != null && payload.containsKey("topic"))
                ? String.valueOf(payload.get("topic"))
                : "AUTO";

        try {
            AdaptiveTrainingExamEntity exam = adaptiveEngineService.createTrainingSession(user, topic);

            List<Map<String, Object>> questionsDto = exam.getQuestions().stream().map(q -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", q.getId());
                dto.put("title", q.getTitle());
                dto.put("pattern", q.getPattern());
                dto.put("description", q.getDescription());
                dto.put("problemStatement", q.getDescription());
                dto.put("difficulty", q.getDifficulty());
                dto.put("solutionOutline", q.getSolutionOutline());
                dto.put("testCases", adaptiveEngineService.parseTestCases(q.getTestCasesJson()));
                return dto;
            }).toList();

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", exam.getId());
            response.put("targetSkill", exam.getTargetSkill());
            response.put("difficulty", exam.getDifficulty());
            response.put("learningObjective", exam.getLearningObjective());
            response.put("totalQuestions", exam.getTotalQuestions());
            response.put("startedAt", exam.getStartedAt().toString());
            response.put("questions", questionsDto);

            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to start training session: " + ex.getMessage()));
        }
    }

    @PostMapping("/training/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<?> submitTrainingSession(
            Authentication auth,
            @RequestBody Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);

        Long examId = Long.valueOf(String.valueOf(payload.get("sessionId")));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> answers = (List<Map<String, Object>>) payload.getOrDefault("answers", Collections.emptyList());

        try {
            Map<String, Object> result = adaptiveEngineService.submitTrainingSession(user, examId, answers);
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to submit training session: " + ex.getMessage()));
        }
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<?> getTrainingHistory(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        List<AdaptiveTrainingExamEntity> history = trainingExamRepo.findByUserOrderByStartedAtDesc(user);

        List<Map<String, Object>> dtos = history.stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("targetSkill", e.getTargetSkill());
            map.put("difficulty", e.getDifficulty());
            map.put("learningObjective", e.getLearningObjective());
            map.put("score", e.getScore());
            map.put("passedQuestions", e.getPassedQuestions());
            map.put("totalQuestions", e.getTotalQuestions());
            map.put("completed", e.isCompleted());
            map.put("startedAt", e.getStartedAt() != null ? e.getStartedAt().toString() : null);
            map.put("completedAt", e.getCompletedAt() != null ? e.getCompletedAt().toString() : null);
            return map;
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/user/{userId}/radar")
    public ResponseEntity<?> getPublicRadar(@PathVariable Long userId) {
        Optional<LearnerModelEntity> modelOpt = learnerModelRepo.findByUserId(userId);
        if (modelOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "hasLearnerModel", false,
                    "overallReadiness", 0.0,
                    "dsaMasteryVector", Collections.emptyList(),
                    "behavioralVector", Collections.emptyList()
            ));
        }

        LearnerModelEntity model = modelOpt.get();
        Map<String, Object> summary = adaptiveEngineService.getLearnerModelSummary(model);
        return ResponseEntity.ok(summary);
    }
}
