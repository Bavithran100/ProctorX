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
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
public class ResultController {

    private final ExamSubmissionService submissionService;

    private final AuthService authService;

    @GetMapping
    public Map<String, Object> myResults(Authentication auth) {
        AuthEntity student = authService.getCurrentUser(auth);

        List<Map<String, Object>> records = submissionService.getMyResults(student.getEmail())
                .stream()
                .map(sub -> {
                    Map<String, Object> map = new HashMap<>();
                    ExamEntity exam = sub.getExam();
                    int total = exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100;
                    int score = sub.getScore() != null ? sub.getScore() : 0;
                    int percentage = Math.round(((float) score / total) * 100);

                    map.put("submissionId", sub.getId());
                    map.put("examId", exam.getId());
                    map.put("examTitle", exam.getTitle());
                    map.put("description", exam.getDescription());
                    map.put("examType", exam.getExamType() != null ? exam.getExamType().name() : "MCQ");
                    map.put("coordinatorName", exam.getCoordinatorName() != null ? exam.getCoordinatorName() : "Faculty Coordinator");
                    map.put("duration", exam.getDuration());
                    map.put("score", score);
                    map.put("totalMarks", total);
                    map.put("percentage", percentage);
                    map.put("isPass", score >= (total / 2));
                    map.put("submittedAt", sub.getSubmittedAt());
                    return map;
                })
                .toList();

        int totalExams = records.size();
        long passedCount = records.stream().filter(r -> Boolean.TRUE.equals(r.get("isPass"))).count();
        int totalScore = records.stream().mapToInt(r -> (int) r.get("score")).sum();
        int totalPossible = records.stream().mapToInt(r -> (int) r.get("totalMarks")).sum();
        int avgPercentage = totalPossible > 0 ? Math.round(((float) totalScore / totalPossible) * 100) : 0;

        Map<String, Object> studentInfo = new HashMap<>();
        studentInfo.put("name", student.getName());
        studentInfo.put("email", student.getEmail());
        studentInfo.put("institution", student.getInstitution());
        studentInfo.put("department", student.getDepartment());
        studentInfo.put("designation", student.getDesignation());
        studentInfo.put("username", student.getUsername());
        studentInfo.put("bio", student.getBio());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalExams", totalExams);
        stats.put("passedExams", passedCount);
        stats.put("totalScore", totalScore);
        stats.put("totalPossible", totalPossible);
        stats.put("averagePercentage", avgPercentage);

        Map<String, Object> response = new HashMap<>();
        response.put("student", studentInfo);
        response.put("results", records);
        response.put("stats", stats);
        return response;
    }
}
