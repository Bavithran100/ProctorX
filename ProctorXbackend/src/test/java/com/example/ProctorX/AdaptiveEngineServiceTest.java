package com.example.ProctorX;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.modules.adaptive.application.AdaptiveEngineService;
import com.example.ProctorX.modules.adaptive.application.DiagnosticQuestionBank;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveConstants;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingExamEntity;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingQuestionEntity;
import com.example.ProctorX.modules.adaptive.domain.LearnerModelEntity;
import com.example.ProctorX.modules.adaptive.domain.SkillMasteryEntity;
import com.example.ProctorX.modules.adaptive.infrastructure.AdaptiveTrainingExamRepository;
import com.example.ProctorX.modules.adaptive.infrastructure.LearnerModelRepository;
import com.example.ProctorX.modules.adaptive.infrastructure.SkillMasteryRepository;
import com.example.ProctorX.modules.coding.compiler.CodeExecutionRouterService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdaptiveEngineServiceTest {

    private LearnerModelRepository learnerModelRepo;
    private SkillMasteryRepository skillMasteryRepo;
    private AdaptiveTrainingExamRepository trainingExamRepo;
    private DiagnosticQuestionBank diagnosticBank;
    private CodeExecutionRouterService executionRouter;
    private ExamSubmissionRepository submissionRepository;
    private ObjectMapper objectMapper;
    private AdaptiveEngineService adaptiveEngineService;

    private AuthEntity testUser;

    @BeforeEach
    void setUp() {
        learnerModelRepo = mock(LearnerModelRepository.class);
        skillMasteryRepo = mock(SkillMasteryRepository.class);
        trainingExamRepo = mock(AdaptiveTrainingExamRepository.class);
        diagnosticBank = mock(DiagnosticQuestionBank.class);
        executionRouter = mock(CodeExecutionRouterService.class);
        submissionRepository = mock(ExamSubmissionRepository.class);
        objectMapper = new ObjectMapper();

        adaptiveEngineService = new AdaptiveEngineService(
                learnerModelRepo,
                skillMasteryRepo,
                trainingExamRepo,
                diagnosticBank,
                executionRouter,
                submissionRepository,
                objectMapper
        );

        testUser = new AuthEntity();
        testUser.setId(1L);
        testUser.setEmail("student@proctorx.com");
        testUser.setName("Test Student");

        when(learnerModelRepo.save(any(LearnerModelEntity.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void testGetOrCreateLearnerModelInitializesAllDimensions() {
        when(learnerModelRepo.findByUser(testUser)).thenReturn(Optional.empty());

        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(testUser);

        assertNotNull(model);
        assertEquals(8 + 8 + 4 + 4, model.getSkillMasteries().size());

        // Check concept count (8 Core Concepts)
        long conceptCount = model.getSkillMasteries().stream().filter(sm -> "CONCEPT".equals(sm.getDimensionType())).count();
        assertEquals(8, conceptCount);

        // Check pattern count (8 Algorithmic Patterns)
        long patternCount = model.getSkillMasteries().stream().filter(sm -> "PATTERN".equals(sm.getDimensionType())).count();
        assertEquals(8, patternCount);

        // Check competency count (4 Competencies)
        long compCount = model.getSkillMasteries().stream().filter(sm -> "COMPETENCY".equals(sm.getDimensionType())).count();
        assertEquals(4, compCount);

        // Check error profile count (4 Diagnostic Defect Profiles)
        long errorCount = model.getSkillMasteries().stream().filter(sm -> "ERROR_PROFILE".equals(sm.getDimensionType())).count();
        assertEquals(4, errorCount);
    }

    @Test
    void testMasterVectorRecommendationsEvaluatesDeficitAndErrors() {
        when(learnerModelRepo.findByUser(testUser)).thenReturn(Optional.empty());
        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(testUser);

        // Artificially configure SLIDING_WINDOW with low mastery and high off-by-one error risk
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("PATTERN".equals(sm.getDimensionType()) && "SLIDING_WINDOW".equals(sm.getDimensionKey())) {
                sm.setMastery(0.22);
                sm.setRecentTrend("DECLINING");
            }
            if ("ERROR_PROFILE".equals(sm.getDimensionType()) && "OFF_BY_ONE".equals(sm.getDimensionKey())) {
                sm.setErrorRiskProbability(0.75);
            }
        }

        Map<String, Object> summary = adaptiveEngineService.getLearnerModelSummary(model);

        assertNotNull(summary);
        assertEquals("SLIDING_WINDOW", summary.get("recommendedTopic"));
        assertEquals("PATTERN", summary.get("recommendedType"));
        assertTrue(summary.get("remediationReason").toString().contains("boundary") || summary.get("remediationReason").toString().contains("regression") || summary.get("remediationReason").toString().contains("off-by-one"));
        assertTrue((Boolean) summary.get("isRemediationRecommended"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recPatterns = (List<Map<String, Object>>) summary.get("recommendedPatterns");
        assertNotNull(recPatterns);
        assertFalse(recPatterns.isEmpty());
        assertEquals("SLIDING_WINDOW", recPatterns.get(0).get("topic"));
    }

    @Test
    void testBiDirectionalCrossReflectionAndErrorTaxonomyUpdate() {
        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(testUser);
        when(learnerModelRepo.findByUser(testUser)).thenReturn(Optional.of(model));

        // Create a Training Exam for Concept "ARRAYS_STRINGS"
        AdaptiveTrainingExamEntity exam = new AdaptiveTrainingExamEntity();
        exam.setId(101L);
        exam.setUser(testUser);
        exam.setTargetSkill("ARRAYS_STRINGS");
        exam.setDifficulty("EASY_MEDIUM");
        exam.setTotalQuestions(3);

        AdaptiveTrainingQuestionEntity q1 = new AdaptiveTrainingQuestionEntity();
        q1.setId(201L);
        q1.setTrainingExam(exam);
        q1.setTestCasesJson("[{\"input\":\"1\",\"expectedOutput\":\"1\"}]");
        exam.addQuestion(q1);

        when(trainingExamRepo.findById(101L)).thenReturn(Optional.of(exam));
        when(trainingExamRepo.save(any(AdaptiveTrainingExamEntity.class))).thenAnswer(i -> i.getArgument(0));

        // Submit answer with 100% test cases passed and OFF_BY_ONE detected
        List<Map<String, Object>> answers = List.of(
                Map.of(
                        "questionId", 201L,
                        "passedCount", 1,
                        "totalTestCases", 1,
                        "durationSeconds", 45,
                        "attempts", 1,
                        "detectedErrors", List.of("OFF_BY_ONE")
                )
        );

        Map<String, Object> result = adaptiveEngineService.submitTrainingSession(testUser, 101L, answers);

        assertNotNull(result);
        assertEquals(101L, result.get("examId"));
        assertTrue((Double) result.get("newMastery") > (Double) result.get("oldMastery"));

        // Verify that linked patterns (TWO_POINTERS, SLIDING_WINDOW, PREFIX_SUM, BINARY_SEARCH_PATTERN) were cross-updated!
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("PATTERN".equals(sm.getDimensionType()) && "TWO_POINTERS".equals(sm.getDimensionKey())) {
                assertTrue(sm.getMastery() > 0.15, "TWO_POINTERS should have received a cross-reflection boost");
                assertEquals("IMPROVING", sm.getRecentTrend());
            }
            if ("ERROR_PROFILE".equals(sm.getDimensionType()) && "OFF_BY_ONE".equals(sm.getDimensionKey())) {
                assertTrue(sm.getErrorRiskProbability() > 0.15, "OFF_BY_ONE risk should have increased after detection");
            }
        }
    }

    @Test
    void testBoilerplateOrFailedSubmissionYieldsZeroOrNegativeMastery() {
        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(testUser);
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("ARRAYS_STRINGS".equals(sm.getDimensionKey())) {
                sm.setMastery(0.12);
                sm.setBktPrior(0.12);
            }
        }
        when(learnerModelRepo.findByUser(testUser)).thenReturn(Optional.of(model));

        AdaptiveTrainingExamEntity exam = new AdaptiveTrainingExamEntity();
        exam.setId(102L);
        exam.setUser(testUser);
        exam.setTargetSkill("ARRAYS_STRINGS");
        exam.setDifficulty("EASY");
        exam.setTotalQuestions(3);

        AdaptiveTrainingQuestionEntity q1 = new AdaptiveTrainingQuestionEntity();
        q1.setId(202L);
        q1.setTitle("String Reversal Warmup");
        q1.setTopic("ARRAYS_STRINGS");
        q1.setPattern("TWO_POINTERS");
        q1.setDifficulty("EASY");
        q1.setTrainingExam(exam);
        q1.setTestCasesJson("[{\"input\":\"hello\",\"expectedOutput\":\"olleh\"}]");
        exam.addQuestion(q1);

        when(trainingExamRepo.findById(102L)).thenReturn(Optional.of(exam));
        when(trainingExamRepo.save(any(AdaptiveTrainingExamEntity.class))).thenAnswer(i -> i.getArgument(0));

        // Submit failed answer (only 1 out of 5 tests passed, boilerplate submission)
        List<Map<String, Object>> answers = List.of(
                Map.of(
                        "questionId", 202L,
                        "passedCount", 1,
                        "totalTestCases", 5,
                        "durationSeconds", 45,
                        "attempts", 1,
                        "code", "import java.util.*; public class Main { public static void main(String[] args) {} }"
                )
        );

        Map<String, Object> result = adaptiveEngineService.submitTrainingSession(testUser, 102L, answers);

        assertNotNull(result);
        assertEquals(102L, result.get("examId"));
        double oldMastery = (Double) result.get("oldMastery");
        double newMastery = (Double) result.get("newMastery");

        // Assert mastery did NOT increase on boilerplate / failed submission!
        assertTrue(newMastery <= oldMastery, "Failed or boilerplate submission should never increase mastery!");
    }
}
