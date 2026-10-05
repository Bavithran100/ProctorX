package com.example.ProctorX.modules.adaptive.application;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
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
            return existing.get();
        }

        LearnerModelEntity model = new LearnerModelEntity(user);
        model = learnerModelRepo.save(model);

        // Initialize 12 DSA dimensions
        for (String dsaDim : DiagnosticQuestionBank.DSA_DIMENSIONS) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "DSA_TOPIC", dsaDim, 0.15);
            sm.setConfidence(0.10);
            sm.setBktPrior(0.15);
            sm.setIrtTheta(-1.5);
            skillMasteryRepo.save(sm);
            model.addSkillMastery(sm);
        }

        // Initialize 5 Behavioral dimensions
        for (String behDim : DiagnosticQuestionBank.BEHAVIORAL_DIMENSIONS) {
            SkillMasteryEntity sm = new SkillMasteryEntity(model, "BEHAVIORAL", behDim, 0.20);
            sm.setConfidence(0.10);
            sm.setBktPrior(0.20);
            sm.setIrtTheta(-1.2);
            skillMasteryRepo.save(sm);
            model.addSkillMastery(sm);
        }

        return learnerModelRepo.save(model);
    }

    public List<Map<String, Object>> getDiagnosticQuestions() {
        List<DiagnosticQuestionBank.DiagnosticQuestion> questions = diagnosticBank.getCuratedQuestions();
        List<Map<String, Object>> response = new ArrayList<>();

        for (DiagnosticQuestionBank.DiagnosticQuestion q : questions) {
            response.add(Map.of(
                    "id", q.id(),
                    "title", q.title(),
                    "description", q.description(),
                    "primaryTopic", q.primaryTopic(),
                    "secondaryTopics", q.secondaryTopics(),
                    "pattern", q.pattern(),
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

        Map<String, Double> topicAccScores = new HashMap<>();
        Map<String, Double> topicWeightsSum = new HashMap<>();
        int totalPassedCount = 0;
        int totalTestCasesPassed = 0;

        for (DiagnosticQuestionBank.DiagnosticQuestion q : curatedQuestions) {
            Optional<Map<String, Object>> subOpt = submissions.stream()
                    .filter(s -> q.id().equals(s.get("questionId")))
                    .findFirst();

            String userCode = subOpt.map(s -> (String) s.get("code")).orElse("");
            String language = subOpt.map(s -> (String) s.get("language")).orElse("java");
            int attempts = subOpt.map(s -> ((Number) s.getOrDefault("attempts", 1)).intValue()).orElse(1);
            int durationSeconds = subOpt.map(s -> ((Number) s.getOrDefault("durationSeconds", 180)).intValue()).orElse(180);
            int proctorViolations = subOpt.map(s -> ((Number) s.getOrDefault("proctorViolations", 0)).intValue()).orElse(0);

            int passedForThisQ = 0;
            List<Map<String, Object>> testCases = q.testCases();

            if (userCode != null && !userCode.isBlank()) {
                for (Map<String, Object> tc : testCases) {
                    String input = (String) tc.get("input");
                    String expected = (String) tc.get("expectedOutput");

                    try {
                        CodeExecutionResult res = executionRouter.execute(userCode, input, language);
                        if (res.success() && isOutputMatching(res.output(), expected)) {
                            passedForThisQ++;
                            totalTestCasesPassed++;
                        }
                    } catch (Exception e) {
                        log.debug("Execution error for diagnostic Q {}: {}", q.id(), e.getMessage());
                    }
                }
            }

            int clientPassed = subOpt.map(s -> ((Number) s.getOrDefault("passedCount", 0)).intValue()).orElse(0);
            if (passedForThisQ == 0 && clientPassed > 0) {
                passedForThisQ = Math.min(clientPassed, testCases.size());
                totalTestCasesPassed += passedForThisQ;
            }

            double rawRatio = (double) passedForThisQ / Math.max(1, testCases.size());
            if (rawRatio >= 0.66) {
                totalPassedCount++;
            }

            // Compute effective evidence with BKT penalties
            double difficultyB = resolveDifficultyParameter(q.difficulty());
            double effectiveEvidence = computeEffectiveEvidence(rawRatio, attempts, durationSeconds, proctorViolations);

            for (Map.Entry<String, Double> entry : q.topicWeights().entrySet()) {
                String topic = entry.getKey();
                double weight = entry.getValue();
                topicAccScores.merge(topic, effectiveEvidence * weight, Double::sum);
                topicWeightsSum.merge(topic, weight, Double::sum);
            }
        }

        // Update 12 DSA Mastery entities via BKT
        List<SkillMasteryEntity> masteries = learnerModel.getSkillMasteries();
        for (SkillMasteryEntity sm : masteries) {
            if ("DSA_TOPIC".equals(sm.getDimensionType())) {
                String key = sm.getDimensionKey();
                if (topicWeightsSum.containsKey(key)) {
                    double evidence = topicAccScores.get(key) / topicWeightsSum.get(key);
                    double difficultyB = 0.0;
                    double newMastery = computeBktIrtPosterior(sm.getMastery(), difficultyB, evidence, 1, 180, 0);

                    double delta = newMastery - sm.getMastery();
                    sm.setGrowthDelta(Math.round(delta * 100.0) / 100.0);
                    sm.setMastery(newMastery);
                    sm.setBktPrior(newMastery);
                    sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                    sm.setConfidence(0.65);
                    sm.setEvidenceCount(3);
                    sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : (delta <= -0.03 ? "DECLINING" : "STABLE"));
                    sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, delta, "DIAGNOSTIC"));
                } else {
                    sm.setMastery(0.20);
                    sm.setConfidence(0.20);
                }
                sm.setLastAssessedAt(LocalDateTime.now());
            } else if ("BEHAVIORAL".equals(sm.getDimensionType())) {
                double baseScore = (double) totalTestCasesPassed / 18.0;
                double val = switch (sm.getDimensionKey()) {
                    case "IMPLEMENTATION" -> Math.max(0.25, Math.min(0.90, baseScore + 0.10));
                    case "PATTERN_RECOGNITION" -> Math.max(0.20, Math.min(0.90, (double) totalPassedCount / 6.0));
                    case "COMPLEXITY_ANALYSIS" -> Math.max(0.20, Math.min(0.85, baseScore));
                    case "DEBUGGING_ERROR_HANDLING" -> Math.max(0.20, Math.min(0.85, (double) totalTestCasesPassed / 18.0));
                    case "EDGE_CASE_HANDLING" -> Math.max(0.15, Math.min(0.80, baseScore * 0.85));
                    default -> 0.30;
                };
                double delta = val - sm.getMastery();
                sm.setGrowthDelta(Math.round(delta * 100.0) / 100.0);
                sm.setMastery(Math.round(val * 100.0) / 100.0);
                sm.setConfidence(0.55);
                sm.setEvidenceCount(6);
                sm.setRecentTrend(delta >= 0.03 ? "IMPROVING" : "STABLE");
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

        return Map.of(
                "diagnosticCompleted", true,
                "totalPassedQuestions", totalPassedCount,
                "totalQuestions", curatedQuestions.size(),
                "overallReadiness", learnerModel.getOverallReadiness(),
                "learnerModel", getLearnerModelSummary(learnerModel)
        );
    }

    public Map<String, Object> getLearnerModelSummary(LearnerModelEntity model) {
        List<Map<String, Object>> dsaSkills = new ArrayList<>();
        List<Map<String, Object>> behavioralSkills = new ArrayList<>();

        String weakestSkill = "ARRAY";
        double minMastery = 1.0;
        String remediationTopic = null;
        String remediationReason = null;

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            Map<String, Object> item = new HashMap<>();
            item.put("skill", sm.getDimensionKey());
            item.put("mastery", sm.getMastery());
            item.put("confidence", sm.getConfidence());
            item.put("evidenceCount", sm.getEvidenceCount());
            item.put("recentTrend", sm.getRecentTrend());
            item.put("growthDelta", sm.getGrowthDelta() != null ? sm.getGrowthDelta() : 0.0);
            item.put("history", parseHistoryJson(sm.getHistoryJson()));
            item.put("lastAssessedAt", sm.getLastAssessedAt().toString());

            if ("DSA_TOPIC".equals(sm.getDimensionType())) {
                dsaSkills.add(item);
                if (sm.getMastery() < minMastery) {
                    minMastery = sm.getMastery();
                    weakestSkill = sm.getDimensionKey();
                }
                if ("DECLINING".equals(sm.getRecentTrend()) && remediationTopic == null) {
                    remediationTopic = sm.getDimensionKey();
                    remediationReason = "Recent decline detected in " + sm.getDimensionKey() + " (" + (sm.getGrowthDelta() != null ? sm.getGrowthDelta() * 100 : -5) + "%). Targeted warmup recommended.";
                }
            } else {
                behavioralSkills.add(item);
            }
        }

        return Map.of(
                "diagnosticCompleted", model.isDiagnosticCompleted(),
                "overallReadiness", model.getOverallReadiness(),
                "totalQuestionsSolved", model.getTotalQuestionsSolved(),
                "totalSessionsCompleted", model.getTotalSessionsCompleted(),
                "streakDays", model.getStreakDays(),
                "recommendedTopic", (remediationTopic != null) ? remediationTopic : weakestSkill,
                "isRemediationRecommended", remediationTopic != null,
                "remediationReason", remediationReason != null ? remediationReason : "",
                "dsaMasteryVector", dsaSkills,
                "behavioralVector", behavioralSkills
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

            // Distribute into official subject buckets based on exam title / type
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

        // Get current mastery
        double currentMastery = model.getSkillMasteries().stream()
                .filter(sm -> sm.getDimensionKey().equalsIgnoreCase(targetTopic))
                .map(SkillMasteryEntity::getMastery)
                .findFirst()
                .orElse(0.30);

        // Dynamic ZPD Difficulty Selection
        String difficulty = resolveDifficultyZpd(currentMastery);
        String learningObjective = resolveLearningObjective(targetTopic, difficulty);

        AdaptiveTrainingExamEntity exam = new AdaptiveTrainingExamEntity();
        exam.setUser(user);
        exam.setTargetSkill(targetTopic);
        exam.setDifficulty(difficulty);
        exam.setLearningObjective(learningObjective);
        exam.setTotalQuestions(3);
        exam.setCompleted(false);
        exam.setStartedAt(LocalDateTime.now());
        exam = trainingExamRepo.save(exam);

        // Generate 3 questions with 3 test cases each via Groq AI
        List<AdaptiveTrainingQuestionEntity> questions = generate3AdaptiveQuestions(exam, targetTopic, currentMastery, difficulty, learningObjective);
        for (AdaptiveTrainingQuestionEntity q : questions) {
            exam.addQuestion(q);
        }

        return trainingExamRepo.save(exam);
    }

    @Transactional
    public Map<String, Object> submitTrainingSession(AuthEntity user, Long examId, List<Map<String, Object>> answers) {
        AdaptiveTrainingExamEntity exam = trainingExamRepo.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Training session not found: " + examId));

        if (!exam.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("Unauthorized access to training session.");
        }

        LearnerModelEntity model = getOrCreateLearnerModel(user);
        int passedQuestionsCount = 0;
        int totalTestCasesPassed = 0;
        int totalTestCasesTotal = 0;

        List<AdaptiveTrainingQuestionEntity> questions = exam.getQuestions();

        double totalEvidence = 0.0;

        for (AdaptiveTrainingQuestionEntity q : questions) {
            Optional<Map<String, Object>> ansOpt = answers.stream()
                    .filter(a -> q.getId().equals(Long.valueOf(String.valueOf(a.get("questionId")))))
                    .findFirst();

            String userCode = ansOpt.map(a -> (String) a.get("code")).orElse("");
            String language = ansOpt.map(a -> (String) a.get("language")).orElse("java");
            int attempts = ansOpt.map(a -> ((Number) a.getOrDefault("attempts", 1)).intValue()).orElse(1);
            int durationSeconds = ansOpt.map(a -> ((Number) a.getOrDefault("durationSeconds", 180)).intValue()).orElse(180);
            int proctorViolations = ansOpt.map(a -> ((Number) a.getOrDefault("proctorViolations", 0)).intValue()).orElse(0);

            q.setUserCode(userCode);
            int qPassedTests = 0;
            List<Map<String, Object>> testCases = parseTestCases(q.getTestCasesJson());
            totalTestCasesTotal += testCases.size();

            if (userCode != null && !userCode.isBlank()) {
                for (Map<String, Object> tc : testCases) {
                    String input = (String) tc.get("input");
                    String expected = (String) tc.get("expectedOutput");

                    try {
                        CodeExecutionResult res = executionRouter.execute(userCode, input, language);
                        if (res.success() && isOutputMatching(res.output(), expected)) {
                            qPassedTests++;
                            totalTestCasesPassed++;
                        }
                    } catch (Exception e) {
                        log.debug("Execution error for training Q {}: {}", q.getId(), e.getMessage());
                    }
                }
            }

            int clientPassed = ansOpt.map(a -> ((Number) a.getOrDefault("passedCount", 0)).intValue()).orElse(0);
            if (qPassedTests == 0 && clientPassed > 0) {
                qPassedTests = Math.min(clientPassed, testCases.size());
                totalTestCasesPassed += qPassedTests;
            }

            boolean qPassed = qPassedTests == testCases.size() || (testCases.size() > 0 && (double) qPassedTests / testCases.size() >= 0.66);
            q.setPassed(qPassed);
            if (qPassed) passedQuestionsCount++;

            double rawRatio = (double) qPassedTests / Math.max(1, testCases.size());
            double qEvidence = computeEffectiveEvidence(rawRatio, attempts, durationSeconds, proctorViolations);
            totalEvidence += qEvidence;
        }

        double avgEvidence = totalEvidence / Math.max(1, questions.size());

        double sessionScore = ((double) totalTestCasesPassed / Math.max(1, totalTestCasesTotal)) * 100.0;
        exam.setScore(Math.round(sessionScore * 10.0) / 10.0);
        exam.setPassedQuestions(passedQuestionsCount);
        exam.setCompleted(true);
        exam.setCompletedAt(LocalDateTime.now());
        trainingExamRepo.save(exam);

        String targetSkill = exam.getTargetSkill();
        double difficultyB = resolveDifficultyParameter(exam.getDifficulty());

        double oldMastery = 0.30;
        double newMastery = 0.30;
        double growthDelta = 0.0;

        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("DSA_TOPIC".equals(sm.getDimensionType()) && sm.getDimensionKey().equalsIgnoreCase(targetSkill)) {
                oldMastery = sm.getMastery();
                newMastery = computeBktIrtPosterior(oldMastery, difficultyB, avgEvidence, 1, 180, 0);
                growthDelta = newMastery - oldMastery;

                sm.setMastery(newMastery);
                sm.setGrowthDelta(Math.round(growthDelta * 100.0) / 100.0);
                sm.setBktPrior(newMastery);
                sm.setIrtTheta(Math.log(Math.max(0.01, newMastery) / Math.max(0.01, 1.0 - newMastery)));
                sm.setEvidenceCount(sm.getEvidenceCount() + 3);
                sm.setConfidence(Math.min(0.98, 1.0 - (1.0 / (1.0 + 0.35 * sm.getEvidenceCount()))));
                sm.setRecentTrend(growthDelta >= 0.03 ? "IMPROVING" : (growthDelta <= -0.03 ? "DECLINING" : "STABLE"));
                sm.setHistoryJson(appendHistorySnapshot(sm.getHistoryJson(), newMastery, growthDelta, exam.getDifficulty()));
                sm.setLastAssessedAt(LocalDateTime.now());
                skillMasteryRepo.save(sm);
            } else if ("BEHAVIORAL".equals(sm.getDimensionType())) {
                double delta = (avgEvidence >= 0.66) ? 0.03 : -0.02;
                double nextVal = Math.max(0.10, Math.min(0.95, Math.round((sm.getMastery() + delta) * 100.0) / 100.0));
                sm.setGrowthDelta(Math.round((nextVal - sm.getMastery()) * 100.0) / 100.0);
                sm.setMastery(nextVal);
                sm.setEvidenceCount(sm.getEvidenceCount() + 1);
                sm.setRecentTrend(delta > 0 ? "IMPROVING" : "STABLE");
                skillMasteryRepo.save(sm);
            }
        }

        model.setTotalQuestionsSolved(model.getTotalQuestionsSolved() + passedQuestionsCount);
        model.setTotalSessionsCompleted(model.getTotalSessionsCompleted() + 1);
        model.setOverallReadiness(calculateOverallReadiness(model.getSkillMasteries()));
        model.setLastPracticedAt(LocalDateTime.now());
        learnerModelRepo.save(model);

        return Map.of(
                "examId", examId,
                "score", exam.getScore(),
                "passedQuestions", passedQuestionsCount,
                "totalQuestions", exam.getTotalQuestions(),
                "targetSkill", targetSkill,
                "oldMastery", oldMastery,
                "newMastery", newMastery,
                "masteryDelta", Math.round(growthDelta * 100.0) / 100.0,
                "recentTrend", growthDelta >= 0.03 ? "IMPROVING" : (growthDelta <= -0.03 ? "DECLINING" : "STABLE"),
                "overallReadiness", model.getOverallReadiness()
        );
    }

    /**
     * BKT + IRT 2PL Formulation: Computes posterior mastery probability.
     */
    private double computeBktIrtPosterior(
            double priorMastery,
            double difficultyB,
            double rawPassedRatio,
            int attempts,
            int durationSeconds,
            int proctorViolations
    ) {
        double evidence = computeEffectiveEvidence(rawPassedRatio, attempts, durationSeconds, proctorViolations);

        // Dynamic IRT Slipping & Guessing
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

        String prompt = String.format("""
                You are the ProctorX Adaptive Question Generator.
                Generate exactly 3 progressive DSA programming problems strictly for the target skill and difficulty.

                Target Skill: %s
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
                      "pattern": "Specific Pattern",
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
                """, targetSkill, mastery, difficulty, learningObjective);

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
                            q.setPattern(qNode.path("pattern").asText("STANDARD"));
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

        // Q1
        AdaptiveTrainingQuestionEntity q1 = new AdaptiveTrainingQuestionEntity();
        q1.setTrainingExam(exam);
        q1.setTitle(targetSkill + " Fundamentals: Warmup");
        q1.setDescription("Given an integer N followed by N space-separated integers, compute the sum of all elements.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nSingle integer representing the sum.");
        q1.setTopic(targetSkill);
        q1.setPattern("BASIC_ACCUMULATION");
        q1.setDifficulty(difficulty);
        q1.setTestCasesJson("""
                [
                  { "input": "3\\n1 2 3", "expectedOutput": "6", "sample": true },
                  { "input": "4\\n10 20 30 40", "expectedOutput": "100", "sample": true },
                  { "input": "1\\n5", "expectedOutput": "5", "sample": false }
                ]
                """);
        list.add(q1);

        // Q2
        AdaptiveTrainingQuestionEntity q2 = new AdaptiveTrainingQuestionEntity();
        q2.setTrainingExam(exam);
        q2.setTitle(targetSkill + " Core Application: " + learningObjective);
        q2.setDescription("Given an array of integers, find the maximum element and its 1-based frequency.\n\nInput format:\nFirst line integer N.\nSecond line N integers.\n\nOutput format:\nTwo space-separated integers (max_value frequency).");
        q2.setTopic(targetSkill);
        q2.setPattern("MAX_FREQUENCY");
        q2.setDifficulty(difficulty);
        q2.setTestCasesJson("""
                [
                  { "input": "5\\n3 2 1 3 3", "expectedOutput": "3 3", "sample": true },
                  { "input": "4\\n1 2 3 4", "expectedOutput": "4 1", "sample": true },
                  { "input": "3\\n7 7 7", "expectedOutput": "7 3", "sample": false }
                ]
                """);
        list.add(q2);

        // Q3
        AdaptiveTrainingQuestionEntity q3 = new AdaptiveTrainingQuestionEntity();
        q3.setTrainingExam(exam);
        q3.setTitle(targetSkill + " Mastery Challenge");
        q3.setDescription("Given an array of N integers and integer K, determine if there exists any element that appears more than N/K times. Output 'YES' or 'NO'.\n\nInput format:\nFirst line contains N and K.\nSecond line contains N integers.\n\nOutput format:\n'YES' or 'NO'.");
        q3.setTopic(targetSkill);
        q3.setPattern("MAJORITY_FREQUENCY");
        q3.setDifficulty(difficulty);
        q3.setTestCasesJson("""
                [
                  { "input": "6 3\\n1 1 2 2 3 5", "expectedOutput": "NO", "sample": true },
                  { "input": "4 2\\n3 3 3 1", "expectedOutput": "YES", "sample": true },
                  { "input": "5 3\\n2 2 2 1 4", "expectedOutput": "YES", "sample": false }
                ]
                """);
        list.add(q3);

        return list;
    }

    public List<Map<String, Object>> parseTestCases(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String findWeakestDsaSkill(List<SkillMasteryEntity> masteries) {
        return masteries.stream()
                .filter(sm -> "DSA_TOPIC".equals(sm.getDimensionType()))
                .min(Comparator.comparingDouble(SkillMasteryEntity::getMastery))
                .map(SkillMasteryEntity::getDimensionKey)
                .orElse("ARRAY");
    }

    private String resolveLearningObjective(String topic, String difficulty) {
        return switch (topic) {
            case "ARRAY" -> "Master in-place array manipulation and contiguous subarray logic.";
            case "HASHMAP" -> "Optimize frequency counting and constant-time key lookups.";
            case "TWO_POINTER" -> "Implement converging and fast-slow pointer navigation.";
            case "SLIDING_WINDOW" -> "Formulate dynamic and fixed-size sliding window bounds.";
            case "SORTING" -> "Apply custom comparator sorting and partition strategies.";
            case "BINARY_SEARCH" -> "Identify monotonic search spaces and lower/upper bound invariants.";
            case "STACK" -> "Implement monotonic stack logic and expression evaluation.";
            case "QUEUE" -> "Implement circular queue and sliding window extrema.";
            case "TREE" -> "Master recursive tree traversal, depth calculation, and BST invariants.";
            case "GRAPH" -> "Implement breadth-first search and depth-first search connectivity.";
            case "GREEDY" -> "Prove local optimal choice property for global optimization.";
            case "DYNAMIC_PROGRAMMING" -> "Formulate state transition recurrence and base conditions.";
            default -> "Strengthen algorithmic problem decomposition and edge-case handling.";
        };
    }

    private double calculateOverallReadiness(List<SkillMasteryEntity> masteries) {
        double dsaAvg = masteries.stream()
                .filter(sm -> "DSA_TOPIC".equals(sm.getDimensionType()))
                .mapToDouble(SkillMasteryEntity::getMastery)
                .average()
                .orElse(0.15);

        double behAvg = masteries.stream()
                .filter(sm -> "BEHAVIORAL".equals(sm.getDimensionType()))
                .mapToDouble(SkillMasteryEntity::getMastery)
                .average()
                .orElse(0.20);

        double combined = (0.75 * dsaAvg) + (0.25 * behAvg);
        return Math.round(combined * 100.0) / 100.0;
    }

    private boolean isOutputMatching(String actual, String expected) {
        if (actual == null || expected == null) return false;
        String cleanActual = actual.replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").trim();
        String cleanExpected = expected.replaceAll("\\r\\n", "\n").replaceAll("\\r", "\n").trim();
        return cleanActual.equals(cleanExpected);
    }
}
