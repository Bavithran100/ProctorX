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

import com.example.ProctorX.Config.RedisCacheService;
import tools.jackson.core.type.TypeReference;
import java.util.concurrent.TimeUnit;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/adaptive")
public class AdaptiveCoachController {

    private final AdaptiveEngineService adaptiveEngineService;
    private final AdaptiveTrainingExamRepository trainingExamRepo;
    private final LearnerModelRepository learnerModelRepo;
    private final AuthService authService;
    private final RedisCacheService redisCacheService;

    public AdaptiveCoachController(
            AdaptiveEngineService adaptiveEngineService,
            AdaptiveTrainingExamRepository trainingExamRepo,
            LearnerModelRepository learnerModelRepo,
            AuthService authService,
            RedisCacheService redisCacheService) {
        this.adaptiveEngineService = adaptiveEngineService;
        this.trainingExamRepo = trainingExamRepo;
        this.learnerModelRepo = learnerModelRepo;
        this.authService = authService;
        this.redisCacheService = redisCacheService;
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
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> getDiagnosticQuestions(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        List<Map<String, Object>> questions = adaptiveEngineService.getDiagnosticQuestions();
        return ResponseEntity.ok(questions);
    }

    @PostMapping("/diagnostic/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
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
        if (user != null) {
            redisCacheService.delete("proctorx:active_exam:" + user.getId());
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/training/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> startTrainingSession(
            Authentication auth,
            @RequestBody(required = false) Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);

        // Global single active exam guard in Redis
        String activeKey = "proctorx:active_exam:" + user.getId();
        Map<String, Object> existingLock = redisCacheService.get(activeKey, new TypeReference<Map<String, Object>>() {});
        if (existingLock != null) {
            String lockedExamType = String.valueOf(existingLock.get("examType"));
            if (!"ADAPTIVE_TRAINING".equalsIgnoreCase(lockedExamType)) {
                return ResponseEntity.status(409).body(Map.of(
                        "message", "ACTIVE_EXAM_EXISTS",
                        "activeExam", existingLock
                ));
            }
        }

        String topic = (payload != null && payload.containsKey("topic"))
                ? String.valueOf(payload.get("topic"))
                : "AUTO";

        try {
            AdaptiveTrainingExamEntity exam = adaptiveEngineService.createTrainingSession(user, topic);

            // Register active exam in Redis
            Map<String, Object> lockData = new HashMap<>();
            lockData.put("examId", exam.getId());
            lockData.put("examType", "ADAPTIVE_TRAINING");
            lockData.put("title", exam.getTargetSkill() + " Training");
            lockData.put("startedAt", LocalDateTime.now().toString());
            redisCacheService.set(activeKey, lockData, 45, TimeUnit.MINUTES);

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
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
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
            if (user != null) {
                redisCacheService.delete("proctorx:active_exam:" + user.getId());
            }
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to submit training session: " + ex.getMessage()));
        }
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> getTrainingHistory(
            Authentication auth,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        List<AdaptiveTrainingExamEntity> allHistory = trainingExamRepo.findByUserOrderByStartedAtDesc(user);
        int totalCount = allHistory.size();

        int fromIndex = Math.min(offset, totalCount);
        int toIndex = Math.min(fromIndex + limit, totalCount);
        List<AdaptiveTrainingExamEntity> pagedHistory = allHistory.subList(fromIndex, toIndex);

        List<Map<String, Object>> dtos = pagedHistory.stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("targetSkill", e.getTargetSkill());
            map.put("difficulty", e.getDifficulty());
            map.put("learningObjective", e.getLearningObjective());
            map.put("score", e.getScore());
            map.put("passedQuestions", e.getPassedQuestions());
            map.put("totalQuestions", e.getTotalQuestions());
            map.put("totalTestCasesPassed", e.getTotalTestCasesPassed());
            map.put("totalTestCasesTotal", e.getTotalTestCasesTotal());
            map.put("oldMastery", e.getOldMastery());
            map.put("newMastery", e.getNewMastery());
            map.put("masteryDelta", e.getMasteryDelta());
            map.put("recentTrend", e.getRecentTrend());
            map.put("completed", e.isCompleted());
            map.put("status", e.getStatus());
            map.put("malpracticeScore", e.getMalpracticeScore());
            map.put("rankXpPenalty", e.getRankXpPenalty());
            map.put("reconnectCount", e.getReconnectCount());
            map.put("vectorUpdates", adaptiveEngineService.parseTestCases(e.getVectorUpdatesJson()));
            map.put("startedAt", e.getStartedAt() != null ? e.getStartedAt().toString() : null);
            map.put("completedAt", e.getCompletedAt() != null ? e.getCompletedAt().toString() : null);
            return map;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("history", dtos);
        response.put("totalCount", totalCount);
        response.put("hasMore", toIndex < totalCount);
        response.put("offset", offset);
        response.put("limit", limit);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/active-session")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> getActiveTrainingSession(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        Map<String, Object> session = adaptiveEngineService.getActiveTrainingSession(user);
        return ResponseEntity.ok(session != null ? session : Map.of("hasActiveSession", false));
    }

    @PostMapping("/training/reconnect")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> reconnectToTrainingSession(
            Authentication auth,
            @RequestBody Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        Long examId = Long.valueOf(String.valueOf(payload.get("sessionId")));

        try {
            Map<String, Object> session = adaptiveEngineService.reconnectToTrainingSession(user, examId);
            return ResponseEntity.ok(session);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/training/discard")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> discardTrainingSession(
            Authentication auth,
            @RequestBody Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        Long examId = Long.valueOf(String.valueOf(payload.get("sessionId")));

        try {
            Map<String, Object> result = adaptiveEngineService.discardActiveTrainingSession(user, examId);
            if (user != null) {
                redisCacheService.delete("proctorx:active_exam:" + user.getId());
            }
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/training/terminate-malpractice")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> terminateForMalpractice(
            Authentication auth,
            @RequestBody Map<String, Object> payload) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        Long examId = Long.valueOf(String.valueOf(payload.get("sessionId")));
        int violations = (payload.get("violations") instanceof Number n) ? n.intValue() : 3;

        try {
            Map<String, Object> result = adaptiveEngineService.terminateTrainingSessionForMalpractice(user, examId, violations);
            if (user != null) {
                redisCacheService.delete("proctorx:active_exam:" + user.getId());
            }
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/assessment/official-radar")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<?> getOfficialAssessmentRadar(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        AuthEntity user = authService.getCurrentUser(auth);
        Map<String, Object> summary = adaptiveEngineService.getOfficialAssessmentSummary(user);
        return ResponseEntity.ok(summary);
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

    @GetMapping("/user/{userId}/official-radar")
    public ResponseEntity<?> getPublicOfficialRadar(@PathVariable Long userId) {
        Optional<AuthEntity> userOpt = authService.getUsers().stream().filter(u -> u.getId().equals(userId)).findFirst();
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> summary = adaptiveEngineService.getOfficialAssessmentSummary(userOpt.get());
        return ResponseEntity.ok(summary);
    }
}
