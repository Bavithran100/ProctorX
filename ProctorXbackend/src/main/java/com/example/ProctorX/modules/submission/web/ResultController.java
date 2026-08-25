package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.Service.Impl.ExamSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/results")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class ResultController {

    private final ExamSubmissionService submissionService;

    private final AuthService authService;

    @GetMapping
    public List<Map<String, Object>> myResults(Authentication auth) {

        String email = auth.getName();

        // get user safely (works for OAuth + normal login)
        AuthEntity student = authService.getCurrentUser(auth);

        return submissionService.getMyResults(student.getEmail())
                .stream()
                .map(sub -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("examTitle", sub.getExam().getTitle());
                    map.put("score", sub.getScore());
                    map.put("totalMarks", sub.getExam().getTotalMarks());
                    map.put("submittedAt", sub.getSubmittedAt());
                    return map;
                })
                .toList();
    }
}
