package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.*;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.Repository.QuestionRepository;
import com.example.ProctorX.Service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExamSubmissionService {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final ExamSessionRepository sessionRepository;
    private final EmailService emailService;

    // START EXAM
    public ExamEntity startExam(Long examId, AuthEntity student) {
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(exam.getStartTime()) || now.isAfter(exam.getEndTime())) {
            throw new IllegalStateException("EXAM_NOT_ACTIVE");
        }

        return exam;
    }

    // SUBMIT EXAM (entity based)
    public int submitExam(
            Long examId,
            AuthEntity student,
            ExamSubmissionEntity submission
    ) {
        ExamEntity exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        if (submissionRepository.existsByExam_IdAndStudent_Id(examId, student.getId())) {
            throw new IllegalStateException("EXAM_ALREADY_SUBMITTED");
        }

        submission.setExam(exam);
        submission.setStudent(student);
        submission.setSubmittedAt(LocalDateTime.now());

        int score = 0;
        Set<Long> answeredQuestionIds = new HashSet<>();

        for (AnswerEntity ans : submission.getAnswers()) {
            QuestionEntity question = questionRepository
                    .findById(ans.getQuestion().getId())
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            if (!question.getExam().getId().equals(examId)) {
                throw new IllegalArgumentException("Question does not belong to this exam");
            }

            if (!answeredQuestionIds.add(question.getId())) {
                throw new IllegalArgumentException("A question can only be answered once");
            }

            ans.setSubmission(submission);
            ans.setQuestion(question);

            if (question.getCorrectOption().equalsIgnoreCase(ans.getSelectedOption())) {
                score += question.getMarks();
            }
        }

        submission.setScore(score);
        submissionRepository.save(submission);

        try {
            emailService.sendExamScoreEmail(
                    student.getEmail(),
                    student.getName(),
                    exam.getTitle(),
                    exam.getExamType() != null ? exam.getExamType().name() : "MCQ",
                    score,
                    exam.getTotalMarks(),
                    exam.getCoordinatorName()
            );
        } catch (Exception ignored) {}

        return score;
    }

    public List<ExamSubmissionEntity> getMyResults(String email) {
        return submissionRepository.findByStudentEmailOrderBySubmittedAtDesc(email);
    }

    public void saveCodingSubmission(ExamSubmissionEntity submission) {
        if (submissionRepository.existsByExam_IdAndStudent_Id(
                submission.getExam().getId(),
                submission.getStudent().getId()
        )) {
            throw new IllegalStateException("EXAM_ALREADY_SUBMITTED");
        }

        submissionRepository.save(submission);

        try {
            emailService.sendExamScoreEmail(
                    submission.getStudent().getEmail(),
                    submission.getStudent().getName(),
                    submission.getExam().getTitle(),
                    "CODING",
                    submission.getScore() != null ? submission.getScore() : 0,
                    submission.getExam().getTotalMarks(),
                    submission.getExam().getCoordinatorName()
            );
        } catch (Exception ignored) {}
    }

    public int saveMcqProgress(ExamSessionEntity session, Map<Long, String> answers) {
        if (session.getStatus() != ExamSessionEntity.Status.ACTIVE) {
            throw new IllegalStateException("SESSION_NOT_ACTIVE");
        }

        int score = 0;
        for (Map.Entry<Long, String> answer : answers.entrySet()) {
            QuestionEntity question = questionRepository.findById(answer.getKey())
                    .orElseThrow(() -> new IllegalArgumentException("Question not found"));
            if (!question.getExam().getId().equals(session.getExam().getId())) {
                throw new IllegalArgumentException("Question does not belong to this exam");
            }
            if (question.getCorrectOption().equalsIgnoreCase(answer.getValue())) {
                score += question.getMarks();
            }
        }

        session.setSavedAnswersJson(serializeAnswers(answers));
        session.setCurrentScore(score);
        sessionRepository.save(session);
        return score;
    }

    public void saveCodingProgress(ExamSessionEntity session, int score) {
        if (session.getStatus() != ExamSessionEntity.Status.ACTIVE) {
            throw new IllegalStateException("SESSION_NOT_ACTIVE");
        }
        session.setCurrentScore(Math.max(0, Math.min(score, session.getExam().getTotalMarks())));
        sessionRepository.save(session);
    }

    public int forceSubmit(ExamSessionEntity session, String message) {
        if (submissionRepository.existsByExam_IdAndStudent_Id(
                session.getExam().getId(), session.getStudent().getId())) {
            session.setStatus(ExamSessionEntity.Status.SUBMITTED);
            session.setStatusMessage(message);
            sessionRepository.save(session);
            return session.getCurrentScore();
        }

        ExamSubmissionEntity submission = new ExamSubmissionEntity();
        submission.setExam(session.getExam());
        submission.setStudent(session.getStudent());
        submission.setSubmittedAt(LocalDateTime.now());

        int score = session.getCurrentScore();
        if (session.getExam().getExamType() == ExamEntity.ExamType.MCQ) {
            Map<Long, String> answers = readSavedAnswers(session.getSavedAnswersJson());
            score = 0;
            for (Map.Entry<Long, String> answer : answers.entrySet()) {
                QuestionEntity question = questionRepository.findById(answer.getKey()).orElse(null);
                if (question != null && question.getExam().getId().equals(session.getExam().getId())) {
                    AnswerEntity savedAnswer = new AnswerEntity();
                    savedAnswer.setSubmission(submission);
                    savedAnswer.setQuestion(question);
                    savedAnswer.setSelectedOption(answer.getValue());
                    submission.getAnswers().add(savedAnswer);
                    if (question.getCorrectOption().equalsIgnoreCase(answer.getValue())) {
                        score += question.getMarks();
                    }
                }
            }
        }

        submission.setScore(score);
        submissionRepository.save(submission);
        session.setCurrentScore(score);
        session.setStatus(ExamSessionEntity.Status.SUBMITTED);
        session.setStatusMessage(message);
        sessionRepository.save(session);

        try {
            emailService.sendExamScoreEmail(
                    session.getStudent().getEmail(),
                    session.getStudent().getName(),
                    session.getExam().getTitle(),
                    session.getExam().getExamType() != null ? session.getExam().getExamType().name() : "MCQ",
                    score,
                    session.getExam().getTotalMarks(),
                    session.getExam().getCoordinatorName()
            );
        } catch (Exception ignored) {}

        return score;
    }

    private Map<Long, String> readSavedAnswers(String savedAnswersJson) {
        if (savedAnswersJson == null || savedAnswersJson.isBlank()) {
            return Map.of();
        }
        Map<Long, String> answers = new HashMap<>();
        for (String item : savedAnswersJson.split(";")) {
            String[] parts = item.split(":", 2);
            if (parts.length == 2) {
                try {
                    answers.put(Long.valueOf(parts[0]), parts[1]);
                } catch (NumberFormatException ignored) {
                    // Ignore malformed saved data rather than preventing a forced submission.
                }
            }
        }
        return answers;
    }

    private String serializeAnswers(Map<Long, String> answers) {
        StringBuilder serialized = new StringBuilder();
        for (Map.Entry<Long, String> answer : answers.entrySet()) {
            if (answer.getValue() != null && !answer.getValue().contains(":")) {
                serialized.append(answer.getKey()).append(':').append(answer.getValue()).append(';');
            }
        }
        return serialized.toString();
    }
}
