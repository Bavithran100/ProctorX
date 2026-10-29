package com.example.ProctorX.modules.adaptive.application;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveConstants;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingExamEntity;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingQuestionEntity;
import com.example.ProctorX.modules.adaptive.domain.LearnerModelEntity;
import com.example.ProctorX.modules.adaptive.domain.SkillMasteryEntity;
import com.example.ProctorX.modules.adaptive.infrastructure.AdaptiveTrainingExamRepository;
import com.example.ProctorX.modules.adaptive.infrastructure.LearnerModelRepository;
import com.example.ProctorX.modules.adaptive.infrastructure.SkillMasteryRepository;
import com.example.ProctorX.modules.coding.compiler.CodeExecutionResult;
import com.example.ProctorX.modules.coding.compiler.CodeExecutionRouterService;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.example.ProctorX.Config.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class AdaptiveEngineService {

    private static final Logger log = LoggerFactory.getLogger(AdaptiveEngineService.class);

    private final LearnerModelRepository learnerModelRepo;
    private final SkillMasteryRepository skillMasteryRepo;
    private final AdaptiveTrainingExamRepository trainingExamRepo;
    private final DiagnosticQuestionBank diagnosticBank;
    private final CodeExecutionRouterService executionRouter;
    private final ExamSubmissionRepository submissionRepository;
    private final ExamSessionRepository sessionRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final RedisCacheService redisCacheService;

    @Value("${ai.groq.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqUrl;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    @Value("${ai.groq.model.coding:openai/gpt-oss-120b}")
    private String codingModel;

    @Autowired
    public AdaptiveEngineService(
            LearnerModelRepository learnerModelRepo,
            SkillMasteryRepository skillMasteryRepo,
            AdaptiveTrainingExamRepository trainingExamRepo,
            DiagnosticQuestionBank diagnosticBank,
            CodeExecutionRouterService executionRouter,
            ExamSubmissionRepository submissionRepository,
            @Autowired(required = false) ExamSessionRepository sessionRepository,
            ObjectMapper objectMapper,
            @Autowired(required = false) RedisCacheService redisCacheService) {
        this.learnerModelRepo = learnerModelRepo;
        this.skillMasteryRepo = skillMasteryRepo;
        this.trainingExamRepo = trainingExamRepo;
        this.diagnosticBank = diagnosticBank;
        this.executionRouter = executionRouter;
        this.submissionRepository = submissionRepository;
        this.sessionRepository = sessionRepository;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
        this.objectMapper = objectMapper;
        this.redisCacheService = redisCacheService;
    }

    public AdaptiveEngineService(
            LearnerModelRepository learnerModelRepo,
            SkillMasteryRepository skillMasteryRepo,
            AdaptiveTrainingExamRepository trainingExamRepo,
            DiagnosticQuestionBank diagnosticBank,
            CodeExecutionRouterService executionRouter,
            ExamSubmissionRepository submissionRepository,
            ObjectMapper objectMapper) {
        this(learnerModelRepo, skillMasteryRepo, trainingExamRepo, diagnosticBank, executionRouter, submissionRepository, null, objectMapper, null);
    }

    @Transactional
    public LearnerModelEntity getOrCreateLearnerModel(AuthEntity user) {
        Optional<LearnerModelEntity> existing = learnerModelRepo.findByUser(user);
        if (existing.isPresent()) {
            LearnerModelEntity model = existing.get();
            ensureAllDimensionsExist(model);
            return model;
        }

        LearnerModelEntity model = new LearnerModelEntity(user);

        // 1. Initialize 12 Core Concepts
        for (String concept : AdaptiveConstants.CONCEPTS) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "CONCEPT", concept, 0.15);
            sm.setConfidence(0.10);
            sm.setBktPrior(0.15);
            sm.setIrtTheta(-1.7);
            sm.setRankTier("BRONZE");
            sm.setRankXp(30);
            model.addSkillMastery(sm);
        }

        // 2. Initialize 9 Algorithmic Patterns
        for (String pattern : AdaptiveConstants.PATTERNS) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "PATTERN", pattern, 0.15);
            sm.setConfidence(0.10);
            sm.setBktPrior(0.15);
            sm.setIrtTheta(-1.7);
            model.addSkillMastery(sm);
        }

        // 3. Initialize 5 Coding Competencies
        for (String comp : AdaptiveConstants.CODING_COMPETENCIES) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "COMPETENCY", comp, 0.20);
            sm.setConfidence(0.10);
            sm.setBktPrior(0.20);
            sm.setIrtTheta(-1.4);
            model.addSkillMastery(sm);
        }

        // 4. Initialize 9 Error Profiles
        for (String errKey : AdaptiveConstants.ERROR_PROFILES) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "ERROR_PROFILE", errKey, 0.15);
            sm.setErrorRiskProbability(0.15);
            model.addSkillMastery(sm);
        }

        return learnerModelRepo.save(model);
    }

    private void ensureAllDimensionsExist(LearnerModelEntity model) {
        Map<String, SkillMasteryEntity> byKey = new HashMap<>();
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if (sm.getDimensionKey() != null) {
                byKey.put(sm.getDimensionKey(), sm);
            }
        }

        boolean modified = false;

        // Concepts
        for (String c : AdaptiveConstants.CONCEPTS) {
            SkillMasteryEntity sm = byKey.get(c);
            if (sm != null) {
                if (!"CONCEPT".equals(sm.getDimensionType())) {
                    sm.setDimensionType("CONCEPT");
                    modified = true;
                }
                if (sm.getBktPrior() == null) { sm.setBktPrior(sm.getMastery() != null ? sm.getMastery() : 0.15); modified = true; }
                if (sm.getIrtTheta() == null) { sm.setIrtTheta(-1.7); modified = true; }
                if (sm.getRankXp() == null) { sm.setRankXp(30); modified = true; }
                if (sm.getRankTier() == null) { sm.setRankTier("BRONZE"); modified = true; }
                if (sm.getConfidence() == null) { sm.setConfidence(0.10); modified = true; }
                if (sm.getRecentTrend() == null) { sm.setRecentTrend("STABLE"); modified = true; }
                if (sm.getGrowthDelta() == null) { sm.setGrowthDelta(0.0); modified = true; }
                if (sm.getQuestionsAttempted() == null) { sm.setQuestionsAttempted(0); modified = true; }
                if (sm.getQuestionsSolved() == null) { sm.setQuestionsSolved(0); modified = true; }
            } else {
                SkillMasteryEntity newSm = new SkillMasteryEntity(model, "CONCEPT", c, 0.15);
                newSm.setConfidence(0.10);
                newSm.setBktPrior(0.15);
                newSm.setIrtTheta(-1.7);
                newSm.setRankTier("BRONZE");
                newSm.setRankXp(30);
                model.addSkillMastery(newSm);
                byKey.put(c, newSm);
                modified = true;
            }
        }

        // Patterns
        for (String p : AdaptiveConstants.PATTERNS) {
            SkillMasteryEntity sm = byKey.get(p);
            if (sm != null) {
                if (!"PATTERN".equals(sm.getDimensionType())) {
                    sm.setDimensionType("PATTERN");
                    modified = true;
                }
                if (sm.getBktPrior() == null) { sm.setBktPrior(sm.getMastery() != null ? sm.getMastery() : 0.15); modified = true; }
                if (sm.getIrtTheta() == null) { sm.setIrtTheta(-1.7); modified = true; }
                if (sm.getConfidence() == null) { sm.setConfidence(0.10); modified = true; }
                if (sm.getRecentTrend() == null) { sm.setRecentTrend("STABLE"); modified = true; }
                if (sm.getGrowthDelta() == null) { sm.setGrowthDelta(0.0); modified = true; }
            } else {
                SkillMasteryEntity newSm = new SkillMasteryEntity(model, "PATTERN", p, 0.15);
                newSm.setConfidence(0.10);
                newSm.setBktPrior(0.15);
                newSm.setIrtTheta(-1.7);
                model.addSkillMastery(newSm);
                byKey.put(p, newSm);
                modified = true;
            }
        }

        // Competencies
        for (String cc : AdaptiveConstants.CODING_COMPETENCIES) {
            SkillMasteryEntity sm = byKey.get(cc);
            if (sm != null) {
                if (!"COMPETENCY".equals(sm.getDimensionType())) {
                    sm.setDimensionType("COMPETENCY");
                    modified = true;
                }
                if (sm.getBktPrior() == null) { sm.setBktPrior(sm.getMastery() != null ? sm.getMastery() : 0.20); modified = true; }
                if (sm.getIrtTheta() == null) { sm.setIrtTheta(-1.4); modified = true; }
                if (sm.getConfidence() == null) { sm.setConfidence(0.10); modified = true; }
                if (sm.getRecentTrend() == null) { sm.setRecentTrend("STABLE"); modified = true; }
                if (sm.getGrowthDelta() == null) { sm.setGrowthDelta(0.0); modified = true; }
            } else {
                SkillMasteryEntity newSm = new SkillMasteryEntity(model, "COMPETENCY", cc, 0.20);
                newSm.setConfidence(0.10);
                newSm.setBktPrior(0.20);
                newSm.setIrtTheta(-1.4);
                model.addSkillMastery(newSm);
                byKey.put(cc, newSm);
                modified = true;
            }
        }

        // Error Profiles
        for (String ep : AdaptiveConstants.ERROR_PROFILES) {
            SkillMasteryEntity sm = byKey.get(ep);
            if (sm != null) {
                if (!"ERROR_PROFILE".equals(sm.getDimensionType())) {
                    sm.setDimensionType("ERROR_PROFILE");
                    modified = true;
                }
                if (sm.getErrorRiskProbability() == null) { sm.setErrorRiskProbability(0.15); modified = true; }
            } else {
                SkillMasteryEntity newSm = new SkillMasteryEntity(model, "ERROR_PROFILE", ep, 0.15);
                newSm.setErrorRiskProbability(0.15);
                model.addSkillMastery(newSm);
                byKey.put(ep, newSm);
                modified = true;
            }
        }

        if (modified) {
            learnerModelRepo.save(model);
        }
    }

    public List<Map<String, Object>> getDiagnosticQuestions() {
        List<DiagnosticQuestionBank.DiagnosticQuestion> questions = diagnosticBank.getCuratedQuestions();
        List<Map<String, Object>> response = new ArrayList<>();

        for (DiagnosticQuestionBank.DiagnosticQuestion q : questions) {
            response.add(Map.of(
                    "id", q.id(),
                    "title", q.title(),
                    "description", q.description(),
                    "primaryTopic", q.primaryConcept(),
                    "primaryConcept", q.primaryConcept(),
                    "pattern", q.pattern(),
                    "secondaryTopics", q.secondaryConcepts(),
                    "difficulty", q.difficulty(),
                    "testCases", q.testCases()
            ));
        }

        return response;
    }

    @Transactional
    public Map<String, Object> evaluateDiagnosticExam(AuthEntity user, List<Map<String, Object>> submissions) {
        LearnerModelEntity learnerModel = getOrCreateLearnerModel(user);
        List<DiagnosticQuestionBank.DiagnosticQuestion> curatedQuestions = diagnosticBank.getCuratedQuestions();

        Map<String, Double> conceptScores = new HashMap<>();
        Map<String, Double> conceptWeightsSum = new HashMap<>();
        Map<String, Double> patternScores = new HashMap<>();
        Map<String, Double> patternWeightsSum = new HashMap<>();

        Map<String, Integer> errorDetections = new HashMap<>();
        int totalPassedCount = 0;
        int totalTestCasesPassed = 0;
        int totalTestCasesTotal = 0;

        for (DiagnosticQuestionBank.DiagnosticQuestion q : curatedQuestions) {
            Optional<Map<String, Object>> subOpt = submissions.stream()
                    .filter(s -> q.id().equals(s.get("questionId")))
                    .findFirst();

            int passedCount = 0;
            int totalCount = q.testCases().size();
            totalTestCasesTotal += totalCount;
            String userCode = "";
            String userLang = "java";
            int attempts = 1;
            int durationSeconds = 60;
            int proctorViolations = 0;

            if (subOpt.isPresent()) {
                Map<String, Object> sub = subOpt.get();
                userCode = (String) sub.getOrDefault("code", "");
                userLang = (String) sub.getOrDefault("language", "java");
                attempts = (sub.get("attempts") instanceof Number n) ? n.intValue() : 1;
                durationSeconds = (sub.get("durationSeconds") instanceof Number n) ? n.intValue() : 60;
                proctorViolations = (sub.get("proctorViolations") instanceof Number n) ? n.intValue() : 0;

                if (sub.containsKey("detectedErrors") && sub.get("detectedErrors") instanceof List<?> list) {
                    for (Object o : list) {
                        if (o != null) {
                            String errName = o.toString();
                            errorDetections.put(errName, errorDetections.getOrDefault(errName, 0) + 1);
                        }
                    }
                }

                if (sub.containsKey("passedCount") && sub.get("passedCount") instanceof Number n) {
                    passedCount = n.intValue();
                } else if (!userCode.isBlank()) {
                    for (Map<String, Object> tc : q.testCases()) {
                        String input = (String) tc.getOrDefault("input", "");
                        String expected = (String) tc.getOrDefault("expectedOutput", "");
                        try {
                            CodeExecutionResult res = executionRouter.execute(userLang, userCode, input);
                            String output = res.success() ? res.output() : res.stdout();
                            if (output != null && output.trim().equals(expected.trim())) {
                                passedCount++;
                            } else {
                                detectErrorTypes(output, res.error(), q.errorTraps(), errorDetections);
                            }
                        } catch (Exception e) {
                            detectErrorTypes("", e.getMessage(), q.errorTraps(), errorDetections);
                        }
                    }
                }
            }

            if (passedCount == totalCount) {
                totalPassedCount++;
            }
            totalTestCasesPassed += passedCount;

            double rawRatio = (double) passedCount / Math.max(1, totalCount);
            double evidence = computeEffectiveEvidence(rawRatio, attempts, durationSeconds, proctorViolations);

            // Concept Weights Accumulation
            for (Map.Entry<String, Double> entry : q.conceptWeights().entrySet()) {
                String cKey = entry.getKey();
                double w = entry.getValue();
                conceptScores.put(cKey, conceptScores.getOrDefault(cKey, 0.0) + evidence * w);
                conceptWeightsSum.put(cKey, conceptWeightsSum.getOrDefault(cKey, 0.0) + w);
            }

            // Pattern Weights Accumulation
            for (Map.Entry<String, Double> entry : q.patternWeights().entrySet()) {
                String pKey = entry.getKey();
                double w = entry.getValue();
                patternScores.put(pKey, patternScores.getOrDefault(pKey, 0.0) + evidence * w);
                patternWeightsSum.put(pKey, patternWeightsSum.getOrDefault(pKey, 0.0) + w);
            }
        }

        List<Map<String, Object>> diagUpdates = new ArrayList<>();
        List<SkillMasteryEntity> masteries = learnerModel.getSkillMasteries();

        for (SkillMasteryEntity sm : masteries) {
            if ("CONCEPT".equals(sm.getDimensionType())) {
                String key = sm.getDimensionKey();
                double oldM = sm.getMastery() != null ? sm.getMastery() : 0.20;
                if (conceptWeightsSum.containsKey(key) && conceptWeightsSum.get(key) > 0.0) {
                    double evidenceRatio = conceptScores.get(key) / conceptWeightsSum.get(key);
                    double newMastery = computeBktIrtPosterior(sm.getBktPrior(), resolveDifficultyParameter("EASY_MEDIUM"), evidenceRatio, 1, 60, 0);
                    double delta = Math.round((newMastery - oldM) * 100.0) / 100.0;
                    sm.setGrowthDelta(delta);
                    sm.setMastery(newMastery);
                    sm.setBktPrior(newMastery);
                    sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                    sm.setConfidence(0.65);
                    sm.setEvidenceCount(3);
                    sm.setQuestionsAttempted((sm.getQuestionsAttempted() != null ? sm.getQuestionsAttempted() : 0) + 1);
                    if (evidenceRatio >= 0.66) sm.setQuestionsSolved((sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0) + 1);
                    sm.setRankXp(AdaptiveConstants.calculateRankXp(newMastery, sm.getQuestionsSolved()));
                    sm.setRankTier(AdaptiveConstants.calculateRankTier(sm.getRankXp()));
                    sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : (delta <= -0.03 ? "DECLINING" : "STABLE"));
                    sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, delta, "DIAGNOSTIC"));

                    Map<String, Object> u = new HashMap<>();
                    u.put("dimension", key);
                    u.put("type", "CONCEPT");
                    u.put("oldMastery", oldM);
                    u.put("newMastery", newMastery);
                    u.put("delta", delta);
                    u.put("impact", "DIAGNOSTIC_CALIBRATION");
                    diagUpdates.add(u);
                } else {
                    sm.setMastery(0.20);
                    sm.setConfidence(0.20);
                    sm.setRankXp(AdaptiveConstants.calculateRankXp(0.20, sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0));
                }
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("PATTERN".equals(sm.getDimensionType())) {
                String key = sm.getDimensionKey();
                double oldM = sm.getMastery() != null ? sm.getMastery() : 0.20;
                if (patternWeightsSum.containsKey(key) && patternWeightsSum.get(key) > 0.0) {
                    double evidenceRatio = patternScores.get(key) / patternWeightsSum.get(key);
                    double newMastery = computeBktIrtPosterior(sm.getBktPrior(), 0.0, evidenceRatio, 1, 60, 0);
                    double delta = Math.round((newMastery - oldM) * 100.0) / 100.0;
                    sm.setGrowthDelta(delta);
                    sm.setMastery(newMastery);
                    sm.setBktPrior(newMastery);
                    sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                    sm.setConfidence(0.60);
                    sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : (delta <= -0.03 ? "DECLINING" : "STABLE"));

                    Map<String, Object> u = new HashMap<>();
                    u.put("dimension", key);
                    u.put("type", "PATTERN");
                    u.put("oldMastery", oldM);
                    u.put("newMastery", newMastery);
                    u.put("delta", delta);
                    u.put("impact", "DIAGNOSTIC_CALIBRATION");
                    diagUpdates.add(u);
                } else {
                    sm.setMastery(0.20);
                }
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("COMPETENCY".equals(sm.getDimensionType())) {
                double oldM = sm.getMastery() != null ? sm.getMastery() : 0.20;
                double baseScore = (double) totalTestCasesPassed / Math.max(1, totalTestCasesTotal);
                double val = switch (sm.getDimensionKey()) {
                    case "IMPLEMENTATION" -> Math.max(0.25, Math.min(0.92, baseScore + 0.10));
                    case "DEBUGGING" -> Math.max(0.20, Math.min(0.85, (double) totalTestCasesPassed / Math.max(1, totalTestCasesTotal)));
                    case "COMPLEXITY_REASONING" -> Math.max(0.20, Math.min(0.85, baseScore * 0.95));
                    case "EDGE_CASE_HANDLING" -> Math.max(0.15, Math.min(0.80, (double) totalPassedCount / 6.0));
                    case "CODE_ORGANIZATION" -> Math.max(0.30, Math.min(0.88, baseScore + 0.05));
                    default -> 0.30;
                };
                double roundedVal = Math.round(val * 100.0) / 100.0;
                double delta = Math.round((roundedVal - oldM) * 100.0) / 100.0;
                sm.setGrowthDelta(delta);
                sm.setMastery(roundedVal);
                sm.setConfidence(0.55);
                sm.setEvidenceCount(6);
                sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : "STABLE");
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", "COMPETENCY");
                u.put("oldMastery", oldM);
                u.put("newMastery", roundedVal);
                u.put("delta", delta);
                u.put("impact", "DIAGNOSTIC_BASELINE");
                diagUpdates.add(u);
            } else if ("ERROR_PROFILE".equals(sm.getDimensionType())) {
                double oldRisk = sm.getErrorRiskProbability() != null ? sm.getErrorRiskProbability() : 0.15;
                int detected = errorDetections.getOrDefault(sm.getDimensionKey(), 0);
                double risk = Math.max(0.08, Math.min(0.85, 0.15 + (detected * 0.18)));
                double roundedRisk = Math.round(risk * 100.0) / 100.0;
                double deltaRisk = Math.round((roundedRisk - oldRisk) * 100.0) / 100.0;
                sm.setErrorRiskProbability(roundedRisk);
                sm.setMastery(roundedRisk);
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", "ERROR_PROFILE");
                u.put("oldMastery", oldRisk);
                u.put("newMastery", roundedRisk);
                u.put("delta", deltaRisk);
                u.put("impact", detected > 0 ? "BUG_PATTERN_DISCOVERED" : "NOMINAL_RISK");
                diagUpdates.add(u);
            }
        }

        learnerModel.setDiagnosticCompleted(true);
        learnerModel.setTotalQuestionsSolved(totalPassedCount);
        learnerModel.setTotalSessionsCompleted(1);
        learnerModel.setOverallReadiness(calculateOverallReadiness(masteries));
        learnerModel.setLastPracticedAt(LocalDateTime.now());
        learnerModel.setUpdatedAt(LocalDateTime.now());

        learnerModelRepo.save(learnerModel);

        try {
            AdaptiveTrainingExamEntity diagExam = new AdaptiveTrainingExamEntity();
            diagExam.setUser(user);
            diagExam.setTargetSkill("DIAGNOSTIC");
            diagExam.setLearningObjective("Comprehensive 6-Topic Diagnostic Calibration");
            diagExam.setDifficulty("VARIABLE");
            diagExam.setTotalQuestions(curatedQuestions.size());
            diagExam.setPassedQuestions(totalPassedCount);
            diagExam.setTotalTestCasesPassed(totalTestCasesPassed);
            diagExam.setTotalTestCasesTotal(totalTestCasesTotal);
            diagExam.setScore((double) Math.round((float) totalTestCasesPassed / Math.max(1, totalTestCasesTotal) * 100));
            diagExam.setOldMastery(0.20);
            diagExam.setNewMastery(learnerModel.getOverallReadiness());
            diagExam.setMasteryDelta(Math.round((learnerModel.getOverallReadiness() - 0.20) * 100.0) / 100.0);
            diagExam.setRecentTrend("IMPROVING");
            diagExam.setCompleted(true);
            diagExam.setCompletedAt(LocalDateTime.now());
            diagExam.setVectorUpdatesJson(objectMapper.writeValueAsString(diagUpdates));
            trainingExamRepo.save(diagExam);
        } catch (Exception ignored) {}

        if (user != null && redisCacheService != null) {
            redisCacheService.delete("proctorx:learner_model:" + user.getId());
        }

        return Map.of(
                "diagnosticCompleted", true,
                "totalPassedQuestions", totalPassedCount,
                "totalQuestions", curatedQuestions.size(),
                "overallReadiness", learnerModel.getOverallReadiness(),
                "learnerModel", getLearnerModelSummary(learnerModel)
        );
    }

    public List<Map<String, Object>> parseTestCases(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public Map<String, Object> getLearnerModelSummary(LearnerModelEntity model) {
        if (model.getUser() != null && redisCacheService != null) {
            String cacheKey = "proctorx:learner_model:" + model.getUser().getId();
            Map<String, Object> cached = redisCacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {});
            if (cached != null) {
                return cached;
            }
        }

        ensureAllDimensionsExist(model);

        Map<String, Double> conceptMasteryMap = new LinkedHashMap<>();
        Map<String, Double> patternMasteryMap = new LinkedHashMap<>();
        Map<String, Double> codingCompetencyMap = new LinkedHashMap<>();
        Map<String, Double> errorProfileMap = new LinkedHashMap<>();
        Map<String, SkillMasteryEntity> masteryEntitiesByKey = new HashMap<>();

        List<Map<String, Object>> dsaSkills = new ArrayList<>();
        List<Map<String, Object>> behavioralSkills = new ArrayList<>();
        List<Map<String, Object>> topicRanks = new ArrayList<>();
        List<Map<String, Object>> patternRanks = new ArrayList<>();

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            String type = sm.getDimensionType();
            String key = sm.getDimensionKey();
            double masteryVal = sm.getMastery() != null ? sm.getMastery() : 0.20;
            masteryEntitiesByKey.put(key, sm);

            Map<String, Object> item = new HashMap<>();
            item.put("skill", key);
            item.put("mastery", masteryVal);
            item.put("confidence", sm.getConfidence());
            item.put("evidenceCount", sm.getEvidenceCount());
            item.put("recentTrend", sm.getRecentTrend());
            item.put("growthDelta", sm.getGrowthDelta() != null ? sm.getGrowthDelta() : 0.0);
            item.put("bktPrior", sm.getBktPrior());
            item.put("irtTheta", sm.getIrtTheta());
            item.put("questionsAttempted", sm.getQuestionsAttempted());
            item.put("questionsSolved", sm.getQuestionsSolved());
            item.put("rankXp", sm.getRankXp() != null ? sm.getRankXp() : AdaptiveConstants.calculateRankXp(masteryVal, sm.getQuestionsSolved()));
            item.put("rankTier", sm.getRankTier() != null ? sm.getRankTier() : AdaptiveConstants.calculateRankTier(sm.getRankXp()));
            item.put("history", parseHistoryJson(sm.getHistoryJson()));
            item.put("lastAssessedAt", sm.getLastAssessedAt() != null ? sm.getLastAssessedAt().toString() : LocalDateTime.now().toString());

            if ("CONCEPT".equals(type)) {
                conceptMasteryMap.put(key, masteryVal);
                dsaSkills.add(item);
                topicRanks.add(Map.of(
                        "topic", key,
                        "rankTier", item.get("rankTier"),
                        "rankXp", item.get("rankXp"),
                        "mastery", masteryVal,
                        "questionsSolved", sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0,
                        "milestoneQuota", AdaptiveConstants.MILESTONE_SOLVED_QUOTA
                ));
            } else if ("PATTERN".equals(type)) {
                patternMasteryMap.put(key, masteryVal);
                patternRanks.add(Map.of(
                        "topic", key,
                        "rankTier", item.get("rankTier"),
                        "rankXp", item.get("rankXp"),
                        "mastery", masteryVal,
                        "questionsSolved", sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0,
                        "milestoneQuota", AdaptiveConstants.MILESTONE_SOLVED_QUOTA
                ));
            } else if ("COMPETENCY".equals(type)) {
                codingCompetencyMap.put(key, masteryVal);
                behavioralSkills.add(item);
            } else if ("ERROR_PROFILE".equals(type)) {
                errorProfileMap.put(key, sm.getErrorRiskProbability() != null ? sm.getErrorRiskProbability() : 0.15);
            }
        }

        // Run Master Vector AI Recommendation Engine
        Map<String, Object> recommendations = computeMasterVectorRecommendations(
                conceptMasteryMap,
                patternMasteryMap,
                errorProfileMap,
                masteryEntitiesByKey
        );

        int totalSolved = model.getTotalQuestionsSolved() != null ? model.getTotalQuestionsSolved() : 0;
        int totalAttempted = Math.max(totalSolved, (model.getTotalSessionsCompleted() != null ? model.getTotalSessionsCompleted() : 0) * 3);
        int totalFailed = Math.max(0, totalAttempted - totalSolved);

        Map<String, Object> historyMap = Map.of(
                "questionsAttempted", totalAttempted,
                "questionsSolved", totalSolved,
                "questionsFailed", totalFailed,
                "averageExecutionTimeMs", 840,
                "recentTrend", Boolean.TRUE.equals(recommendations.get("isRemediationRecommended")) ? "DECLINING" : "IMPROVING"
        );

        Map<String, Object> activityHeatmap = calculateActivityHeatmap(model.getUser());
        int computedStreak = 0;
        if (activityHeatmap.get("currentStreak") instanceof Number num) {
            computedStreak = num.intValue();
        }

        // Sync streak with real activity
        if (model.getStreakDays() == null || model.getStreakDays() != computedStreak) {
            model.setStreakDays(computedStreak);
            try {
                learnerModelRepo.save(model);
            } catch (Exception ignored) {}
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("studentId", model.getUser() != null ? String.valueOf(model.getUser().getId()) : "S001");
        summary.put("diagnosticCompleted", model.isDiagnosticCompleted());
        summary.put("overallReadiness", model.getOverallReadiness());
        summary.put("totalQuestionsSolved", totalSolved);
        summary.put("totalSessionsCompleted", model.getTotalSessionsCompleted() != null ? model.getTotalSessionsCompleted() : 0);
        summary.put("streakDays", computedStreak);
        summary.put("activityHeatmap", activityHeatmap);

        // Vector-driven AI recommendation fields
        summary.put("recommendedTopic", recommendations.get("recommendedTopic"));
        summary.put("recommendedType", recommendations.get("recommendedType"));
        summary.put("remediationReason", recommendations.get("remediationReason"));
        summary.put("isRemediationRecommended", recommendations.get("isRemediationRecommended"));
        summary.put("recommendedConcepts", recommendations.get("recommendedConcepts"));
        summary.put("recommendedPatterns", recommendations.get("recommendedPatterns"));
        summary.put("nextFocusAreas", recommendations.get("nextFocusAreas"));

        summary.put("conceptMastery", conceptMasteryMap);
        summary.put("patternMastery", patternMasteryMap);
        summary.put("codingCompetencies", codingCompetencyMap);
        summary.put("errorProfile", errorProfileMap);
        summary.put("topicRanks", topicRanks);
        summary.put("patternRanks", patternRanks);
        summary.put("history", historyMap);
        summary.put("dsaMasteryVector", dsaSkills);
        summary.put("behavioralVector", behavioralSkills);

        if (model.getUser() != null && redisCacheService != null) {
            String cacheKey = "proctorx:learner_model:" + model.getUser().getId();
            redisCacheService.set(cacheKey, summary, 1, TimeUnit.HOURS);
        }

        return summary;
    }

    public Map<String, Object> calculateActivityHeatmap(AuthEntity user) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (user == null) {
            result.put("totalSubmissionsPastYear", 0);
            result.put("totalActiveDays", 0);
            result.put("maxStreak", 0);
            result.put("currentStreak", 0);
            result.put("submissionCalendar", Collections.emptyMap());
            result.put("activityDetails", Collections.emptyMap());
            return result;
        }

        LocalDate today = LocalDate.now();
        LocalDate oneYearAgo = today.minusDays(364);

        Map<String, Integer> submissionCalendar = new TreeMap<>();
        Map<String, List<Map<String, Object>>> activityDetails = new TreeMap<>();
        Set<String> seenScheduledExamDates = new HashSet<>();

        // 1. Fetch Adaptive Training & Diagnostic Sessions
        try {
            List<AdaptiveTrainingExamEntity> trainingExams = trainingExamRepo.findByUserOrderByStartedAtDesc(user);
            if (trainingExams != null) {
                for (AdaptiveTrainingExamEntity ex : trainingExams) {
                    LocalDateTime dt = ex.getCompletedAt() != null ? ex.getCompletedAt() : ex.getStartedAt();
                    if (dt == null) continue;
                    String dateStr = dt.toLocalDate().toString();

                    submissionCalendar.put(dateStr, submissionCalendar.getOrDefault(dateStr, 0) + 1);

                    Map<String, Object> detail = new LinkedHashMap<>();
                    boolean isDiag = "DIAGNOSTIC".equalsIgnoreCase(ex.getTargetSkill());
                    detail.put("id", "adaptive-" + ex.getId());
                    detail.put("type", isDiag ? "DIAGNOSTIC_EXAM" : "ADAPTIVE_TRAINING");
                    detail.put("category", isDiag ? "Cognitive Diagnostic" : "Adaptive Practice Challenge");
                    detail.put("title", isDiag ? "Baseline Diagnostic Calibration" : ("Adaptive: " + (ex.getTargetSkill() != null ? ex.getTargetSkill() : "Algorithmic Challenge")));
                    detail.put("score", ex.getScore() != null ? Math.round(ex.getScore()) : 0);
                    detail.put("status", ex.getStatus());
                    detail.put("time", dt.toLocalTime().toString().substring(0, Math.min(5, dt.toLocalTime().toString().length())));
                    detail.put("questionsPassed", ex.getPassedQuestions() != null ? ex.getPassedQuestions() : 0);
                    detail.put("totalQuestions", ex.getTotalQuestions() != null ? ex.getTotalQuestions() : 3);

                    activityDetails.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(detail);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load adaptive exams for heatmap: {}", e.getMessage());
        }

        // 2. Fetch Scheduled Exam Submissions
        try {
            List<ExamSubmissionEntity> submissions = submissionRepository.findByStudentOrderBySubmittedAtDesc(user);
            if ((submissions == null || submissions.isEmpty()) && user.getEmail() != null) {
                submissions = submissionRepository.findByStudentEmailOrderBySubmittedAtDesc(user.getEmail());
            }
            if (submissions != null) {
                for (ExamSubmissionEntity sub : submissions) {
                    LocalDateTime dt = sub.getSubmittedAt();
                    if (dt == null) continue;
                    String dateStr = dt.toLocalDate().toString();

                    Long examId = sub.getExam() != null ? sub.getExam().getId() : 0L;
                    String dedupeKey = examId + "_" + dateStr;
                    seenScheduledExamDates.add(dedupeKey);

                    submissionCalendar.put(dateStr, submissionCalendar.getOrDefault(dateStr, 0) + 1);

                    Map<String, Object> detail = new LinkedHashMap<>();
                    detail.put("id", "sub-" + sub.getId());
                    detail.put("type", "SCHEDULED_EXAM");
                    detail.put("category", "Official Scheduled Exam");
                    detail.put("title", sub.getExam() != null ? sub.getExam().getTitle() : "Scheduled Examination");
                    detail.put("score", sub.getScore() != null ? sub.getScore() : 0);
                    detail.put("status", "SUBMITTED");
                    detail.put("time", dt.toLocalTime().toString().substring(0, Math.min(5, dt.toLocalTime().toString().length())));

                    activityDetails.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(detail);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load exam submissions for heatmap: {}", e.getMessage());
        }

        // 3. Fetch Scheduled Exam Sessions (attended / active / locked, not yet submitted or deduplicated)
        if (sessionRepository != null) {
            try {
                List<ExamSessionEntity> sessions = sessionRepository.findByStudentOrderByStartTimeDesc(user);
                if (sessions != null) {
                    for (ExamSessionEntity sess : sessions) {
                        LocalDateTime dt = sess.getStartTime();
                        if (dt == null) continue;
                        String dateStr = dt.toLocalDate().toString();

                        Long examId = sess.getExam() != null ? sess.getExam().getId() : 0L;
                        String dedupeKey = examId + "_" + dateStr;

                        if (seenScheduledExamDates.contains(dedupeKey)) {
                            continue;
                        }
                        seenScheduledExamDates.add(dedupeKey);

                        submissionCalendar.put(dateStr, submissionCalendar.getOrDefault(dateStr, 0) + 1);

                        Map<String, Object> detail = new LinkedHashMap<>();
                        detail.put("id", "sess-" + sess.getId());
                        detail.put("type", "SCHEDULED_EXAM");
                        detail.put("category", "Official Scheduled Exam");
                        detail.put("title", sess.getExam() != null ? sess.getExam().getTitle() : "Scheduled Examination");
                        detail.put("score", sess.getCurrentScore());
                        detail.put("status", sess.getStatus() != null ? sess.getStatus().name() : "ATTENDED");
                        detail.put("time", dt.toLocalTime().toString().substring(0, Math.min(5, dt.toLocalTime().toString().length())));

                        activityDetails.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(detail);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to load exam sessions for heatmap: {}", e.getMessage());
            }
        }

        // 4. Calculate Past Year Metrics
        int totalSubmissionsPastYear = 0;
        int totalActiveDays = 0;
        TreeSet<LocalDate> activeDates = new TreeSet<>();

        for (Map.Entry<String, Integer> entry : submissionCalendar.entrySet()) {
            if (entry.getValue() > 0) {
                LocalDate d = LocalDate.parse(entry.getKey());
                activeDates.add(d);
                if (!d.isBefore(oneYearAgo) && !d.isAfter(today)) {
                    totalSubmissionsPastYear += entry.getValue();
                    totalActiveDays++;
                }
            }
        }

        // 5. Calculate Max Streak
        int maxStreak = 0;
        int runningStreak = 0;
        LocalDate prev = null;
        for (LocalDate d : activeDates) {
            if (prev == null || prev.plusDays(1).equals(d)) {
                runningStreak++;
            } else {
                runningStreak = 1;
            }
            if (runningStreak > maxStreak) {
                maxStreak = runningStreak;
            }
            prev = d;
        }

        // 6. Calculate Current Streak
        int currentStreak = 0;
        LocalDate checkDate = today;
        if (!activeDates.contains(checkDate)) {
            checkDate = today.minusDays(1);
        }

        if (activeDates.contains(checkDate)) {
            while (activeDates.contains(checkDate)) {
                currentStreak++;
                checkDate = checkDate.minusDays(1);
            }
        }

        result.put("totalSubmissionsPastYear", totalSubmissionsPastYear);
        result.put("totalActiveDays", totalActiveDays);
        result.put("maxStreak", maxStreak);
        result.put("currentStreak", currentStreak);
        result.put("submissionCalendar", submissionCalendar);
        result.put("activityDetails", activityDetails);

        return result;
    }

    private Map<String, Object> computeMasterVectorRecommendations(
            Map<String, Double> conceptMasteryMap,
            Map<String, Double> patternMasteryMap,
            Map<String, Double> errorProfileMap,
            Map<String, SkillMasteryEntity> masteryEntitiesByKey
    ) {
        // 1. Calculate Priority Scores for all 12 Concepts
        List<Map<String, Object>> conceptRankings = new ArrayList<>();
        for (String cKey : AdaptiveConstants.CONCEPTS) {
            double mastery = conceptMasteryMap.getOrDefault(cKey, 0.20);
            SkillMasteryEntity sm = masteryEntitiesByKey.get(cKey);
            String trend = sm != null && sm.getRecentTrend() != null ? sm.getRecentTrend() : "STABLE";
            double confidence = sm != null && sm.getConfidence() != null ? sm.getConfidence() : 0.10;

            double score = (1.0 - mastery) * 100.0;
            if ("DECLINING".equalsIgnoreCase(trend)) score += 35.0;
            score += (1.0 - confidence) * 15.0;

            // Error linkages
            double offByOneRisk = errorProfileMap.getOrDefault("OFF_BY_ONE", 0.15);
            double boundaryRisk = errorProfileMap.getOrDefault("BOUNDARY_CONDITION", 0.15);
            double nullRisk = errorProfileMap.getOrDefault("NULL_EMPTY_HANDLING", 0.15);
            double tleRisk = errorProfileMap.getOrDefault("TLE", 0.15);
            double recurrenceRisk = errorProfileMap.getOrDefault("WRONG_RECURRENCE", 0.15);

            String reason = "Core competency calibration needed.";
            if (List.of("ARRAYS", "STRINGS", "BINARY_SEARCH").contains(cKey) && (offByOneRisk > 0.40 || boundaryRisk > 0.40)) {
                score += 25.0;
                reason = "Elevated boundary & off-by-one errors (" + Math.round(Math.max(offByOneRisk, boundaryRisk) * 100) + "% risk) detected.";
            } else if (List.of("LINKED_LISTS", "TREES").contains(cKey) && nullRisk > 0.40) {
                score += 25.0;
                reason = "Null pointer & pointer update errors (" + Math.round(nullRisk * 100) + "% risk) detected.";
            } else if (List.of("DYNAMIC_PROGRAMMING", "BACKTRACKING").contains(cKey) && recurrenceRisk > 0.40) {
                score += 25.0;
                reason = "Recurrence & state transition errors (" + Math.round(recurrenceRisk * 100) + "% risk) detected.";
            } else if (tleRisk > 0.40 && List.of("HASHING", "BINARY_SEARCH", "GREEDY").contains(cKey)) {
                score += 20.0;
                reason = "Time Limit Exceeded (TLE) timeouts (" + Math.round(tleRisk * 100) + "% risk) suggest sub-optimal time complexity.";
            } else if ("DECLINING".equalsIgnoreCase(trend)) {
                reason = "Bayesian regression detected in recent sessions.";
            } else if (mastery < 0.40) {
                reason = "Low foundational mastery (" + Math.round(mastery * 100) + "%).";
            }

            Map<String, Object> rec = new HashMap<>();
            rec.put("topic", cKey);
            rec.put("type", "CONCEPT");
            rec.put("mastery", mastery);
            rec.put("priorityScore", Math.round(score * 10.0) / 10.0);
            rec.put("reason", reason);
            rec.put("trend", trend);
            conceptRankings.add(rec);
        }
        conceptRankings.sort((a, b) -> Double.compare((double) b.get("priorityScore"), (double) a.get("priorityScore")));

        // 2. Calculate Priority Scores for all 9 Patterns
        List<Map<String, Object>> patternRankings = new ArrayList<>();
        for (String pKey : AdaptiveConstants.PATTERNS) {
            double mastery = patternMasteryMap.getOrDefault(pKey, 0.20);
            SkillMasteryEntity sm = masteryEntitiesByKey.get(pKey);
            String trend = sm != null && sm.getRecentTrend() != null ? sm.getRecentTrend() : "STABLE";
            double confidence = sm != null && sm.getConfidence() != null ? sm.getConfidence() : 0.10;

            double score = (1.0 - mastery) * 110.0;
            if ("DECLINING".equalsIgnoreCase(trend)) score += 35.0;
            score += (1.0 - confidence) * 15.0;

            // Pattern error linkages
            double offByOneRisk = errorProfileMap.getOrDefault("OFF_BY_ONE", 0.15);
            double boundaryRisk = errorProfileMap.getOrDefault("BOUNDARY_CONDITION", 0.15);
            double tleRisk = errorProfileMap.getOrDefault("TLE", 0.15);
            double mleRisk = errorProfileMap.getOrDefault("MLE", 0.15);

            String reason = "Algorithmic pattern reinforcement recommended.";
            if (List.of("TWO_POINTERS", "SLIDING_WINDOW", "BINARY_SEARCH_PATTERN").contains(pKey) && (offByOneRisk > 0.40 || boundaryRisk > 0.40)) {
                score += 30.0;
                reason = "Elevated boundary & off-by-one errors (" + Math.round(Math.max(offByOneRisk, boundaryRisk) * 100) + "% risk) directly impact this pattern.";
            } else if (List.of("DFS", "BFS", "UNION_FIND").contains(pKey) && mleRisk > 0.40) {
                score += 25.0;
                reason = "Memory Limit Exceeded / recursion depth errors (" + Math.round(mleRisk * 100) + "% risk) detected in graph traversals.";
            } else if (List.of("HEAP", "MONOTONIC_STACK", "PREFIX_SUM").contains(pKey) && tleRisk > 0.40) {
                score += 25.0;
                reason = "Time complexity bottlenecks (" + Math.round(tleRisk * 100) + "% TLE risk) can be solved by optimal O(N) pattern caching.";
            } else if ("DECLINING".equalsIgnoreCase(trend)) {
                reason = "Bayesian regression detected in recent sessions.";
            } else if (mastery < 0.40) {
                reason = "Sub-optimal pattern recognition index (" + Math.round(mastery * 100) + "%).";
            }

            Map<String, Object> rec = new HashMap<>();
            rec.put("topic", pKey);
            rec.put("type", "PATTERN");
            rec.put("mastery", mastery);
            rec.put("priorityScore", Math.round(score * 10.0) / 10.0);
            rec.put("reason", reason);
            rec.put("trend", trend);
            patternRankings.add(rec);
        }
        patternRankings.sort((a, b) -> Double.compare((double) b.get("priorityScore"), (double) a.get("priorityScore")));

        // 3. Combined Master Vector Next Focus Areas
        List<Map<String, Object>> combined = new ArrayList<>();
        combined.addAll(conceptRankings);
        combined.addAll(patternRankings);
        combined.sort((a, b) -> Double.compare((double) b.get("priorityScore"), (double) a.get("priorityScore")));

        Map<String, Object> topOverall = combined.get(0);
        String recTopic = (String) topOverall.get("topic");
        String recType = (String) topOverall.get("type");
        String recReason = (String) topOverall.get("reason");

        return Map.of(
                "recommendedTopic", recTopic,
                "recommendedType", recType,
                "remediationReason", recReason,
                "isRemediationRecommended", "DECLINING".equalsIgnoreCase((String) topOverall.get("trend")) || (double) topOverall.get("priorityScore") >= 80.0,
                "recommendedConcepts", conceptRankings.subList(0, Math.min(3, conceptRankings.size())),
                "recommendedPatterns", patternRankings.subList(0, Math.min(3, patternRankings.size())),
                "nextFocusAreas", combined.subList(0, Math.min(4, combined.size()))
        );
    }

    /**
     * Official Scheduled Assessment Vector (Isolated from Adaptive Coach).
     */
    public Map<String, Object> getOfficialAssessmentSummary(AuthEntity user) {
        List<ExamSubmissionEntity> submissions = submissionRepository.findByStudentEmailOrderBySubmittedAtDesc(user.getEmail());

        int totalExams = submissions.size();
        int passedExams = 0;
        int totalScore = 0;
        int totalMarks = 0;

        // 6 Standard Academic Competencies
        Map<String, List<Double>> domainScores = new HashMap<>();
        List.of("DATA_STRUCTURES", "ALGORITHMS", "DATABASE_SYSTEMS", "OBJECT_ORIENTED_PROGRAMMING", "SYSTEM_DESIGN", "WEB_TECHNOLOGIES")
                .forEach(d -> domainScores.put(d, new ArrayList<>()));

        for (ExamSubmissionEntity sub : submissions) {
            int sc = sub.getScore() != null ? sub.getScore() : 0;
            int tm = (sub.getExam() != null && sub.getExam().getTotalMarks() > 0) ? sub.getExam().getTotalMarks() : 100;
            totalScore += sc;
            totalMarks += tm;

            double ratio = (double) sc / Math.max(1, tm);
            if (sc >= (tm / 2)) {
                passedExams++;
            }

            String title = (sub.getExam() != null && sub.getExam().getTitle() != null) ? sub.getExam().getTitle().toUpperCase() : "";
            if (title.contains("DATABASE") || title.contains("SQL")) {
                domainScores.get("DATABASE_SYSTEMS").add(ratio);
            } else if (title.contains("SYSTEM") || title.contains("DESIGN")) {
                domainScores.get("SYSTEM_DESIGN").add(ratio);
            } else if (title.contains("WEB") || title.contains("FRONTEND") || title.contains("REACT")) {
                domainScores.get("WEB_TECHNOLOGIES").add(ratio);
            } else if (title.contains("JAVA") || title.contains("OOP") || title.contains("PYTHON")) {
                domainScores.get("OBJECT_ORIENTED_PROGRAMMING").add(ratio);
            } else if (title.contains("ALGORITHM") || title.contains("CODING")) {
                domainScores.get("ALGORITHMS").add(ratio);
            } else {
                domainScores.get("DATA_STRUCTURES").add(ratio);
            }
        }

        List<Map<String, Object>> academicVector = new ArrayList<>();
        for (Map.Entry<String, List<Double>> entry : domainScores.entrySet()) {
            double avg = entry.getValue().isEmpty() ? 0.70 : entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.70);
            academicVector.add(Map.of(
                    "subject", entry.getKey(),
                    "scorePercent", Math.round(avg * 100.0),
                    "mastery", Math.round(avg * 100.0) / 100.0,
                    "assessmentsCount", entry.getValue().size()
            ));
        }

        int passRate = totalExams > 0 ? Math.round((float) passedExams / totalExams * 100) : 0;
        int avgAccuracy = totalMarks > 0 ? Math.round((float) totalScore / totalMarks * 100) : 0;

        return Map.of(
                "totalOfficialExams", totalExams,
                "passedOfficialExams", passedExams,
                "passRate", passRate,
                "averageAccuracy", avgAccuracy,
                "officialAcademicVector", academicVector
        );
    }

    @Transactional
    public AdaptiveTrainingExamEntity createTrainingSession(AuthEntity user, String requestedTopic) {
        LearnerModelEntity model = getOrCreateLearnerModel(user);

        String targetTopic = (requestedTopic != null && !requestedTopic.isBlank() && !"AUTO".equalsIgnoreCase(requestedTopic))
                ? requestedTopic.trim().toUpperCase()
                : findWeakestDsaSkill(model.getSkillMasteries());

        boolean isPattern = AdaptiveConstants.PATTERNS.contains(targetTopic);
        String dimensionType = isPattern ? "PATTERN" : "CONCEPT";

        // Get current topic Bayesian mastery and IRT parameters
        SkillMasteryEntity targetSm = model.getSkillMasteries().stream()
                .filter(sm -> sm.getDimensionKey() != null && sm.getDimensionKey().equalsIgnoreCase(targetTopic) && dimensionType.equals(sm.getDimensionType()))
                .findFirst()
                .orElse(null);

        double currentMastery = targetSm != null && targetSm.getMastery() != null ? targetSm.getMastery() : 0.25;
        double irtTheta = targetSm != null && targetSm.getIrtTheta() != null ? targetSm.getIrtTheta() : -1.5;
        double bktPrior = targetSm != null && targetSm.getBktPrior() != null ? targetSm.getBktPrior() : currentMastery;
        double confidence = targetSm != null && targetSm.getConfidence() != null ? targetSm.getConfidence() : 0.10;

        List<String> topErrors = model.getSkillMasteries().stream()
                .filter(sm -> "ERROR_PROFILE".equals(sm.getDimensionType()))
                .filter(sm -> sm.getErrorRiskProbability() != null && sm.getErrorRiskProbability() >= 0.20)
                .sorted((a, b) -> Double.compare(b.getErrorRiskProbability(), a.getErrorRiskProbability()))
                .limit(2)
                .map(sm -> sm.getDimensionKey() + " (" + Math.round(sm.getErrorRiskProbability() * 100) + "% risk)")
                .toList();
        String errorFocus = topErrors.isEmpty() ? "GENERAL_BOUNDARY_RESILIENCE" : String.join(", ", topErrors);

        String targetDifficulty = resolveDifficultyZpd(currentMastery);
        String learningObjective = isPattern
                ? "Calibrate algorithmic pattern mastery in " + targetTopic + " to advance beyond " + targetDifficulty + " problems."
                : "Calibrate core concept mastery in " + targetTopic + " to advance beyond " + targetDifficulty + " problems.";

        AdaptiveTrainingExamEntity exam = new AdaptiveTrainingExamEntity();
        exam.setUser(user);
        exam.setTargetSkill(targetTopic);
        exam.setDifficulty(targetDifficulty);
        exam.setTotalQuestions(3);
        exam.setScore(0.0);
        exam.setOldMastery(currentMastery);
        exam.setStartedAt(LocalDateTime.now());

        List<AdaptiveTrainingQuestionEntity> questions = generate3AdaptiveQuestions(
                exam, targetTopic, currentMastery, targetDifficulty, learningObjective, irtTheta, bktPrior, confidence, errorFocus
        );
        for (AdaptiveTrainingQuestionEntity q : questions) {
            exam.addQuestion(q);
        }

        AdaptiveTrainingExamEntity saved = trainingExamRepo.save(exam);
        if (user != null && redisCacheService != null) {
            redisCacheService.delete("proctorx:active_exam:" + user.getId());
        }
        return saved;
    }

    @Transactional
    public Map<String, Object> submitTrainingSession(AuthEntity user, Long examId, List<Map<String, Object>> answers) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized to submit session");
        }

        if (exam.isCompleted() || "TERMINATED_MALPRACTICE".equalsIgnoreCase(exam.getStatus()) || "COMPLETED".equalsIgnoreCase(exam.getStatus())) {
            throw new IllegalStateException("EXAM_ALREADY_SUBMITTED");
        }

        LearnerModelEntity model = getOrCreateLearnerModel(user);
        String targetSkill = exam.getTargetSkill();

        int passedQuestionsCount = 0;
        int totalPassedTcs = 0;
        int totalTcs = 0;
        double sumEvidence = 0.0;
        Map<String, Integer> errorDetections = new HashMap<>();

        for (AdaptiveTrainingQuestionEntity q : exam.getQuestions()) {
            Optional<Map<String, Object>> ansOpt = answers.stream()
                    .filter(a -> q.getId().equals(a.get("questionId")) || String.valueOf(q.getId()).equals(String.valueOf(a.get("questionId"))))
                    .findFirst();

            int passedTcCount = 0;
            int totalTcCount = 3;
            int attempts = 1;
            int durationSeconds = 60;
            int violations = 0;
            String userCode = "";
            String userLang = "java";

            if (ansOpt.isPresent()) {
                Map<String, Object> ans = ansOpt.get();
                userCode = (String) ans.getOrDefault("code", "");
                userLang = (String) ans.getOrDefault("language", "java");
                attempts = (ans.get("attempts") instanceof Number n) ? n.intValue() : 1;
                durationSeconds = (ans.get("durationSeconds") instanceof Number n) ? n.intValue() : 60;
                violations = (ans.get("proctorViolations") instanceof Number n) ? n.intValue() : 0;

                if (ans.containsKey("detectedErrors") && ans.get("detectedErrors") instanceof List<?> list) {
                    for (Object o : list) {
                        if (o != null) {
                            String errName = o.toString();
                            errorDetections.put(errName, errorDetections.getOrDefault(errName, 0) + 1);
                        }
                    }
                }

                if (ans.containsKey("passedCount") && ans.get("passedCount") instanceof Number n) {
                    passedTcCount = n.intValue();
                } else if (!userCode.isBlank()) {
                    try {
                        List<Map<String, Object>> tcs = objectMapper.readValue(q.getTestCasesJson(), new TypeReference<List<Map<String, Object>>>() {});
                        totalTcCount = tcs.size();
                        for (Map<String, Object> tc : tcs) {
                            String input = (String) tc.getOrDefault("input", "");
                            String expected = (String) tc.getOrDefault("expectedOutput", "");
                            CodeExecutionResult res = executionRouter.execute(userLang, userCode, input);
                            String output = res.success() ? res.output() : res.stdout();
                            if (output != null && output.trim().equals(expected.trim())) {
                                passedTcCount++;
                            } else {
                                detectErrorTypes(output, res.error(), List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TLE", "NULL_EMPTY_HANDLING"), errorDetections);
                            }
                        }
                    } catch (Exception e) {
                        detectErrorTypes("", e.getMessage(), List.of("COMPILATION_SYNTAX_ERROR"), errorDetections);
                    }
                }
            }

            totalTcs += totalTcCount;
            totalPassedTcs += passedTcCount;

            if (passedTcCount == totalTcCount && totalTcCount > 0) {
                passedQuestionsCount++;
            }

            double rawRatio = (double) passedTcCount / Math.max(1, totalTcCount);
            double evidence = computeEffectiveEvidence(rawRatio, attempts, durationSeconds, violations);
            sumEvidence += evidence;
        }

        double avgEvidence = sumEvidence / Math.max(1, exam.getQuestions().size());

        // Update Target Skill via BKT
        double oldMastery = 0.25;
        double newMastery = 0.25;
        double growthDelta = 0.0;
        List<Map<String, Object>> vectorUpdates = new ArrayList<>();

        boolean isConceptTarget = AdaptiveConstants.CONCEPTS.contains(targetSkill);
        boolean isPatternTarget = AdaptiveConstants.PATTERNS.contains(targetSkill);

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if (sm.getDimensionKey().equalsIgnoreCase(targetSkill) &&
                    (("CONCEPT".equals(sm.getDimensionType()) && isConceptTarget) ||
                            ("PATTERN".equals(sm.getDimensionType()) && isPatternTarget))) {

                oldMastery = sm.getMastery();
                double diffB = resolveDifficultyParameter(exam.getDifficulty());
                newMastery = computeBktIrtPosterior(sm.getBktPrior(), diffB, avgEvidence, 1, 120, 0);
                growthDelta = Math.round((newMastery - oldMastery) * 100.0) / 100.0;

                sm.setGrowthDelta(growthDelta);
                sm.setMastery(newMastery);
                sm.setBktPrior(newMastery);
                sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                sm.setConfidence(Math.min(0.95, (sm.getConfidence() != null ? sm.getConfidence() : 0.1) + 0.08));
                sm.setEvidenceCount((sm.getEvidenceCount() != null ? sm.getEvidenceCount() : 0) + 3);
                sm.setQuestionsAttempted((sm.getQuestionsAttempted() != null ? sm.getQuestionsAttempted() : 0) + 3);
                sm.setQuestionsSolved((sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0) + passedQuestionsCount);
                
                sm.setRankXp(AdaptiveConstants.calculateRankXp(newMastery, sm.getQuestionsSolved()));
                sm.setRankTier(AdaptiveConstants.calculateRankTier(sm.getRankXp()));
                
                sm.setRecentTrend(growthDelta >= 0.03 ? "IMPROVING" : (growthDelta <= -0.03 ? "DECLINING" : "STABLE"));
                sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, growthDelta, exam.getDifficulty()));
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", sm.getDimensionType());
                u.put("oldMastery", oldMastery);
                u.put("newMastery", newMastery);
                u.put("delta", growthDelta);
                u.put("impact", "PRIMARY_TARGET");
                vectorUpdates.add(u);
            }
        }

        // Tiered Multi-Hop Knowledge Graph Reflection:
        // 1. Explicit Question Patterns (50% impact)
        Set<String> explicitPatternsInExam = new HashSet<>();
        for (AdaptiveTrainingQuestionEntity q : exam.getQuestions()) {
            if (q.getPattern() != null && !q.getPattern().isBlank()) {
                explicitPatternsInExam.add(q.getPattern().toUpperCase());
            }
        }

        // 2. Multi-Hop Propagation
        if (isConceptTarget) {
            List<String> linkedPatterns = AdaptiveConstants.CONCEPT_TO_PATTERNS.getOrDefault(targetSkill, Collections.emptyList());
            List<String> adjacentConcepts = AdaptiveConstants.CONCEPT_GRAPH_NEIGHBORS.getOrDefault(targetSkill, Collections.emptyList());

            for (SkillMasteryEntity sm : model.getSkillMasteries()) {
                if ("PATTERN".equals(sm.getDimensionType())) {
                    String pKey = sm.getDimensionKey();
                    boolean isExplicit = explicitPatternsInExam.contains(pKey);
                    boolean isLinked = linkedPatterns.contains(pKey);
                    double factor = isExplicit
                            ? AdaptiveConstants.QUESTION_PATTERN_WEIGHT
                            : (isLinked ? AdaptiveConstants.LINKED_PATTERN_WEIGHT : 0.0);

                    if (factor > 0.0) {
                        double oldP = sm.getMastery();
                        double crossDelta = Math.round((growthDelta * factor) * 100.0) / 100.0;
                        double crossNewMastery = Math.max(0.10, Math.min(0.98, Math.round((sm.getMastery() + crossDelta) * 100.0) / 100.0));
                        sm.setGrowthDelta(crossDelta);
                        sm.setMastery(crossNewMastery);
                        sm.setBktPrior(crossNewMastery);
                        sm.setConfidence(Math.min(0.90, (sm.getConfidence() != null ? sm.getConfidence() : 0.1) + 0.04));
                        sm.setRankXp(AdaptiveConstants.calculateRankXp(crossNewMastery, sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0));
                        sm.setRankTier(AdaptiveConstants.calculateRankTier(sm.getRankXp()));
                        sm.setRecentTrend(crossDelta >= 0.02 ? "IMPROVING" : (crossDelta <= -0.02 ? "DECLINING" : "STABLE"));
                        sm.setLastAssessedAt(LocalDateTime.now());

                        Map<String, Object> u = new HashMap<>();
                        u.put("dimension", pKey);
                        u.put("type", "PATTERN");
                        u.put("oldMastery", oldP);
                        u.put("newMastery", crossNewMastery);
                        u.put("delta", crossDelta);
                        u.put("impact", isExplicit ? "QUESTION_PATTERN" : "LINKED_PATTERN");
                        vectorUpdates.add(u);
                    }
                } else if ("CONCEPT".equals(sm.getDimensionType()) && !sm.getDimensionKey().equalsIgnoreCase(targetSkill)) {
                    String cKey = sm.getDimensionKey();
                    if (adjacentConcepts.contains(cKey)) {
                        // Subtle ripple to connected concept graph neighbors (18% impact)
                        double oldC = sm.getMastery();
                        double crossDelta = Math.round((growthDelta * AdaptiveConstants.GRAPH_NEIGHBOR_WEIGHT) * 100.0) / 100.0;
                        double crossNewMastery = Math.max(0.10, Math.min(0.98, Math.round((sm.getMastery() + crossDelta) * 100.0) / 100.0));
                        sm.setGrowthDelta(crossDelta);
                        sm.setMastery(crossNewMastery);
                        sm.setBktPrior(crossNewMastery);
                        sm.setConfidence(Math.min(0.85, (sm.getConfidence() != null ? sm.getConfidence() : 0.1) + 0.02));
                        sm.setRankXp(AdaptiveConstants.calculateRankXp(crossNewMastery, sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0));
                        sm.setRankTier(AdaptiveConstants.calculateRankTier(sm.getRankXp()));
                        sm.setRecentTrend(crossDelta >= 0.02 ? "IMPROVING" : (crossDelta <= -0.02 ? "DECLINING" : "STABLE"));
                        sm.setLastAssessedAt(LocalDateTime.now());

                        Map<String, Object> u = new HashMap<>();
                        u.put("dimension", cKey);
                        u.put("type", "CONCEPT");
                        u.put("oldMastery", oldC);
                        u.put("newMastery", crossNewMastery);
                        u.put("delta", crossDelta);
                        u.put("impact", "GRAPH_NEIGHBOR");
                        vectorUpdates.add(u);
                    }
                }
            }
        } else if (isPatternTarget) {
            List<String> linkedConcepts = AdaptiveConstants.PATTERN_TO_CONCEPTS.getOrDefault(targetSkill, Collections.emptyList());
            for (SkillMasteryEntity sm : model.getSkillMasteries()) {
                if ("CONCEPT".equals(sm.getDimensionType()) && linkedConcepts.contains(sm.getDimensionKey())) {
                    double oldC = sm.getMastery();
                    double crossDelta = Math.round((growthDelta * AdaptiveConstants.QUESTION_PATTERN_WEIGHT) * 100.0) / 100.0;
                    double crossNewMastery = Math.max(0.10, Math.min(0.98, Math.round((sm.getMastery() + crossDelta) * 100.0) / 100.0));
                    sm.setGrowthDelta(crossDelta);
                    sm.setMastery(crossNewMastery);
                    sm.setBktPrior(crossNewMastery);
                    sm.setConfidence(Math.min(0.90, (sm.getConfidence() != null ? sm.getConfidence() : 0.1) + 0.04));
                    sm.setRankXp(AdaptiveConstants.calculateRankXp(crossNewMastery, sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0));
                    sm.setRankTier(AdaptiveConstants.calculateRankTier(sm.getRankXp()));
                    sm.setRecentTrend(crossDelta >= 0.02 ? "IMPROVING" : (crossDelta <= -0.02 ? "DECLINING" : "STABLE"));
                    sm.setLastAssessedAt(LocalDateTime.now());

                    Map<String, Object> u = new HashMap<>();
                    u.put("dimension", sm.getDimensionKey());
                    u.put("type", "CONCEPT");
                    u.put("oldMastery", oldC);
                    u.put("newMastery", crossNewMastery);
                    u.put("delta", crossDelta);
                    u.put("impact", "LINKED_CONCEPT");
                    vectorUpdates.add(u);
                }
            }
        }

        // Update Competencies & Live Error Taxonomy Profiles
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("COMPETENCY".equals(sm.getDimensionType())) {
                double oldComp = sm.getMastery() != null ? sm.getMastery() : 0.20;
                double delta = (avgEvidence >= 0.66) ? 0.03 : (avgEvidence <= 0.33 ? -0.03 : 0.0);
                double nextVal = Math.max(0.10, Math.min(0.95, Math.round((oldComp + delta) * 100.0) / 100.0));
                double actualDelta = Math.round((nextVal - oldComp) * 100.0) / 100.0;
                sm.setGrowthDelta(actualDelta);
                sm.setMastery(nextVal);
                sm.setEvidenceCount((sm.getEvidenceCount() != null ? sm.getEvidenceCount() : 0) + 1);
                sm.setRecentTrend(actualDelta > 0 ? "IMPROVING" : (actualDelta < 0 ? "DECLINING" : "STABLE"));
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", "COMPETENCY");
                u.put("oldMastery", oldComp);
                u.put("newMastery", nextVal);
                u.put("delta", actualDelta);
                u.put("impact", actualDelta > 0 ? "COGNITIVE_GROWTH" : (actualDelta < 0 ? "COGNITIVE_DECAY" : "MAINTAINED"));
                vectorUpdates.add(u);
            } else if ("ERROR_PROFILE".equals(sm.getDimensionType())) {
                int detected = errorDetections.getOrDefault(sm.getDimensionKey(), 0);
                double currentRisk = sm.getErrorRiskProbability() != null ? sm.getErrorRiskProbability() : 0.15;
                double adjustment = 0.0;
                if (detected > 0) {
                    adjustment = Math.min(0.35, 0.12 * detected);
                } else if (passedQuestionsCount >= 2) {
                    adjustment = -0.04;
                }
                double nextRisk = Math.max(0.05, Math.min(0.90, Math.round((currentRisk + adjustment) * 100.0) / 100.0));
                double riskDelta = Math.round((nextRisk - currentRisk) * 100.0) / 100.0;
                sm.setErrorRiskProbability(nextRisk);
                sm.setMastery(nextRisk);
                sm.setGrowthDelta(riskDelta);
                sm.setLastAssessedAt(LocalDateTime.now());

                if (detected > 0 || Math.abs(riskDelta) > 0.01) {
                    Map<String, Object> u = new HashMap<>();
                    u.put("dimension", sm.getDimensionKey());
                    u.put("type", "ERROR_PROFILE");
                    u.put("oldMastery", currentRisk);
                    u.put("newMastery", nextRisk);
                    u.put("delta", riskDelta);
                    u.put("impact", detected > 0 ? "BUG_PATTERN_TRIGGERED" : "RISK_MITIGATED");
                    vectorUpdates.add(u);
                }
            }
        }

        exam.setScore((double) Math.round((float) totalPassedTcs / Math.max(1, totalTcs) * 100));
        exam.setPassedQuestions(passedQuestionsCount);
        exam.setTotalTestCasesPassed(totalPassedTcs);
        exam.setTotalTestCasesTotal(totalTcs);
        exam.setOldMastery(oldMastery);
        exam.setNewMastery(newMastery);
        exam.setMasteryDelta(growthDelta);
        exam.setRecentTrend(growthDelta >= 0.03 ? "IMPROVING" : (growthDelta <= -0.03 ? "DECLINING" : "STABLE"));
        exam.setCompleted(true);
        exam.setStatus("COMPLETED");
        exam.setCompletedAt(LocalDateTime.now());
        try {
            exam.setVectorUpdatesJson(objectMapper.writeValueAsString(vectorUpdates));
        } catch (Exception ignored) {}
        trainingExamRepo.save(exam);

        model.setTotalQuestionsSolved((model.getTotalQuestionsSolved() != null ? model.getTotalQuestionsSolved() : 0) + passedQuestionsCount);
        model.setTotalSessionsCompleted((model.getTotalSessionsCompleted() != null ? model.getTotalSessionsCompleted() : 0) + 1);
        model.setOverallReadiness(calculateOverallReadiness(model.getSkillMasteries()));
        model.setLastPracticedAt(LocalDateTime.now());
        learnerModelRepo.save(model);

        if (model.getUser() != null && redisCacheService != null) {
            redisCacheService.delete("proctorx:learner_model:" + model.getUser().getId());
            redisCacheService.delete("proctorx:active_exam:" + model.getUser().getId());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("examId", examId);
        result.put("score", exam.getScore());
        result.put("passedQuestions", passedQuestionsCount);
        result.put("totalQuestions", exam.getTotalQuestions());
        result.put("targetSkill", targetSkill);
        result.put("oldMastery", oldMastery);
        result.put("newMastery", newMastery);
        result.put("masteryDelta", Math.round(growthDelta * 100.0) / 100.0);
        result.put("recentTrend", growthDelta >= 0.03 ? "IMPROVING" : (growthDelta <= -0.03 ? "DECLINING" : "STABLE"));
        result.put("overallReadiness", model.getOverallReadiness());
        result.put("vectorUpdates", vectorUpdates);
        return result;
    }

    @Transactional
    public Map<String, Object> terminateTrainingSessionForMalpractice(AuthEntity user, Long examId, int violationCount) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized to terminate session");
        }

        if (exam.isCompleted() || "TERMINATED_MALPRACTICE".equalsIgnoreCase(exam.getStatus()) || "COMPLETED".equalsIgnoreCase(exam.getStatus())) {
            return Map.of(
                    "status", exam.getStatus() != null ? exam.getStatus() : "TERMINATED_MALPRACTICE",
                    "alreadyFinalized", true,
                    "message", "Session was already finalized."
            );
        }

        LearnerModelEntity model = getOrCreateLearnerModel(user);
        ensureAllDimensionsExist(model);
        String targetSkill = exam.getTargetSkill();
        if (targetSkill == null || targetSkill.isBlank() || "AUTO".equalsIgnoreCase(targetSkill)) {
            if (!exam.getQuestions().isEmpty() && exam.getQuestions().get(0).getTopic() != null) {
                targetSkill = exam.getQuestions().get(0).getTopic();
            } else {
                targetSkill = findWeakestDsaSkill(model.getSkillMasteries());
            }
            exam.setTargetSkill(targetSkill);
        }

        // Find authoritative matching SkillMasteryEntity to determine exact current starting mastery
        SkillMasteryEntity targetSm = null;
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if (sm.getDimensionKey() != null && targetSkill != null) {
                String cleanSm = sm.getDimensionKey().replaceAll("[_\\s-]", "").toLowerCase();
                String cleanTarget = targetSkill.replaceAll("[_\\s-]", "").toLowerCase();
                if (cleanSm.equals(cleanTarget)) {
                    targetSm = sm;
                    break;
                }
            }
        }

        int xpPenalty = 150;
        double masteryPenalty = -0.10;
        List<Map<String, Object>> malpracticeUpdates = new ArrayList<>();

        double startingMastery = (targetSm != null && targetSm.getMastery() != null)
                ? targetSm.getMastery()
                : (exam.getOldMastery() != null ? exam.getOldMastery() : 0.10);
        double finalNewMastery = Math.max(0.10, Math.round((startingMastery + masteryPenalty) * 100.0) / 100.0);
        double finalDelta = Math.round((finalNewMastery - startingMastery) * 100.0) / 100.0;
        int actualXpPenalty = 0;

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            boolean matches = false;
            if (sm.getDimensionKey() != null && targetSkill != null) {
                String cleanSm = sm.getDimensionKey().replaceAll("[_\\s-]", "").toLowerCase();
                String cleanTarget = targetSkill.replaceAll("[_\\s-]", "").toLowerCase();
                matches = cleanSm.equals(cleanTarget);
            }
            if (matches) {
                double currentMastery = sm.getMastery() != null ? sm.getMastery() : startingMastery;
                startingMastery = currentMastery;
                finalNewMastery = Math.max(0.10, Math.round((currentMastery + masteryPenalty) * 100.0) / 100.0);
                finalDelta = Math.round((finalNewMastery - currentMastery) * 100.0) / 100.0;

                sm.setMastery(finalNewMastery);
                sm.setBktPrior(finalNewMastery);
                sm.setRecentTrend("DECLINING");
                sm.setGrowthDelta(finalDelta);

                int currentXp = sm.getRankXp() != null ? sm.getRankXp() : 0;
                int newXp = Math.max(0, currentXp - xpPenalty);
                actualXpPenalty = currentXp - newXp;
                sm.setRankXp(newXp);
                sm.setRankTier(AdaptiveConstants.calculateRankTier(newXp));

                sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), finalNewMastery, finalDelta, "MALPRACTICE_HALT"));
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", sm.getDimensionType());
                u.put("oldMastery", currentMastery);
                u.put("newMastery", finalNewMastery);
                u.put("delta", finalDelta);
                u.put("xpPenalty", -actualXpPenalty);
                u.put("impact", "MALPRACTICE_HALT");
                malpracticeUpdates.add(u);
            } else if ("COMPETENCY".equals(sm.getDimensionType())) {
                // Cognitive competencies penalization on repeated security breach
                double compCurrent = sm.getMastery() != null ? sm.getMastery() : 0.20;
                double compPenalty = -0.04;
                double compNew = Math.max(0.10, Math.round((compCurrent + compPenalty) * 100.0) / 100.0);
                double compDelta = Math.round((compNew - compCurrent) * 100.0) / 100.0;
                sm.setMastery(compNew);
                sm.setGrowthDelta(compDelta);
                sm.setRecentTrend("DECLINING");
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> cu = new HashMap<>();
                cu.put("dimension", sm.getDimensionKey());
                cu.put("type", "COMPETENCY");
                cu.put("oldMastery", compCurrent);
                cu.put("newMastery", compNew);
                cu.put("delta", compDelta);
                cu.put("impact", "MALPRACTICE_DECAY");
                malpracticeUpdates.add(cu);
            }
        }

        exam.setCompleted(true);
        exam.setStatus("TERMINATED_MALPRACTICE");
        exam.setScore(0.0);
        exam.setMalpracticeScore(Math.min(100, Math.max(50, violationCount * 35)));
        exam.setRankXpPenalty(actualXpPenalty);
        exam.setOldMastery(startingMastery);
        exam.setNewMastery(finalNewMastery);
        exam.setMasteryDelta(finalDelta);
        exam.setRecentTrend("DECLINING");
        exam.setCompletedAt(LocalDateTime.now());
        try {
            exam.setVectorUpdatesJson(objectMapper.writeValueAsString(malpracticeUpdates));
        } catch (Exception ignored) {}
        trainingExamRepo.save(exam);

        model.setOverallReadiness(calculateOverallReadiness(model.getSkillMasteries()));
        model.setUpdatedAt(LocalDateTime.now());
        learnerModelRepo.save(model);

        if (user != null && redisCacheService != null) {
            redisCacheService.delete("proctorx:learner_model:" + user.getId());
            redisCacheService.delete("proctorx:active_exam:" + user.getId());
        }

        return Map.of(
                "status", "TERMINATED_MALPRACTICE",
                "targetSkill", targetSkill,
                "malpracticeScore", exam.getMalpracticeScore(),
                "rankXpPenalty", actualXpPenalty,
                "masteryPenalty", finalDelta,
                "overallReadiness", model.getOverallReadiness(),
                "vectorUpdates", malpracticeUpdates
        );
    }

    @Transactional
    public Map<String, Object> getActiveTrainingSession(AuthEntity user) {
        if (user == null) return null;
        String cacheKey = "proctorx:active_exam:" + user.getId();
        Map<String, Object> cached = redisCacheService.get(cacheKey, new TypeReference<Map<String, Object>>() {});
        if (cached != null) {
            try {
                String expiresAtStr = (String) cached.get("expiresAt");
                if (expiresAtStr != null) {
                    LocalDateTime expires = LocalDateTime.parse(expiresAtStr);
                    long remSec = java.time.Duration.between(LocalDateTime.now(), expires).getSeconds();
                    if (remSec > 0) {
                        Map<String, Object> updated = new HashMap<>(cached);
                        updated.put("remainingSeconds", remSec);
                        return updated;
                    } else {
                        redisCacheService.delete(cacheKey);
                    }
                }
            } catch (Exception ignored) {}
        }

        List<AdaptiveTrainingExamEntity> userExams = trainingExamRepo.findByUserOrderByStartedAtDesc(user);
        LocalDateTime now = LocalDateTime.now();

        for (AdaptiveTrainingExamEntity exam : userExams) {
            if (!exam.isCompleted() && "IN_PROGRESS".equalsIgnoreCase(exam.getStatus())) {
                LocalDateTime started = exam.getStartedAt() != null ? exam.getStartedAt() : now;
                LocalDateTime expires = exam.getExpiresAt() != null ? exam.getExpiresAt() : started.plusMinutes(30);

                if (now.isAfter(expires) || exam.getReconnectCount() >= 3) {
                    // Grace window (30m) or 3 reconnects exceeded -> expire with No Result & No cheating score
                    exam.setCompleted(true);
                    exam.setStatus("EXPIRED_ABANDONED");
                    exam.setScore(0.0);
                    exam.setCompletedAt(now);
                    trainingExamRepo.save(exam);
                    redisCacheService.delete(cacheKey);
                    continue;
                }

                // Active valid session!
                long remainingSeconds = java.time.Duration.between(now, expires).getSeconds();

                List<Map<String, Object>> questionsDto = exam.getQuestions().stream().map(q -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id", q.getId());
                    dto.put("title", q.getTitle());
                    dto.put("pattern", q.getPattern());
                    dto.put("description", q.getDescription());
                    dto.put("problemStatement", q.getDescription());
                    dto.put("difficulty", q.getDifficulty());
                    dto.put("solutionOutline", q.getSolutionOutline());
                    dto.put("generationSource", q.getGenerationSource());
                    dto.put("modelName", q.getModelName());
                    dto.put("targetIrtTheta", q.getTargetIrtTheta());
                    dto.put("targetBktMastery", q.getTargetBktMastery());
                    dto.put("calibratedErrorFocus", q.getCalibratedErrorFocus());
                    dto.put("testCases", parseTestCases(q.getTestCasesJson()));
                    return dto;
                }).toList();

                Map<String, Object> response = new HashMap<>();
                response.put("sessionId", exam.getId());
                response.put("targetSkill", exam.getTargetSkill());
                response.put("difficulty", exam.getDifficulty());
                response.put("learningObjective", exam.getLearningObjective());
                response.put("totalQuestions", exam.getTotalQuestions());
                response.put("startedAt", started.toString());
                response.put("expiresAt", expires.toString());
                response.put("remainingSeconds", Math.max(0, remainingSeconds));
                response.put("reconnectCount", exam.getReconnectCount());
                response.put("maxReconnects", 3);
                response.put("questions", questionsDto);

                redisCacheService.set(cacheKey, response, Math.max(1, remainingSeconds), TimeUnit.SECONDS);
                return response;
            }
        }

        redisCacheService.delete(cacheKey);
        return null;
    }

    @Transactional
    public Map<String, Object> reconnectToTrainingSession(AuthEntity user, Long examId) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expires = exam.getExpiresAt() != null ? exam.getExpiresAt() : exam.getStartedAt().plusMinutes(30);

        if (exam.isCompleted() || now.isAfter(expires) || exam.getReconnectCount() >= 3) {
            exam.setCompleted(true);
            exam.setStatus("EXPIRED_ABANDONED");
            trainingExamRepo.save(exam);
            redisCacheService.delete("proctorx:active_exam:" + user.getId());
            throw new IllegalStateException("Session expired or maximum 3 reconnect attempts exceeded.");
        }

        exam.setReconnectCount(exam.getReconnectCount() + 1);
        trainingExamRepo.save(exam);
        redisCacheService.delete("proctorx:active_exam:" + user.getId());

        return getActiveTrainingSession(user);
    }

    @Transactional
    public Map<String, Object> discardActiveTrainingSession(AuthEntity user, Long examId) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized");
        }

        LearnerModelEntity model = getOrCreateLearnerModel(user);
        String targetSkill = exam.getTargetSkill();

        // Minor controlled deduction for discarding (15 XP penalty, -0.015 mastery delta)
        int xpPenalty = 15;
        double masteryPenalty = -0.015;

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if (sm.getDimensionKey().equalsIgnoreCase(targetSkill)) {
                double currentMastery = sm.getMastery() != null ? sm.getMastery() : 0.20;
                double newMastery = Math.max(0.10, Math.round((currentMastery + masteryPenalty) * 1000.0) / 1000.0);
                sm.setMastery(newMastery);
                sm.setBktPrior(newMastery);
                sm.setGrowthDelta(masteryPenalty);

                int currentXp = sm.getRankXp() != null ? sm.getRankXp() : 30;
                int newXp = Math.max(0, currentXp - xpPenalty);
                sm.setRankXp(newXp);
                sm.setRankTier(AdaptiveConstants.calculateRankTier(newXp));
                sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, masteryPenalty, "DISCARDED"));
                sm.setLastAssessedAt(LocalDateTime.now());
            }
        }

        model.setOverallReadiness(calculateOverallReadiness(model.getSkillMasteries()));
        model.setUpdatedAt(LocalDateTime.now());
        learnerModelRepo.save(model);

        exam.setCompleted(true);
        exam.setStatus("DISCARDED");
        exam.setRankXpPenalty(xpPenalty);
        exam.setMasteryDelta(masteryPenalty);
        exam.setScore(0.0);
        exam.setCompletedAt(LocalDateTime.now());
        trainingExamRepo.save(exam);

        if (user != null) {
            redisCacheService.delete("proctorx:learner_model:" + user.getId());
            redisCacheService.delete("proctorx:active_exam:" + user.getId());
        }

        return Map.of(
                "success", true,
                "message", "Session discarded. A minor penalty of " + xpPenalty + " XP was applied.",
                "xpPenalty", xpPenalty,
                "masteryDelta", masteryPenalty
        );
    }

    private void detectErrorTypes(String output, String error, List<String> possibleTraps, Map<String, Integer> errorMap) {
        String combined = ((output != null ? output : "") + " " + (error != null ? error : "")).toLowerCase();

        if (combined.contains("indexoutofrange") || combined.contains("indexoutofbounds") || combined.contains("string index out of range") || combined.contains("array index out of bound")) {
            errorMap.put("OFF_BY_ONE", errorMap.getOrDefault("OFF_BY_ONE", 0) + 1);
            errorMap.put("BOUNDARY_CONDITION", errorMap.getOrDefault("BOUNDARY_CONDITION", 0) + 1);
        }
        if (combined.contains("nullpointer") || combined.contains("segmentation fault") || combined.contains("nullreference") || combined.contains("nonetype")) {
            errorMap.put("NULL_EMPTY_HANDLING", errorMap.getOrDefault("NULL_EMPTY_HANDLING", 0) + 1);
            errorMap.put("INCORRECT_POINTER_UPDATE", errorMap.getOrDefault("INCORRECT_POINTER_UPDATE", 0) + 1);
        }
        if (combined.contains("time limit exceeded") || combined.contains("timed out") || combined.contains("tle")) {
            errorMap.put("TLE", errorMap.getOrDefault("TLE", 0) + 1);
        }
        if (combined.contains("outofmemory") || combined.contains("stack overflow") || combined.contains("recursionerror")) {
            errorMap.put("MLE", errorMap.getOrDefault("MLE", 0) + 1);
            errorMap.put("WRONG_RECURRENCE", errorMap.getOrDefault("WRONG_RECURRENCE", 0) + 1);
        }
        if (combined.contains("syntaxerror") || combined.contains("compilation error") || combined.contains("error:") || combined.contains("cannot find symbol")) {
            errorMap.put("COMPILATION_SYNTAX_ERROR", errorMap.getOrDefault("COMPILATION_SYNTAX_ERROR", 0) + 1);
        }
    }

    private double computeBktIrtPosterior(
            double priorMastery,
            double difficultyB,
            double rawPassedRatio,
            int attempts,
            int durationSeconds,
            int proctorViolations
    ) {
        double evidence = computeEffectiveEvidence(rawPassedRatio, attempts, durationSeconds, proctorViolations);

        double pSlip = Math.max(0.06, Math.min(0.20, 0.09 + 0.03 * difficultyB));
        double pGuess = 0.05;
        double pTransition = 0.12;

        double pObsGivenLearned = (1.0 - pSlip);
        double pObsGivenNotLearned = pGuess;

        double numeratorLearned = priorMastery * (evidence * pObsGivenLearned + (1.0 - evidence) * pSlip);
        double numeratorNotLearned = (1.0 - priorMastery) * (evidence * pObsGivenNotLearned + (1.0 - evidence) * (1.0 - pGuess));

        double denominator = numeratorLearned + numeratorNotLearned;
        double posteriorGivenObs = (denominator > 1e-7) ? (numeratorLearned / denominator) : priorMastery;

        double finalPosterior = posteriorGivenObs + (1.0 - posteriorGivenObs) * pTransition;
        return Math.max(0.10, Math.min(0.98, Math.round(finalPosterior * 100.0) / 100.0));
    }

    private double computeEffectiveEvidence(double rawRatio, int attempts, int durationSeconds, int proctorViolations) {
        double attemptFactor = Math.max(0.75, 1.0 - 0.05 * Math.max(0, attempts - 1));
        double timeFactor = Math.max(0.80, 1.0 - 0.0005 * Math.max(0, durationSeconds - 300));
        double integrityFactor = Math.max(0.50, 1.0 - 0.15 * Math.max(0, proctorViolations));

        double evidence = rawRatio * attemptFactor * timeFactor * integrityFactor;
        return Math.max(0.0, Math.min(1.0, evidence));
    }

    private double resolveDifficultyParameter(String difficulty) {
        if (difficulty == null) return 0.0;
        return switch (difficulty.toUpperCase()) {
            case "EASY" -> -1.2;
            case "EASY_MEDIUM" -> -0.5;
            case "MEDIUM" -> 0.0;
            case "MEDIUM_HARD" -> 0.8;
            case "HARD" -> 1.6;
            default -> 0.0;
        };
    }

    private String resolveDifficultyZpd(double currentMastery) {
        if (currentMastery < 0.28) return "EASY";
        if (currentMastery < 0.48) return "EASY_MEDIUM";
        if (currentMastery < 0.68) return "MEDIUM";
        if (currentMastery < 0.84) return "MEDIUM_HARD";
        return "HARD";
    }

    private String findWeakestDsaSkill(List<SkillMasteryEntity> masteries) {
        String weakest = "ARRAYS";
        double minM = 1.0;
        for (SkillMasteryEntity sm : masteries) {
            if ("CONCEPT".equals(sm.getDimensionType()) && sm.getMastery() < minM) {
                minM = sm.getMastery();
                weakest = sm.getDimensionKey();
            }
        }
        return weakest;
    }

    private double calculateOverallReadiness(List<SkillMasteryEntity> masteries) {
        double sum = 0.0;
        int count = 0;
        for (SkillMasteryEntity sm : masteries) {
            if ("CONCEPT".equals(sm.getDimensionType())) {
                sum += sm.getMastery();
                count++;
            }
        }
        return count > 0 ? Math.round((sum / count) * 100.0) / 100.0 : 0.0;
    }

    private String appendHistorySnapshot(String historyJson, double mastery, double delta, String difficulty) {
        try {
            List<Map<String, Object>> list = (historyJson != null && !historyJson.isBlank())
                    ? objectMapper.readValue(historyJson, new TypeReference<List<Map<String, Object>>>() {})
                    : new ArrayList<>();
            list.add(Map.of(
                    "timestamp", LocalDateTime.now().toString(),
                    "mastery", mastery,
                    "delta", Math.round(delta * 100.0) / 100.0,
                    "difficulty", difficulty
            ));
            if (list.size() > 10) list = list.subList(list.size() - 10, list.size());
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return historyJson;
        }
    }

    private List<Map<String, Object>> parseHistoryJson(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<AdaptiveTrainingQuestionEntity> generate3AdaptiveQuestions(
            AdaptiveTrainingExamEntity exam,
            String targetSkill,
            double mastery,
            String difficulty,
            String learningObjective,
            double irtTheta,
            double bktPrior,
            double confidence,
            String errorFocus) {

        boolean isPattern = AdaptiveConstants.PATTERNS.contains(targetSkill);
        String typeLabel = isPattern ? "Algorithmic Pattern" : "Core Data Structure / Algorithm Concept";

        String prompt = String.format("""
                You are the ProctorX Adaptive Question Engine powered by Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT).
                Generate exactly 3 progressive programming challenges for target %s: '%s' calibrated to the student's exact cognitive vector.

                === STUDENT BAYESIAN KNOWLEDGE VECTOR ===
                - Target Dimension: %s (%s)
                - Current BKT Mastery Probability: P(L) = %.2f (Confidence: %.2f)
                - Prior Knowledge Acquisition: P(L0) = %.2f
                - Latent Ability (IRT Theta): θ = %.2f
                - Calibrated Zone of Proximal Development (ZPD): %s
                - Primary Defect Profile (Vulnerability Remediation): %s
                - Learning Objective: %s

                === VECTOR-DRIVEN GENERATION CONSTRAINTS ===
                1. Adapt question difficulty and conceptual depth strictly to the student's IRT Theta (%.2f) and ZPD '%s'.
                2. Inoculation Focus: Specially design boundary constraints and test cases to remediate the student's identified error risk '%s' (e.g., ensure edge conditions like empty arrays, single elements, or boundary values are tested).
                3. Progression: Problem 1 should target intuition, Problem 2 core pattern decomposition, Problem 3 edge-case resilience.
                4. Each problem must have EXACTLY 3 test cases: first 2 with sample=true, 3rd with sample=false (hidden test case).
                5. Return valid JSON only.

                JSON Structure:
                {
                  "questions": [
                    {
                      "title": "Problem Title",
                      "pattern": "%s",
                      "problemStatement": "Detailed description with standard input/output format and explicit constraints",
                      "solutionOutline": "Brief algorithmic approach",
                      "testCases": [
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": false }
                      ]
                    }
                  ]
                }
                """, typeLabel, targetSkill, targetSkill, typeLabel, mastery, confidence, bktPrior, irtTheta, difficulty, errorFocus, learningObjective, irtTheta, difficulty, errorFocus, targetSkill);

        try {
            Map<String, Object> requestPayload = Map.of(
                    "model", codingModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", "You are the ProctorX Adaptive Question Engine powered by Bayesian Knowledge Tracing. Return only valid JSON."),
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", 0.3,
                    "response_format", Map.of("type", "json_object")
            );

            Map<?, ?> response = restClient.post()
                    .uri(groqUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("choices")) {
                List<?> choices = (List<?>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<?, ?> first = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) first.get("message");
                    String content = (String) message.get("content");

                    JsonNode root = objectMapper.readTree(content);
                    JsonNode questionsNode = root.get("questions");

                    if (questionsNode != null && questionsNode.isArray()) {
                        List<AdaptiveTrainingQuestionEntity> list = new ArrayList<>();
                        for (JsonNode qNode : questionsNode) {
                            AdaptiveTrainingQuestionEntity q = new AdaptiveTrainingQuestionEntity();
                            q.setTrainingExam(exam);
                            q.setTitle(qNode.path("title").asText(targetSkill + " Training Problem"));
                            q.setDescription(qNode.path("problemStatement").asText("Solve the given problem."));
                            q.setTopic(targetSkill);
                            q.setPattern(qNode.path("pattern").asText(targetSkill));
                            q.setDifficulty(difficulty);
                            q.setSolutionOutline(qNode.path("solutionOutline").asText(""));
                            q.setTestCasesJson(objectMapper.writeValueAsString(qNode.path("testCases")));
                            q.setMarks(100);
                            q.setGenerationSource("AI_GENERATED");
                            q.setModelName(codingModel != null ? codingModel : "openai/gpt-oss-120b");
                            q.setTargetIrtTheta(irtTheta);
                            q.setTargetBktMastery(mastery);
                            q.setCalibratedErrorFocus(errorFocus);
                            list.add(q);
                        }
                        if (list.size() >= 3) return list.subList(0, 3);
                        if (!list.isEmpty()) return list;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Groq AI question generation encountered error, using fallback template: {}", e.getMessage());
        }

        return createFallbackTrainingQuestions(exam, targetSkill, difficulty, learningObjective, irtTheta, mastery, errorFocus);
    }

    private List<AdaptiveTrainingQuestionEntity> createFallbackTrainingQuestions(
            AdaptiveTrainingExamEntity exam, String targetSkill, String difficulty, String learningObjective,
            double irtTheta, double mastery, String errorFocus) {
        List<AdaptiveTrainingQuestionEntity> list = new ArrayList<>();

        AdaptiveTrainingQuestionEntity q1 = new AdaptiveTrainingQuestionEntity();
        q1.setTrainingExam(exam);
        q1.setTitle(targetSkill + " Fundamentals: Warmup");
        q1.setDescription("Given an integer N followed by N space-separated integers, compute the sum of all elements.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nSingle integer representing the sum.");
        q1.setTopic(targetSkill);
        q1.setPattern(targetSkill);
        q1.setDifficulty(difficulty);
        q1.setGenerationSource("CURATED_BACKUP");
        q1.setModelName("Curated Benchmark Bank");
        q1.setTargetIrtTheta(irtTheta);
        q1.setTargetBktMastery(mastery);
        q1.setCalibratedErrorFocus(errorFocus);
        q1.setTestCasesJson("""
                [
                  { "input": "3\\n1 2 3", "expectedOutput": "6", "sample": true },
                  { "input": "4\\n10 20 30 40", "expectedOutput": "100", "sample": true },
                  { "input": "1\\n5", "expectedOutput": "5", "sample": false }
                ]
                """);
        list.add(q1);

        AdaptiveTrainingQuestionEntity q2 = new AdaptiveTrainingQuestionEntity();
        q2.setTrainingExam(exam);
        q2.setTitle(targetSkill + " Core Application: " + learningObjective);
        q2.setDescription("Given an array of integers, find the maximum element and its 1-based frequency.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nTwo space-separated integers (max_value frequency).");
        q2.setTopic(targetSkill);
        q2.setPattern(targetSkill);
        q2.setDifficulty(difficulty);
        q2.setGenerationSource("CURATED_BACKUP");
        q2.setModelName("Curated Benchmark Bank");
        q2.setTargetIrtTheta(irtTheta);
        q2.setTargetBktMastery(mastery);
        q2.setCalibratedErrorFocus(errorFocus);
        q2.setTestCasesJson("""
                [
                  { "input": "5\\n3 2 1 3 3", "expectedOutput": "3 3", "sample": true },
                  { "input": "4\\n1 2 3 4", "expectedOutput": "4 1", "sample": true },
                  { "input": "2\\n9 9", "expectedOutput": "9 2", "sample": false }
                ]
                """);
        list.add(q2);

        AdaptiveTrainingQuestionEntity q3 = new AdaptiveTrainingQuestionEntity();
        q3.setTrainingExam(exam);
        q3.setTitle(targetSkill + " Advanced Mastery Challenge");
        q3.setDescription("Given an array of N integers, return the count of strictly positive elements.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nCount of positive integers.");
        q3.setTopic(targetSkill);
        q3.setPattern(targetSkill);
        q3.setDifficulty(difficulty);
        q3.setGenerationSource("CURATED_BACKUP");
        q3.setModelName("Curated Benchmark Bank");
        q3.setTargetIrtTheta(irtTheta);
        q3.setTargetBktMastery(mastery);
        q3.setCalibratedErrorFocus(errorFocus);
        q3.setTestCasesJson("""
                [
                  { "input": "5\\n-1 2 -3 4 5", "expectedOutput": "3", "sample": true },
                  { "input": "3\\n-1 -2 -3", "expectedOutput": "0", "sample": true },
                  { "input": "4\\n1 2 3 4", "expectedOutput": "4", "sample": false }
                ]
                """);
        list.add(q3);

        return list;
    }

    // =========================================================================
    // ADMIN ADAPTIVE TESTING & SANDBOX LAB METHODS
    // =========================================================================

    public Map<String, Object> fetchAvailableGroqModels() {
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> defaultFallback = List.of(
                "openai/gpt-oss-120b",
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "qwen-2.5-coder-32b",
                "mixtral-8x7b-32768",
                "gemma2-9b-it",
                "deepseek-r1-distill-llama-70b"
        );

        if (apiKey == null || apiKey.trim().isEmpty()) {
            result.put("source", "FALLBACK");
            result.put("activeModel", codingModel != null ? codingModel : "openai/gpt-oss-120b");
            result.put("models", defaultFallback);
            result.put("message", "Groq API key not configured. Using standard high-performance model list.");
            return result;
        }

        try {
            Map<?, ?> response = restClient.get()
                    .uri("https://api.groq.com/openai/v1/models")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("data")) {
                List<?> data = (List<?>) response.get("data");
                List<String> modelIds = new ArrayList<>();
                for (Object item : data) {
                    if (item instanceof Map<?, ?> m && m.containsKey("id")) {
                        modelIds.add(String.valueOf(m.get("id")));
                    }
                }
                Collections.sort(modelIds);
                result.put("source", "LIVE_API");
                result.put("activeModel", codingModel != null ? codingModel : "openai/gpt-oss-120b");
                result.put("models", modelIds.isEmpty() ? defaultFallback : modelIds);
                result.put("totalModels", modelIds.size());
                return result;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch live models from Groq API: {}", e.getMessage());
        }

        result.put("source", "FALLBACK");
        result.put("activeModel", codingModel != null ? codingModel : "openai/gpt-oss-120b");
        result.put("models", defaultFallback);
        result.put("message", "Direct Groq model query failed, returned default models.");
        return result;
    }

    public List<Map<String, Object>> getLearnerProfilesForAdmin() {
        List<LearnerModelEntity> models = learnerModelRepo.findAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (LearnerModelEntity lm : models) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("learnerModelId", lm.getId());
            if (lm.getUser() != null) {
                map.put("userId", lm.getUser().getId());
                map.put("username", lm.getUser().getUsername());
                map.put("email", lm.getUser().getEmail());
            } else {
                map.put("userId", null);
                map.put("username", "Unknown");
                map.put("email", "");
            }
            map.put("diagnosticCompleted", lm.isDiagnosticCompleted());
            map.put("overallReadiness", lm.getOverallReadiness() != null ? lm.getOverallReadiness() : 0.0);
            map.put("totalQuestionsSolved", lm.getTotalQuestionsSolved() != null ? lm.getTotalQuestionsSolved() : 0);
            map.put("streakDays", lm.getStreakDays() != null ? lm.getStreakDays() : 0);
            list.add(map);
        }
        return list;
    }

    public Map<String, Object> getLearner35Vector(Long learnerModelId) {
        LearnerModelEntity model = learnerModelRepo.findById(learnerModelId).orElse(null);
        if (model == null) {
            return Collections.emptyMap();
        }
        ensureAllDimensionsExist(model);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("learnerModelId", model.getId());
        result.put("overallReadiness", model.getOverallReadiness());
        result.put("totalQuestionsSolved", model.getTotalQuestionsSolved());

        List<Map<String, Object>> concepts = new ArrayList<>();
        List<Map<String, Object>> patterns = new ArrayList<>();
        List<Map<String, Object>> competencies = new ArrayList<>();
        List<Map<String, Object>> errorProfiles = new ArrayList<>();

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", sm.getDimensionKey());
            item.put("mastery", sm.getMastery() != null ? sm.getMastery() : 0.20);
            item.put("bktPrior", sm.getBktPrior() != null ? sm.getBktPrior() : 0.20);
            item.put("irtTheta", sm.getIrtTheta() != null ? sm.getIrtTheta() : 0.0);
            item.put("confidence", sm.getConfidence() != null ? sm.getConfidence() : 0.10);
            item.put("rankXp", sm.getRankXp() != null ? sm.getRankXp() : 0);
            item.put("rankTier", sm.getRankTier() != null ? sm.getRankTier() : "BRONZE");
            item.put("errorRisk", sm.getErrorRiskProbability() != null ? sm.getErrorRiskProbability() : 0.15);

            String type = sm.getDimensionType();
            if ("CONCEPT".equalsIgnoreCase(type)) {
                concepts.add(item);
            } else if ("PATTERN".equalsIgnoreCase(type)) {
                patterns.add(item);
            } else if ("COMPETENCY".equalsIgnoreCase(type)) {
                competencies.add(item);
            } else if ("ERROR_PROFILE".equalsIgnoreCase(type)) {
                errorProfiles.add(item);
            }
        }

        result.put("concepts", concepts);
        result.put("patterns", patterns);
        result.put("competencies", competencies);
        result.put("errorProfiles", errorProfiles);
        return result;
    }

    public Map<String, Object> testGenerateSingleAdaptiveQuestion(Map<String, Object> params) {
        String chosenModel = (String) params.getOrDefault("model", codingModel != null ? codingModel : "openai/gpt-oss-120b");
        String targetSkill = (String) params.getOrDefault("targetSkill", "ARRAYS");
        String pattern = (String) params.getOrDefault("pattern", "TWO_POINTERS");
        String difficulty = (String) params.getOrDefault("difficulty", "MEDIUM");
        double irtTheta = params.get("irtTheta") instanceof Number n ? n.doubleValue() : 0.25;
        double bktMastery = params.get("bktMastery") instanceof Number n ? n.doubleValue() : 0.50;
        double bktPrior = params.get("bktPrior") instanceof Number n ? n.doubleValue() : 0.40;
        double confidence = params.get("confidence") instanceof Number n ? n.doubleValue() : 0.75;
        String errorFocus = (String) params.getOrDefault("errorFocus", "OFF_BY_ONE, BOUNDARY_CONDITION");
        String learningObjective = (String) params.getOrDefault("learningObjective", "Master algorithmic decomposition with boundary safety");
        double temperature = params.get("temperature") instanceof Number n ? n.doubleValue() : 0.3;

        boolean isPattern = AdaptiveConstants.PATTERNS.contains(targetSkill);
        String typeLabel = isPattern ? "Algorithmic Pattern" : "Core Data Structure / Algorithm Concept";

        String prompt = String.format("""
                You are the ProctorX Adaptive Question Engine powered by Bayesian Knowledge Tracing (BKT) and Item Response Theory (IRT).
                Generate exactly 1 progressive programming challenge for target %s: '%s' (Pattern: '%s') calibrated to the student's exact cognitive vector.

                === STUDENT BAYESIAN KNOWLEDGE VECTOR ===
                - Target Dimension: %s (%s)
                - Current BKT Mastery Probability: P(L) = %.2f (Confidence: %.2f)
                - Prior Knowledge Acquisition: P(L0) = %.2f
                - Latent Ability (IRT Theta): θ = %.2f
                - Calibrated Zone of Proximal Development (ZPD): %s
                - Primary Defect Profile (Vulnerability Remediation): %s
                - Learning Objective: %s

                === VECTOR-DRIVEN GENERATION CONSTRAINTS ===
                1. Adapt question difficulty and conceptual depth strictly to the student's IRT Theta (%.2f) and ZPD '%s'.
                2. Inoculation Focus: Specially design boundary constraints and test cases to remediate the student's identified error risk '%s' (e.g., ensure edge conditions like empty arrays, single elements, or boundary values are tested).
                3. Provide EXACTLY 3 test cases: first 2 with sample=true, 3rd with sample=false (hidden test case).
                4. Return valid JSON only.

                JSON Structure:
                {
                  "questions": [
                    {
                      "title": "Problem Title",
                      "pattern": "%s",
                      "problemStatement": "Detailed description with standard input/output format and explicit constraints",
                      "solutionOutline": "Brief algorithmic approach",
                      "testCases": [
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": false }
                      ]
                    }
                  ]
                }
                """, typeLabel, targetSkill, pattern, targetSkill, typeLabel, bktMastery, confidence, bktPrior, irtTheta, difficulty, errorFocus, learningObjective, irtTheta, difficulty, errorFocus, pattern);

        Map<String, Object> debugResult = new LinkedHashMap<>();
        debugResult.put("modelUsed", chosenModel);
        debugResult.put("promptSent", prompt);

        long start = System.currentTimeMillis();
        try {
            Map<String, Object> requestPayload = Map.of(
                    "model", chosenModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", "You are the ProctorX Adaptive Question Engine powered by Bayesian Knowledge Tracing. Return only valid JSON."),
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", Math.max(0.0, Math.min(1.0, temperature)),
                    "response_format", Map.of("type", "json_object")
            );

            Map<?, ?> response = restClient.post()
                    .uri(groqUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(Map.class);

            long duration = System.currentTimeMillis() - start;
            debugResult.put("latencyMs", duration);
            debugResult.put("rawResponse", response != null ? objectMapper.writeValueAsString(response) : null);

            if (response != null && response.containsKey("choices")) {
                List<?> choices = (List<?>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<?, ?> first = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) first.get("message");
                    String content = (String) message.get("content");

                    JsonNode root = objectMapper.readTree(content);
                    JsonNode questionsNode = root.get("questions");

                    if (questionsNode != null && questionsNode.isArray() && !questionsNode.isEmpty()) {
                        JsonNode qNode = questionsNode.get(0);
                        Map<String, Object> qMap = new LinkedHashMap<>();
                        qMap.put("title", qNode.path("title").asText(targetSkill + " Adaptive Challenge"));
                        qMap.put("description", qNode.path("problemStatement").asText("Solve the given problem."));
                        qMap.put("topic", targetSkill);
                        qMap.put("pattern", qNode.path("pattern").asText(pattern));
                        qMap.put("difficulty", difficulty);
                        qMap.put("solutionOutline", qNode.path("solutionOutline").asText(""));
                        qMap.put("generationSource", "AI_GENERATED");
                        qMap.put("modelName", chosenModel);
                        qMap.put("targetIrtTheta", irtTheta);
                        qMap.put("targetBktMastery", bktMastery);
                        qMap.put("calibratedErrorFocus", errorFocus);

                        List<Map<String, Object>> tcs = new ArrayList<>();
                        for (JsonNode tc : qNode.path("testCases")) {
                            tcs.add(Map.of(
                                    "input", tc.path("input").asText(""),
                                    "expectedOutput", tc.path("expectedOutput").asText(""),
                                    "sample", tc.path("sample").asBoolean(true)
                            ));
                        }
                        qMap.put("testCases", tcs);

                        debugResult.put("status", "SUCCESS");
                        debugResult.put("question", qMap);
                        return debugResult;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Adaptive AI sandbox question generation failed: {}", e.getMessage(), e);
            debugResult.put("status", "FALLBACK_TRIGGERED");
            debugResult.put("error", e.getMessage());
            debugResult.put("latencyMs", System.currentTimeMillis() - start);
        }

        // Fallback test question if Groq fails
        Map<String, Object> fallbackQ = new LinkedHashMap<>();
        fallbackQ.put("title", targetSkill + " Benchmark Fallback Problem");
        fallbackQ.put("description", "Given an array of N integers, find the sum of all contiguous subarrays.\n\nInput format:\nFirst line integer N.\nSecond line N space-separated integers.\n\nOutput format:\nSingle integer representing the total sum.");
        fallbackQ.put("topic", targetSkill);
        fallbackQ.put("pattern", pattern);
        fallbackQ.put("difficulty", difficulty);
        fallbackQ.put("solutionOutline", "Use running prefix sum or combinatorial contribution.");
        fallbackQ.put("generationSource", "CURATED_BACKUP");
        fallbackQ.put("modelName", "Curated Benchmark Bank");
        fallbackQ.put("targetIrtTheta", irtTheta);
        fallbackQ.put("targetBktMastery", bktMastery);
        fallbackQ.put("calibratedErrorFocus", errorFocus);
        fallbackQ.put("testCases", List.of(
                Map.of("input", "3\n1 2 3", "expectedOutput", "20", "sample", true),
                Map.of("input", "1\n5", "expectedOutput", "5", "sample", true),
                Map.of("input", "4\n1 1 1 1", "expectedOutput", "20", "sample", false)
        ));

        debugResult.put("question", fallbackQ);
        return debugResult;
    }

    public Map<String, Object> simulateVectorEvaluation(Map<String, Object> params) {
        String targetSkill = (String) params.getOrDefault("targetSkill", "ARRAYS");
        String difficulty = (String) params.getOrDefault("difficulty", "MEDIUM");
        double currentMastery = params.get("currentMastery") instanceof Number n ? n.doubleValue() : 0.50;
        double currentPrior = params.get("bktPrior") instanceof Number n ? n.doubleValue() : currentMastery;
        double currentTheta = params.get("irtTheta") instanceof Number n ? n.doubleValue() : 0.0;
        double currentErrorRisk = params.get("currentErrorRisk") instanceof Number n ? n.doubleValue() : 0.35;
        String errorFocus = (String) params.getOrDefault("errorFocus", "OFF_BY_ONE");
        int passedTcs = params.get("passedTcs") instanceof Number n ? n.intValue() : 3;
        int totalTcs = params.get("totalTcs") instanceof Number n ? n.intValue() : 3;
        int attempts = params.get("attempts") instanceof Number n ? n.intValue() : 1;
        int durationSeconds = params.get("durationSeconds") instanceof Number n ? n.intValue() : 60;
        String output = (String) params.getOrDefault("output", "");
        String error = (String) params.getOrDefault("error", "");

        double rawRatio = (double) passedTcs / Math.max(1, totalTcs);
        double diffB = resolveDifficultyParameter(difficulty);
        double newMastery = computeBktIrtPosterior(currentPrior, diffB, rawRatio, attempts, durationSeconds, 0);
        double masteryDelta = Math.round((newMastery - currentMastery) * 100.0) / 100.0;

        // IRT Theta calculation via Log-Odds
        double updatedTheta = Math.round(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)) * 100.0) / 100.0;
        double thetaDelta = Math.round((updatedTheta - currentTheta) * 100.0) / 100.0;

        // Error detection
        Map<String, Integer> errorMap = new HashMap<>();
        detectErrorTypes(output, error, List.of(errorFocus), errorMap);

        int detectedCount = errorMap.getOrDefault(errorFocus, 0);
        double riskAdjustment = (detectedCount > 0) ? Math.min(0.35, 0.12 * detectedCount) : (rawRatio >= 1.0 ? -0.06 : 0.0);
        double newErrorRisk = Math.max(0.05, Math.min(0.95, Math.round((currentErrorRisk + riskAdjustment) * 100.0) / 100.0));
        double errorRiskDelta = Math.round((newErrorRisk - currentErrorRisk) * 100.0) / 100.0;

        // Graph ripple effects
        List<Map<String, Object>> ripples = new ArrayList<>();
        List<String> adjacent = AdaptiveConstants.CONCEPT_GRAPH_NEIGHBORS.getOrDefault(targetSkill, Collections.emptyList());
        for (String adj : adjacent) {
            double rippleDelta = Math.round((masteryDelta * AdaptiveConstants.GRAPH_NEIGHBOR_WEIGHT) * 100.0) / 100.0;
            ripples.add(Map.of(
                    "dimension", adj,
                    "type", "CONCEPT_RIPPLE",
                    "delta", rippleDelta,
                    "impact", "GRAPH_NEIGHBOR"
            ));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("priorMastery", currentMastery);
        result.put("newMastery", newMastery);
        result.put("masteryDelta", masteryDelta);
        result.put("priorIrtTheta", currentTheta);
        result.put("updatedIrtTheta", updatedTheta);
        result.put("thetaDelta", thetaDelta);
        result.put("priorErrorRisk", currentErrorRisk);
        result.put("newErrorRisk", newErrorRisk);
        result.put("errorRiskDelta", errorRiskDelta);
        result.put("errorDetections", errorMap);
        result.put("ripples", ripples);
        result.put("nextZpd", resolveDifficultyZpd(newMastery));
        return result;
    }
}
