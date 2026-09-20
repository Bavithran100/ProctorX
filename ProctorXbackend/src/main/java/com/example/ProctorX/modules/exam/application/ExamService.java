package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.QuestionEntity;
import com.example.ProctorX.Entity.TestCaseEntity;
import com.example.ProctorX.Repository.CodingQuestionRepository;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ExamService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final CodingQuestionRepository codingQuestionRepository;

    @Autowired
    private com.example.ProctorX.Service.AuthService authService;

    public ExamEntity createExam(ExamEntity exam) {
        return createExam(exam, null);
    }

    public ExamEntity createExam(ExamEntity exam, org.springframework.security.core.Authentication auth) {

        if (exam.getQuestionCount() <= 0) {
            throw new IllegalArgumentException("Question count must be greater than zero");
        }
        if (exam.getTotalMarks() < exam.getQuestionCount()) {
            throw new IllegalArgumentException("Total marks must be at least the question count");
        }

        if (auth != null) {
            try {
                var currentUser = authService.getCurrentUser(auth);
                if (currentUser != null) {
                    String name = currentUser.getName() != null && !currentUser.getName().trim().isEmpty()
                            ? currentUser.getName().trim()
                            : currentUser.getEmail().split("@")[0];
                    exam.setCoordinatorName(name);
                    exam.setCreatedBy(currentUser.getEmail());
                }
            } catch (Exception ignored) {}
        }

        if (exam.getCoordinatorName() == null || exam.getCoordinatorName().trim().isEmpty()) {
            exam.setCoordinatorName("Examination Committee");
        }

        // Link instruction to exam
        if (exam.getInstruction() != null) {
            exam.getInstruction().setExam(exam);
        }
        ZoneId ist = ZoneId.of("Asia/Kolkata");
        LocalDateTime istStart = exam.getStartTime();
        LocalDateTime istEnd = exam.getEndTime();
        exam.setStartTime(
                istStart.atZone(ist).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime()
        );

        exam.setEndTime(
                istEnd.atZone(ist).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime()
        );
        exam.setStatus(ExamEntity.ExamStatus.DRAFT); // or PUBLISHED later
        examRepository.save(exam);
        return exam;
    }

    @Transactional(readOnly = true)
    public ExamEntity getExam(Long examId) {
        return examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found with id: " + examId));
    }

    @Transactional(readOnly = true)
    public List<CodingQuestionEntity> getCodingQuestions(Long examId) {
        return codingQuestionRepository.findByExamId(examId);
    }

    @Transactional(readOnly = true)
    public List<QuestionEntity> getQuestions(Long examId) {
        return questionRepository.findByExamId(examId);
    }

    public QuestionEntity addQuestion(Long examId, QuestionEntity question) {
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if (exam.getExamType() != ExamEntity.ExamType.MCQ) {
            throw new IllegalStateException("This exam does not accept MCQ questions");
        }

        long existingQuestionCount = questionRepository.countByExamId(examId);
        if (existingQuestionCount >= exam.getQuestionCount()) {
            throw new IllegalStateException("All planned questions have already been added");
        }

        question.setCorrectOption(question.getCorrectOption().trim().toUpperCase());
        question.setMarks(allocateQuestionMarks(exam, existingQuestionCount));
        question.setExam(exam);
        return questionRepository.save(question);
    }

    public String publish(Long examId){
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        long actualQuestionCount = exam.getExamType() == ExamEntity.ExamType.MCQ
                ? questionRepository.countByExamId(examId)
                : codingQuestionRepository.countByExamId(examId);
        if (actualQuestionCount != exam.getQuestionCount()) {
            throw new IllegalStateException("Add all planned questions before publishing (Planned: " + exam.getQuestionCount() + ", Actual: " + actualQuestionCount + ")");
        }

        if (exam.getExamType() == ExamEntity.ExamType.CODING) {
            List<CodingQuestionEntity> codingQuestions = codingQuestionRepository.findByExamId(examId);
            for (CodingQuestionEntity cq : codingQuestions) {
                if (cq.getTestCases() == null || cq.getTestCases().isEmpty()) {
                    throw new IllegalStateException("Coding question '" + cq.getTitle() + "' has no test cases. Every coding question must contain at least one test case before publishing.");
                }
            }
        }

        exam.setStatus(ExamEntity.ExamStatus.PUBLISHED);
        examRepository.save(exam);
        return "Success";
    }

    public CodingQuestionEntity addCodingQuestion(Long examId, CodingQuestionEntity question) {

        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if (exam.getExamType() != ExamEntity.ExamType.CODING) {
            throw new IllegalStateException("This exam does not accept coding questions");
        }

        long existingQuestionCount = codingQuestionRepository.countByExamId(examId);
        if (existingQuestionCount >= exam.getQuestionCount()) {
            throw new IllegalStateException("All planned questions have already been added");
        }

        question.setExam(exam);
        question.setMarks(allocateQuestionMarks(exam, existingQuestionCount));

        if (question.getTestCases() != null) {
            question.getTestCases().forEach(tc -> tc.setQuestion(question));
        }

        return codingQuestionRepository.save(question);
    }

    public TestCaseEntity addTestCaseToQuestion(Long examId, Long questionId, TestCaseEntity testCase) {
        CodingQuestionEntity question = codingQuestionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Coding question not found"));

        if (!question.getExam().getId().equals(examId)) {
            throw new IllegalArgumentException("Question does not belong to the specified exam");
        }

        testCase.setQuestion(question);
        question.getTestCases().add(testCase);
        codingQuestionRepository.save(question);
        return testCase;
    }

    public void deleteCodingQuestion(Long examId, Long questionId) {
        CodingQuestionEntity question = codingQuestionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Coding question not found"));

        if (!question.getExam().getId().equals(examId)) {
            throw new IllegalArgumentException("Question does not belong to the specified exam");
        }

        codingQuestionRepository.delete(question);
    }

    public void deleteQuestion(Long examId, Long questionId) {
        QuestionEntity question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        if (!question.getExam().getId().equals(examId)) {
            throw new IllegalArgumentException("Question does not belong to the specified exam");
        }

        questionRepository.delete(question);
    }

    private int allocateQuestionMarks(ExamEntity exam, long existingQuestionCount) {
        int marksPerQuestion = exam.getTotalMarks() / exam.getQuestionCount();
        int remainingMarks = exam.getTotalMarks() % exam.getQuestionCount();
        return marksPerQuestion + (existingQuestionCount < remainingMarks ? 1 : 0);
    }
}
