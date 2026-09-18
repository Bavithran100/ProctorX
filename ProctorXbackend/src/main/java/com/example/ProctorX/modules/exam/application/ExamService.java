package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.QuestionEntity;
import com.example.ProctorX.Repository.CodingQuestionRepository;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;

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
            throw new IllegalStateException("Add all planned questions before publishing");
        }

        exam.setStatus(ExamEntity.ExamStatus.PUBLISHED);
        examRepository.save(exam);
        return "Success";


    }
    @Autowired
    private CodingQuestionRepository codingQuestionRepository;

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

    private int allocateQuestionMarks(ExamEntity exam, long existingQuestionCount) {
        int marksPerQuestion = exam.getTotalMarks() / exam.getQuestionCount();
        int remainingMarks = exam.getTotalMarks() % exam.getQuestionCount();
        return marksPerQuestion + (existingQuestionCount < remainingMarks ? 1 : 0);
    }
}
