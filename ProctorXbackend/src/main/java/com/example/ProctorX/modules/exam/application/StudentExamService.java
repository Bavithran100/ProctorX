package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Entity.QuestionEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.Repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StudentExamService {

    private final ExamRepository examRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final QuestionRepository questionRepository;

    public List<ExamEntity> getTodaysExams() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        return examRepository.findTodaysExams(startOfDay, endOfDay);
    }

    public List<ExamEntity> getUpcomingExams() {
        LocalDateTime now = LocalDateTime.now();
        return examRepository.findUpcomingExams(now);
    }

    // Get Live active exams available for student to take
    public List<ExamEntity> getLiveExams(AuthEntity student, String dateStr, String type, String search) {
        LocalDateTime now = LocalDateTime.now();
        List<ExamEntity> allPublished = examRepository.findAll().stream()
                .filter(e -> e.getStatus() == ExamEntity.ExamStatus.PUBLISHED)
                .filter(e -> e.getEndTime() != null && e.getEndTime().isAfter(now))
                .filter(e -> student == null || !submissionRepository.existsByExam_IdAndStudent_Id(e.getId(), student.getId()))
                .toList();

        return allPublished.stream()
                .filter(e -> {
                    if (dateStr != null && !dateStr.trim().isEmpty()) {
                        try {
                            LocalDate targetDate = LocalDate.parse(dateStr.trim());
                            if (e.getStartTime() == null || !e.getStartTime().toLocalDate().equals(targetDate)) {
                                return false;
                            }
                        } catch (Exception ignored) {}
                    }

                    if (type != null && !type.equalsIgnoreCase("ALL") && !type.trim().isEmpty()) {
                        if (e.getExamType() == null || !e.getExamType().name().equalsIgnoreCase(type.trim())) {
                            return false;
                        }
                    }

                    if (search != null && !search.trim().isEmpty()) {
                        String q = search.trim().toLowerCase();
                        boolean matchTitle = e.getTitle() != null && e.getTitle().toLowerCase().contains(q);
                        boolean matchCoord = e.getCoordinatorName() != null && e.getCoordinatorName().toLowerCase().contains(q);
                        boolean matchDesc = e.getDescription() != null && e.getDescription().toLowerCase().contains(q);
                        if (!matchTitle && !matchCoord && !matchDesc) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted(Comparator.comparing(ExamEntity::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    // Get Attended Exams (completed by student)
    public List<Map<String, Object>> getAttendedExams(AuthEntity student) {
        if (student == null) return List.of();
        List<ExamSubmissionEntity> submissions = submissionRepository.findByStudentEmailOrderBySubmittedAtDesc(student.getEmail());

        return submissions.stream().map(sub -> {
            Map<String, Object> map = new HashMap<>();
            ExamEntity exam = sub.getExam();
            int total = exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100;
            int score = sub.getScore() != null ? sub.getScore() : 0;
            int percentage = Math.round(((float) score / total) * 100);

            map.put("submissionId", sub.getId());
            map.put("examId", exam.getId());
            map.put("title", exam.getTitle());
            map.put("description", exam.getDescription());
            map.put("examType", exam.getExamType() != null ? exam.getExamType().name() : "MCQ");
            map.put("duration", exam.getDuration());
            map.put("score", score);
            map.put("totalMarks", total);
            map.put("percentage", percentage);
            map.put("isPass", score >= (total / 2));
            map.put("coordinatorName", exam.getCoordinatorName() != null ? exam.getCoordinatorName() : "Faculty Coordinator");
            map.put("startTime", exam.getStartTime());
            map.put("endTime", exam.getEndTime());
            map.put("submittedAt", sub.getSubmittedAt());
            return map;
        }).toList();
    }

    // Get Missed Exams (window concluded and not submitted)
    public List<ExamEntity> getMissedExams(AuthEntity student) {
        LocalDateTime now = LocalDateTime.now();
        return examRepository.findAll().stream()
                .filter(e -> e.getStatus() == ExamEntity.ExamStatus.PUBLISHED)
                .filter(e -> e.getEndTime() != null && e.getEndTime().isBefore(now))
                .filter(e -> student == null || !submissionRepository.existsByExam_IdAndStudent_Id(e.getId(), student.getId()))
                .sorted(Comparator.comparing(ExamEntity::getEndTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    // Start Virtual Contest (sanitized exam for practice)
    public ExamEntity getVirtualContestExam(Long examId) {
        return examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
    }

    // Calculate virtual score without database persistence
    public Map<String, Object> evaluateVirtualSubmission(Long examId, Map<String, Object> payload) {
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        int totalMarks = exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100;
        int score = 0;

        if (exam.getExamType() == ExamEntity.ExamType.MCQ) {
            Object rawAnswers = payload.get("answers");
            if (rawAnswers instanceof Map<?, ?> answerMap) {
                for (Map.Entry<?, ?> entry : answerMap.entrySet()) {
                    try {
                        Long qId = Long.valueOf(entry.getKey().toString());
                        String selected = String.valueOf(entry.getValue());
                        QuestionEntity question = questionRepository.findById(qId).orElse(null);
                        if (question != null && question.getExam().getId().equals(examId)) {
                            if (question.getCorrectOption() != null && question.getCorrectOption().equalsIgnoreCase(selected)) {
                                score += question.getMarks();
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
        } else {
            // Coding virtual score from test cases
            score = ((Number) payload.getOrDefault("score", 0)).intValue();
        }

        score = Math.max(0, Math.min(score, totalMarks));
        int percentage = Math.round(((float) score / totalMarks) * 100);
        boolean isPass = score >= (totalMarks / 2);

        return Map.of(
                "score", score,
                "totalMarks", totalMarks,
                "percentage", percentage,
                "isPass", isPass,
                "isVirtual", true,
                "message", "Virtual contest evaluation complete! Practice score calculated (not saved to official records)."
        );
    }
}
