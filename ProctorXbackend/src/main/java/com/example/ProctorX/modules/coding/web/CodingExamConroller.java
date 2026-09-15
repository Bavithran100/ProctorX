package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.Service.Impl.ExamSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student/exams")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
public class CodingExamConroller {
    @Autowired
    private final ExamRepository examRepository;
    private final AuthService authService;
    private final ExamSessionService examSessionService;
    @GetMapping("/{examId}/coding-questions")
    public ResponseEntity<?> getCodingQuestions(
            @PathVariable Long examId,
            Authentication authentication
    ) {

        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow();

        try {
            examSessionService.requireActiveSession(exam, authService.getCurrentUser(authentication));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(403).body("Exam session is not active");
        }

        return ResponseEntity.ok(exam.getCodingQuestions());
    }
}
