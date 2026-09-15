package com.example.ProctorX.Controller;

import com.example.ProctorX.Config.ExamWarningException;
import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Service.AuthService;
import com.example.ProctorX.Service.Impl.ExamSessionService;
import com.example.ProctorX.Service.Impl.ExamSubmissionService;
import com.example.ProctorX.Service.Impl.MalPracticeLogService;
import com.example.ProctorX.Service.Impl.StudentExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/exams")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
public class StudentExamController {

    private final ExamRepository examRepository;
    private final StudentExamService studentExamService;
    private final ExamSessionService examSessionService;
    private final ExamSubmissionService submissionService;
    private final AuthService authService;
    private final MalPracticeLogService malPracticeLogService;

    @GetMapping("/today")
    public ResponseEntity<List<ExamEntity>> getTodaysExams(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(studentExamService.getTodaysExams());
    }

    @GetMapping("/upcoming")
    public List<ExamEntity> upcomingExams() {
        return studentExamService.getUpcomingExams();
    }

    @GetMapping("/{examId}/eligibility")
    public ResponseEntity<?> examEligibility(@PathVariable Long examId, Authentication authentication) {
        try {
            AuthEntity student = authService.getCurrentUser(authentication);
            ExamEntity exam = submissionService.startExam(examId, student);
            var existingSession = examSessionService.findSession(exam, student);
            if (existingSession.isPresent() && existingSession.get().getStatus()
                    != com.example.ProctorX.Entity.ExamSessionEntity.Status.ACTIVE) {
                return ResponseEntity.status(409).body(sessionErrorMessage(
                        existingSession.get().getStatus() == com.example.ProctorX.Entity.ExamSessionEntity.Status.WAITING
                                ? "SESSION_WAITING" : "SESSION_NOT_ACTIVE"));
            }
            return ResponseEntity.ok(Map.of("examType", exam.getExamType(), "title", exam.getTitle()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(409).body(sessionErrorMessage(exception.getMessage()));
        }
    }

    // START EXAM
    @GetMapping("/{examId}/start")
    public ResponseEntity<?> startExam(
            @PathVariable Long examId,
            Authentication authentication
    ) {
        try {
            AuthEntity student = authService.getCurrentUser(authentication);
            ExamEntity exam1 = examRepository.findById(examId)
                    .orElseThrow();
            var existingSession = examSessionService.findSession(exam1, student);
            if (existingSession.isPresent()
                    && existingSession.get().getStatus() == com.example.ProctorX.Entity.ExamSessionEntity.Status.ACTIVE
                    && examSessionService.isTimeOver(existingSession.get())) {
                submissionService.forceSubmit(existingSession.get(),
                        "Your exam time ended and the current progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }

            ExamEntity exam = submissionService.startExam(examId, student);
            var examSession = examSessionService.createSession(exam1, student);

            if (examSessionService.isTimeOver(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam time ended and the current progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }
            if (examSessionService.isOverInactiveLimit(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam was inactive for more than 10 minutes and the current progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_INACTIVE_SUBMITTED");
            }
            if (examSession.getDisconnectCount() > 3) {
                submissionService.forceSubmit(examSession,
                        "Your exam was submitted after exceeding the three allowed reconnects.");
                return ResponseEntity.status(409).body("RECONNECT_LIMIT_REACHED");
            }

            return ResponseEntity.ok(Map.of(
                    "exam", exam,
                    "sessionId", examSession.getId(),
                    "sessionStartTime", examSession.getStartTime(),
                    "remainingSeconds", examSessionService.remainingSeconds(examSession),
                    "disconnectCount", examSession.getDisconnectCount()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(sessionErrorMessage(e.getMessage()));
        }
    }

    // SUBMIT EXAM (ENTITY)
    @PostMapping("/{examId}/submit")
    public ResponseEntity<?> submitExam(
            @PathVariable Long examId,
            @RequestBody ExamSubmissionEntity submission,
            Authentication authentication
    ) {
        try {
            ExamEntity exam = examRepository.findById(examId)
                    .orElseThrow();
            AuthEntity student = authService.getCurrentUser(authentication);
            var examSession = examSessionService.getSession(exam, student);
            if (examSessionService.isTimeOver(examSession) || examSessionService.isOverInactiveLimit(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam time ended or the session was inactive too long; saved progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }

            Integer score = submissionService.submitExam(
                    examId,
                    student,
                    submission
            );
            examSessionService.markSubmitted(exam, student, score);

            return ResponseEntity.ok(
                    Map.of("score", score)
            );
        } catch (IllegalStateException e) {
            if ("EXAM_ALREADY_SUBMITTED".equals(e.getMessage())) {
                return ResponseEntity.status(409).body("Exam already submitted");
            }
            return ResponseEntity.status(403).body("Exam not active");
        }
    }

    @PostMapping("/{examId}/heartbeat")
    public ResponseEntity<?> heartbeat(
            @PathVariable Long examId,
            Authentication authentication
    ) {
        AuthEntity student = authService.getCurrentUser(authentication);

        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow();
        var examSession = examSessionService.getSession(exam, student);
        if (examSessionService.isTimeOver(examSession)) {
            submissionService.forceSubmit(examSession,
                    "Your exam time ended and the current progress was submitted.");
            return ResponseEntity
                    .status(409)
                    .body("EXAM_TIME_OVER_SUBMITTED");
        }
        if (examSessionService.isOverInactiveLimit(examSession)) {
            submissionService.forceSubmit(examSession,
                    "Your exam was inactive for more than 10 minutes and the current progress was submitted.");
            return ResponseEntity.status(409).body("EXAM_INACTIVE_SUBMITTED");
        }

        try {
            examSessionService.heartbeat(exam, student);
            return ResponseEntity.ok().build();
        } catch (ExamWarningException e) {
            return ResponseEntity
                    .status(200)
                    .header("X-EXAM-WARNING", "true")
                    .body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(sessionErrorMessage(e.getMessage()));
        }
    }

    @PostMapping("/{examId}/progress")
    public ResponseEntity<?> saveProgress(
            @PathVariable Long examId,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        try {
            AuthEntity student = authService.getCurrentUser(authentication);
            ExamEntity exam = examRepository.findById(examId).orElseThrow();
            var examSession = examSessionService.getSession(exam, student);
            if (examSessionService.isTimeOver(examSession) || examSessionService.isOverInactiveLimit(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam time ended or the session was inactive too long; saved progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }
            Map<Long, String> answers = new HashMap<>();
            Object rawAnswers = payload.get("answers");
            if (rawAnswers instanceof Map<?, ?> answerMap) {
                for (Map.Entry<?, ?> entry : answerMap.entrySet()) {
                    answers.put(Long.valueOf(entry.getKey().toString()), String.valueOf(entry.getValue()));
                }
            }
            return ResponseEntity.ok(Map.of("score", submissionService.saveMcqProgress(examSession, answers)));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(403).body(sessionErrorMessage(exception.getMessage()));
        }
    }

    @PostMapping("/{examId}/coding-progress")
    public ResponseEntity<?> saveCodingProgress(
            @PathVariable Long examId,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        try {
            AuthEntity student = authService.getCurrentUser(authentication);
            ExamEntity exam = examRepository.findById(examId).orElseThrow();
            var examSession = examSessionService.getSession(exam, student);
            if (examSessionService.isTimeOver(examSession) || examSessionService.isOverInactiveLimit(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam time ended or the session was inactive too long; saved progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }
            int score = ((Number) payload.getOrDefault("score", 0)).intValue();
            submissionService.saveCodingProgress(examSession, score);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(403).body(sessionErrorMessage(exception.getMessage()));
        }
    }

    @PostMapping("/{examId}/malpractice")
    public ResponseEntity<?> logMalpractice(
            @PathVariable Long examId,
            @RequestParam String event,
            @RequestParam(defaultValue = "1") int count,
            Authentication authentication
    ) {
        AuthEntity student = authService.getCurrentUser(authentication);

        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow();

        MalPracticeLogEntity.EventType eventType =
                MalPracticeLogEntity.EventType.valueOf(event);

        malPracticeLogService.logEvent(exam, student, eventType, count);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/{examId}/coding-submit")
    @Transactional
    public ResponseEntity<?> submitCodingExam(
            @PathVariable Long examId,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        try {
            AuthEntity student = authService.getCurrentUser(authentication);
            Integer score = (Integer) payload.get("score");

            ExamEntity exam = examRepository.findById(examId)
                    .orElseThrow();
            examSessionService.requireActiveSession(exam, student);
            var examSession = examSessionService.getSession(exam, student);
            if (examSessionService.isTimeOver(examSession) || examSessionService.isOverInactiveLimit(examSession)) {
                submissionService.forceSubmit(examSession,
                        "Your exam time ended or the session was inactive too long; saved progress was submitted.");
                return ResponseEntity.status(409).body("EXAM_TIME_OVER_SUBMITTED");
            }

            ExamSubmissionEntity submission = new ExamSubmissionEntity();
            submission.setExam(exam);
            submission.setStudent(student);
            submission.setScore(score);
            submission.setSubmittedAt(LocalDateTime.now());

            submissionService.saveCodingSubmission(submission);
            examSessionService.markSubmitted(exam, student, score);

            return ResponseEntity.ok(Map.of("score", score));
        } catch (IllegalStateException e) {
            if ("EXAM_ALREADY_SUBMITTED".equals(e.getMessage())) {
                return ResponseEntity.status(409).body("Exam already submitted");
            }
            return ResponseEntity.status(403).body("Session not active");
        }
    }

    private String sessionErrorMessage(String error) {
        return switch (error) {
            case "EXAM_ALREADY_SUBMITTED", "SESSION_NOT_ACTIVE" -> "EXAM_ALREADY_SUBMITTED";
            case "SESSION_WAITING", "SESSION_LOCKED" -> "SESSION_WAITING";
            case "SESSION_TERMINATED" -> "EXAM_TERMINATED_BY_COORDINATOR";
            default -> "EXAM_NOT_ACTIVE";
        };
    }
}
