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
        assertEquals(12 + 9 + 5 + 9, model.getSkillMasteries().size());

        // Check concept count
        long conceptCount = model.getSkillMasteries().stream().filter(sm -> "CONCEPT".equals(sm.getDimensionType())).count();
        assertEquals(12, conceptCount);

        // Check pattern count
        long patternCount = model.getSkillMasteries().stream().filter(sm -> "PATTERN".equals(sm.getDimensionType())).count();
        assertEquals(9, patternCount);

        // Check competency count
        long compCount = model.getSkillMasteries().stream().filter(sm -> "COMPETENCY".equals(sm.getDimensionType())).count();
        assertEquals(5, compCount);

        // Check error profile count
        long errorCount = model.getSkillMasteries().stream().filter(sm -> "ERROR_PROFILE".equals(sm.getDimensionType())).count();
        assertEquals(9, errorCount);
    }

    @Test
    void testMasterVectorRecommendationsEvaluatesDeficitAndErrors() {
        when(learnerModelRepo.findByUser(testUser)).thenReturn(Optional.empty());
        LearnerModelEntity model = adaptiveEngineService.getOrCreateLearnerModel(testUser);

        // Artificially configure SLIDING_WINDOW with low mastery and high boundary error risk
        for (SkillMasteryEntity sm : model.getSkillMasteries()) {
            if ("PATTERN".equals(sm.getDimensionType()) && "SLIDING_WINDOW".equals(sm.getDimensionKey())) {
                sm.setMastery(0.22);
                sm.setRecentTrend("DECLINING");
            }
            if ("ERROR_PROFILE".equals(sm.getDimensionType()) && "BOUNDARY_CONDITION".equals(sm.getDimensionKey())) {
                sm.setErrorRiskProbability(0.75);
            }
        }

        Map<String, Object> summary = adaptiveEngineService.getLearnerModelSummary(model);

        assertNotNull(summary);
        assertEquals("SLIDING_WINDOW", summary.get("recommendedTopic"));
        assertEquals("PATTERN", summary.get("recommendedType"));
        assertTrue(summary.get("remediationReason").toString().contains("boundary") || summary.get("remediationReason").toString().contains("regression"));
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

        // Create a Training Exam for Concept "ARRAYS"
        AdaptiveTrainingExamEntity exam = new AdaptiveTrainingExamEntity();
        exam.setId(101L);
        exam.setUser(testUser);
        exam.setTargetSkill("ARRAYS");
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
}
