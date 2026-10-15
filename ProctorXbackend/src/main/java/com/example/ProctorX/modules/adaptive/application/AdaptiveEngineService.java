package com.example.ProctorX.modules.adaptive.application;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AdaptiveEngineService {

    private static final Logger log = LoggerFactory.getLogger(AdaptiveEngineService.class);

    private final LearnerModelRepository learnerModelRepo;
    private final SkillMasteryRepository skillMasteryRepo;
    private final AdaptiveTrainingExamRepository trainingExamRepo;
    private final DiagnosticQuestionBank diagnosticBank;
    private final CodeExecutionRouterService executionRouter;
    private final ExamSubmissionRepository submissionRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

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
            ObjectMapper objectMapper) {
        this.learnerModelRepo = learnerModelRepo;
        this.skillMasteryRepo = skillMasteryRepo;
        this.trainingExamRepo = trainingExamRepo;
        this.diagnosticBank = diagnosticBank;
        this.executionRouter = executionRouter;
        this.submissionRepository = submissionRepository;
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
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

        List<SkillMasteryEntity> masteries = learnerModel.getSkillMasteries();

        for (SkillMasteryEntity sm : masteries) {
            if ("CONCEPT".equals(sm.getDimensionType())) {
                String key = sm.getDimensionKey();
                if (conceptWeightsSum.containsKey(key) && conceptWeightsSum.get(key) > 0.0) {
                    double evidenceRatio = conceptScores.get(key) / conceptWeightsSum.get(key);
                    double newMastery = computeBktIrtPosterior(sm.getBktPrior(), resolveDifficultyParameter("EASY_MEDIUM"), evidenceRatio, 1, 60, 0);
                    double delta = newMastery - sm.getMastery();
                    sm.setGrowthDelta(Math.round(delta * 100.0) / 100.0);
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
                } else {
                    sm.setMastery(0.20);
                    sm.setConfidence(0.20);
                    sm.setRankXp(AdaptiveConstants.calculateRankXp(0.20, sm.getQuestionsSolved() != null ? sm.getQuestionsSolved() : 0));
                }
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("PATTERN".equals(sm.getDimensionType())) {
                String key = sm.getDimensionKey();
                if (patternWeightsSum.containsKey(key) && patternWeightsSum.get(key) > 0.0) {
                    double evidenceRatio = patternScores.get(key) / patternWeightsSum.get(key);
                    double newMastery = computeBktIrtPosterior(sm.getBktPrior(), 0.0, evidenceRatio, 1, 60, 0);
                    double delta = newMastery - sm.getMastery();
                    sm.setGrowthDelta(Math.round(delta * 100.0) / 100.0);
                    sm.setMastery(newMastery);
                    sm.setBktPrior(newMastery);
                    sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                    sm.setConfidence(0.60);
                    sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : (delta <= -0.03 ? "DECLINING" : "STABLE"));
                } else {
                    sm.setMastery(0.20);
                }
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("COMPETENCY".equals(sm.getDimensionType())) {
                double baseScore = (double) totalTestCasesPassed / Math.max(1, totalTestCasesTotal);
                double val = switch (sm.getDimensionKey()) {
                    case "IMPLEMENTATION" -> Math.max(0.25, Math.min(0.92, baseScore + 0.10));
                    case "DEBUGGING" -> Math.max(0.20, Math.min(0.85, (double) totalTestCasesPassed / Math.max(1, totalTestCasesTotal)));
                    case "COMPLEXITY_REASONING" -> Math.max(0.20, Math.min(0.85, baseScore * 0.95));
                    case "EDGE_CASE_HANDLING" -> Math.max(0.15, Math.min(0.80, (double) totalPassedCount / 6.0));
                    case "CODE_ORGANIZATION" -> Math.max(0.30, Math.min(0.88, baseScore + 0.05));
                    default -> 0.30;
                };
                double delta = val - sm.getMastery();
                sm.setGrowthDelta(Math.round(delta * 100.0) / 100.0);
                sm.setMastery(Math.round(val * 100.0) / 100.0);
                sm.setConfidence(0.55);
                sm.setEvidenceCount(6);
                sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : "STABLE");
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("ERROR_PROFILE".equals(sm.getDimensionType())) {
                int detected = errorDetections.getOrDefault(sm.getDimensionKey(), 0);
                double risk = Math.max(0.08, Math.min(0.85, 0.15 + (detected * 0.18)));
                sm.setErrorRiskProbability(Math.round(risk * 100.0) / 100.0);
                sm.setMastery(sm.getErrorRiskProbability());
                sm.setLastAssessedAt(LocalDateTime.now());
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
            trainingExamRepo.save(diagExam);
        } catch (Exception ignored) {}

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

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("studentId", model.getUser() != null ? String.valueOf(model.getUser().getId()) : "S001");
        summary.put("diagnosticCompleted", model.isDiagnosticCompleted());
        summary.put("overallReadiness", model.getOverallReadiness());
        summary.put("totalQuestionsSolved", totalSolved);
        summary.put("totalSessionsCompleted", model.getTotalSessionsCompleted() != null ? model.getTotalSessionsCompleted() : 0);
        summary.put("streakDays", model.getStreakDays() != null ? model.getStreakDays() : 0);

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

        return summary;
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

        // Get current topic mastery
        double currentMastery = model.getSkillMasteries().stream()
                .filter(sm -> sm.getDimensionKey().equalsIgnoreCase(targetTopic) && dimensionType.equals(sm.getDimensionType()))
                .map(SkillMasteryEntity::getMastery)
                .findFirst()
                .orElse(0.25);

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
        exam.setStartedAt(LocalDateTime.now());

        List<AdaptiveTrainingQuestionEntity> questions = generate3AdaptiveQuestions(exam, targetTopic, currentMastery, targetDifficulty, learningObjective);
        for (AdaptiveTrainingQuestionEntity q : questions) {
            exam.addQuestion(q);
        }

        return trainingExamRepo.save(exam);
    }

    @Transactional
    public Map<String, Object> submitTrainingSession(AuthEntity user, Long examId, List<Map<String, Object>> answers) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized to submit session");
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
                double delta = (avgEvidence >= 0.66) ? 0.03 : (avgEvidence <= 0.33 ? -0.03 : 0.0);
                double nextVal = Math.max(0.10, Math.min(0.95, Math.round((sm.getMastery() + delta) * 100.0) / 100.0));
                sm.setGrowthDelta(Math.round((nextVal - sm.getMastery()) * 100.0) / 100.0);
                sm.setMastery(nextVal);
                sm.setEvidenceCount((sm.getEvidenceCount() != null ? sm.getEvidenceCount() : 0) + 1);
                sm.setRecentTrend(delta > 0 ? "IMPROVING" : (delta < 0 ? "DECLINING" : "STABLE"));
                sm.setLastAssessedAt(LocalDateTime.now());
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
                sm.setErrorRiskProbability(nextRisk);
                sm.setMastery(nextRisk);
                sm.setLastAssessedAt(LocalDateTime.now());
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

        LearnerModelEntity model = getOrCreateLearnerModel(user);
        String targetSkill = exam.getTargetSkill();

        int xpPenalty = 150;
        double masteryPenalty = -0.10;
        List<Map<String, Object>> malpracticeUpdates = new ArrayList<>();

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if (sm.getDimensionKey().equalsIgnoreCase(targetSkill)) {
                double currentMastery = sm.getMastery() != null ? sm.getMastery() : 0.20;
                double newMastery = Math.max(0.10, Math.round((currentMastery + masteryPenalty) * 100.0) / 100.0);
                sm.setMastery(newMastery);
                sm.setBktPrior(newMastery);
                sm.setRecentTrend("DECLINING");
                sm.setGrowthDelta(masteryPenalty);
                
                int currentXp = sm.getRankXp() != null ? sm.getRankXp() : 30;
                int newXp = Math.max(0, currentXp - xpPenalty);
                sm.setRankXp(newXp);
                sm.setRankTier(AdaptiveConstants.calculateRankTier(newXp));
                
                sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, masteryPenalty, "MALPRACTICE_HALT"));
                sm.setLastAssessedAt(LocalDateTime.now());

                Map<String, Object> u = new HashMap<>();
                u.put("dimension", sm.getDimensionKey());
                u.put("type", sm.getDimensionType());
                u.put("oldMastery", currentMastery);
                u.put("newMastery", newMastery);
                u.put("delta", masteryPenalty);
                u.put("xpPenalty", -xpPenalty);
                u.put("impact", "MALPRACTICE_HALT");
                malpracticeUpdates.add(u);
            }
        }

        exam.setCompleted(true);
        exam.setStatus("TERMINATED_MALPRACTICE");
        exam.setScore(0.0);
        exam.setMalpracticeScore(Math.min(100, Math.max(50, violationCount * 35)));
        exam.setRankXpPenalty(xpPenalty);
        exam.setOldMastery(exam.getOldMastery() != null && exam.getOldMastery() > 0 ? exam.getOldMastery() : 0.20);
        exam.setNewMastery(Math.max(0.10, (exam.getOldMastery() != null ? exam.getOldMastery() : 0.20) + masteryPenalty));
        exam.setMasteryDelta(masteryPenalty);
        exam.setRecentTrend("DECLINING");
        exam.setCompletedAt(LocalDateTime.now());
        try {
            exam.setVectorUpdatesJson(objectMapper.writeValueAsString(malpracticeUpdates));
        } catch (Exception ignored) {}
        trainingExamRepo.save(exam);

        model.setOverallReadiness(calculateOverallReadiness(model.getSkillMasteries()));
        model.setUpdatedAt(LocalDateTime.now());
        learnerModelRepo.save(model);

        return Map.of(
                "status", "TERMINATED_MALPRACTICE",
                "targetSkill", targetSkill,
                "malpracticeScore", exam.getMalpracticeScore(),
                "rankXpPenalty", xpPenalty,
                "masteryPenalty", masteryPenalty,
                "overallReadiness", model.getOverallReadiness(),
                "vectorUpdates", malpracticeUpdates
        );
    }

    @Transactional
    public Map<String, Object> getActiveTrainingSession(AuthEntity user) {
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
                return response;
            }
        }

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
            throw new IllegalStateException("Session expired or maximum 3 reconnect attempts exceeded.");
        }

        exam.setReconnectCount(exam.getReconnectCount() + 1);
        trainingExamRepo.save(exam);

        return getActiveTrainingSession(user);
    }

    @Transactional
    public Map<String, Object> discardActiveTrainingSession(AuthEntity user, Long examId) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized");
        }

        exam.setCompleted(true);
        exam.setStatus("EXPIRED_ABANDONED");
        exam.setCompletedAt(LocalDateTime.now());
        trainingExamRepo.save(exam);

        return Map.of("success", true, "message", "Session discarded without penalty.");
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
            String learningObjective) {

        boolean isPattern = AdaptiveConstants.PATTERNS.contains(targetSkill);
        String typeLabel = isPattern ? "Algorithmic Pattern" : "Core Data Structure / Algorithm Concept";

        String prompt = String.format("""
                You are the ProctorX Adaptive Question Generator.
                Generate exactly 3 progressive DSA programming problems strictly for the target %s: '%s' and difficulty '%s'.

                Target Dimension: %s (%s)
                Current Student Mastery: %.2f
                Target Difficulty: %s
                Learning Objective: %s

                Requirements:
                1. Return exactly 3 questions.
                2. Each question must include title, problemStatement, pattern, constraints (list), and EXACTLY 3 test cases.
                3. First 2 test cases should be marked sample=true, 3rd marked sample=false.
                4. Output valid JSON ONLY.

                JSON Structure:
                {
                  "questions": [
                    {
                      "title": "Problem Title",
                      "pattern": "%s",
                      "problemStatement": "Detailed description with standard input/output format",
                      "solutionOutline": "Brief algorithmic approach",
                      "testCases": [
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": true },
                        { "input": "...", "expectedOutput": "...", "sample": false }
                      ]
                    }
                  ]
                }
                """, typeLabel, targetSkill, difficulty, targetSkill, typeLabel, mastery, difficulty, learningObjective, targetSkill);

        try {
            Map<String, Object> requestPayload = Map.of(
                    "model", codingModel,
                    "messages", List.of(
                            Map.of("role", "system", "content", "You are the ProctorX Adaptive Question Generator. Return only valid JSON."),
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

        return createFallbackTrainingQuestions(exam, targetSkill, difficulty, learningObjective);
    }

    private List<AdaptiveTrainingQuestionEntity> createFallbackTrainingQuestions(
            AdaptiveTrainingExamEntity exam, String targetSkill, String difficulty, String learningObjective) {
        List<AdaptiveTrainingQuestionEntity> list = new ArrayList<>();

        AdaptiveTrainingQuestionEntity q1 = new AdaptiveTrainingQuestionEntity();
        q1.setTrainingExam(exam);
        q1.setTitle(targetSkill + " Fundamentals: Warmup");
        q1.setDescription("Given an integer N followed by N space-separated integers, compute the sum of all elements.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nSingle integer representing the sum.");
        q1.setTopic(targetSkill);
        q1.setPattern(targetSkill);
        q1.setDifficulty(difficulty);
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
}
