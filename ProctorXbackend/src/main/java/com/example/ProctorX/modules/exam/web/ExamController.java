package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.QuestionEntity;
import com.example.ProctorX.Entity.TestCaseEntity;
import com.example.ProctorX.Service.Impl.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/exams")
@PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
public class ExamController {

    @Autowired
    private ExamService examService;

    // CREATE EXAM
    @PostMapping
    public ExamEntity createExam(@RequestBody ExamEntity exam, org.springframework.security.core.Authentication auth) {
        return examService.createExam(exam, auth);
    }

    // GET EXAM DETAILS
    @GetMapping("/{examId}")
    public ResponseEntity<?> getExamDetails(@PathVariable Long examId) {
        ExamEntity exam = examService.getExam(examId);
        int codingCount = exam.getCodingQuestions() != null ? exam.getCodingQuestions().size() : 0;
        int mcqCount = exam.getQuestions() != null ? exam.getQuestions().size() : 0;
        int actualCount = exam.getExamType() == ExamEntity.ExamType.CODING ? codingCount : mcqCount;

        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", exam.getId());
        map.put("title", exam.getTitle() != null ? exam.getTitle() : "");
        map.put("description", exam.getDescription() != null ? exam.getDescription() : "");
        map.put("duration", exam.getDuration());
        map.put("totalMarks", exam.getTotalMarks());
        map.put("questionCount", exam.getQuestionCount());
        map.put("actualQuestionCount", actualCount);
        map.put("status", exam.getStatus() != null ? exam.getStatus().name() : "DRAFT");
        map.put("examType", exam.getExamType() != null ? exam.getExamType().name() : "MCQ");
        map.put("coordinatorName", exam.getCoordinatorName() != null ? exam.getCoordinatorName() : "");
        map.put("startTime", exam.getStartTime() != null ? exam.getStartTime().toString() : "");
        map.put("endTime", exam.getEndTime() != null ? exam.getEndTime().toString() : "");

        return ResponseEntity.ok(map);
    }

    // GET CODING QUESTIONS FOR EXAM
    @GetMapping("/{examId}/coding-questions")
    public List<CodingQuestionEntity> getCodingQuestions(@PathVariable Long examId) {
        return examService.getCodingQuestions(examId);
    }

    // GET MCQ QUESTIONS FOR EXAM
    @GetMapping("/{examId}/questions")
    public List<QuestionEntity> getQuestions(@PathVariable Long examId) {
        return examService.getQuestions(examId);
    }

    // ADD MCQ QUESTION
    @PostMapping("/{examId}/questions")
    public QuestionEntity addQuestion(
            @PathVariable Long examId,
            @RequestBody QuestionEntity question) {
        return examService.addQuestion(examId, question);
    }

    // DELETE MCQ QUESTION
    @DeleteMapping("/{examId}/questions/{questionId}")
    public ResponseEntity<?> deleteQuestion(
            @PathVariable Long examId,
            @PathVariable Long questionId) {
        examService.deleteQuestion(examId, questionId);
        return ResponseEntity.ok(Map.of("message", "Question deleted successfully"));
    }

    // PUBLISH EXAM
    @PostMapping("/{examId}/questions/Publish")
    public String publish(@PathVariable Long examId) {
        return examService.publish(examId);
    }

    // ADD CODING QUESTION
    @PostMapping("/{examId}/coding-questions")
    public CodingQuestionEntity addCodingQuestion(
            @PathVariable Long examId,
            @RequestBody CodingQuestionEntity question) {
        return examService.addCodingQuestion(examId, question);
    }

    // ADD TEST CASE TO EXISTING CODING QUESTION
    @PostMapping("/{examId}/coding-questions/{questionId}/test-cases")
    public TestCaseEntity addTestCase(
            @PathVariable Long examId,
            @PathVariable Long questionId,
            @RequestBody TestCaseEntity testCase) {
        return examService.addTestCaseToQuestion(examId, questionId, testCase);
    }

    // DELETE CODING QUESTION
    @DeleteMapping("/{examId}/coding-questions/{questionId}")
    public ResponseEntity<?> deleteCodingQuestion(
            @PathVariable Long examId,
            @PathVariable Long questionId) {
        examService.deleteCodingQuestion(examId, questionId);
        return ResponseEntity.ok(Map.of("message", "Coding question deleted successfully"));
    }
}