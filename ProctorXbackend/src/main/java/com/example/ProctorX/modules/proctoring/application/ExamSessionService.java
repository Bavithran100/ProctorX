package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Config.ExamWarningException;
import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Repository.ExamSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExamSessionService {

    private final ExamSessionRepository sessionRepository;

    public ExamSessionEntity createSession(
            ExamEntity exam,
            AuthEntity student
    ) {
        Optional<ExamSessionEntity> existingSession = sessionRepository
                .findByExamAndStudent(exam, student);

        if (existingSession.isPresent()) {
            ExamSessionEntity session = existingSession.get();

            if (session.getStatus() == ExamSessionEntity.Status.SUBMITTED) {
                throw new IllegalStateException("EXAM_ALREADY_SUBMITTED");
            }

            if (session.getStatus() == ExamSessionEntity.Status.LOCKED) {
                throw new IllegalStateException("SESSION_WAITING");
            }

            if (session.getStatus() == ExamSessionEntity.Status.WAITING) {
                throw new IllegalStateException("SESSION_WAITING");
            }

            if (session.getStatus() == ExamSessionEntity.Status.TERMINATED) {
                throw new IllegalStateException("SESSION_TERMINATED");
            }

            if (session.getLastHeartbeat() != null
                    && Duration.between(session.getLastHeartbeat(), LocalDateTime.now()).getSeconds() > 15) {
                long inactiveSeconds = Duration.between(session.getLastHeartbeat(), LocalDateTime.now()).getSeconds();
                session.setDisconnectCount(session.getDisconnectCount() + 1);
                session.setInactiveOverLimit(inactiveSeconds > 600);
                // Record the reconnect immediately so repeated page loads do not count it again.
                session.setLastHeartbeat(LocalDateTime.now());
                return sessionRepository.save(session);
            }

            return session;
        }

        ExamSessionEntity session = new ExamSessionEntity();
        session.setExam(exam);
        session.setStudent(student);
        session.setStartTime(LocalDateTime.now());
        session.setLastHeartbeat(LocalDateTime.now());
        session.setStatus(ExamSessionEntity.Status.ACTIVE);
        session.setDisconnectCount(0);
        session.setInactiveOverLimit(false);
        session.setCurrentScore(0);

        return sessionRepository.save(session);
    }

    public void markSubmitted(ExamEntity exam, AuthEntity student) {
        ExamSessionEntity session = sessionRepository
                .findByExamAndStudent(exam, student)
                .orElseThrow();
        if (session.getStatus() != ExamSessionEntity.Status.ACTIVE) {
            throw new IllegalStateException("SESSION_NOT_ACTIVE");
        }


        session.setStatus(ExamSessionEntity.Status.SUBMITTED);
        session.setStatusMessage("Your exam has been submitted.");
        sessionRepository.save(session);
    }

    public void markSubmitted(ExamEntity exam, AuthEntity student, int score) {
        ExamSessionEntity session = sessionRepository
                .findByExamAndStudent(exam, student)
                .orElseThrow();
        if (session.getStatus() != ExamSessionEntity.Status.ACTIVE) {
            throw new IllegalStateException("SESSION_NOT_ACTIVE");
        }
        session.setCurrentScore(score);
        session.setStatus(ExamSessionEntity.Status.SUBMITTED);
        session.setStatusMessage("Your exam has been submitted.");
        sessionRepository.save(session);
    }

    public ExamSessionEntity getSession(ExamEntity exam, AuthEntity student) {
        return sessionRepository.findByExamAndStudent(exam, student)
                .orElseThrow(() -> new IllegalStateException("SESSION_NOT_FOUND"));
    }

    public Optional<ExamSessionEntity> findSession(ExamEntity exam, AuthEntity student) {
        return sessionRepository.findByExamAndStudent(exam, student);
    }

    public void markSubmitted(ExamSessionEntity session, String message) {
        session.setStatus(ExamSessionEntity.Status.SUBMITTED);
        session.setStatusMessage(message);
        sessionRepository.save(session);
    }

    public boolean isOverInactiveLimit(ExamSessionEntity session) {
        return session.isInactiveOverLimit()
                || (session.getLastHeartbeat() != null
                && session.getLastHeartbeat().isBefore(LocalDateTime.now().minusMinutes(10)));
    }

    public boolean isTimeOver(ExamSessionEntity session) {
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = scheduledDeadline.isBefore(durationDeadline)
                ? scheduledDeadline : durationDeadline;
        return !LocalDateTime.now().isBefore(deadline);
    }

    public long remainingSeconds(ExamSessionEntity session) {
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = scheduledDeadline.isBefore(durationDeadline)
                ? scheduledDeadline : durationDeadline;
        return Math.max(0, Duration.between(LocalDateTime.now(), deadline).getSeconds());
    }

    public void requireActiveSession(ExamEntity exam, AuthEntity student) {
        ExamSessionEntity session = sessionRepository
                .findByExamAndStudent(exam, student)
                .orElseThrow(() -> new IllegalStateException("SESSION_NOT_FOUND"));

        if (session.getStatus() != ExamSessionEntity.Status.ACTIVE) {
            throw new IllegalStateException(session.getStatus() == ExamSessionEntity.Status.WAITING
                    || session.getStatus() == ExamSessionEntity.Status.LOCKED
                    ? "SESSION_WAITING" : "SESSION_NOT_ACTIVE");
        }
    }

    public void heartbeat(ExamEntity exam, AuthEntity student) {

        ExamSessionEntity session = sessionRepository
                .findByExamAndStudent(exam, student)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));



        if (session.getStatus() == ExamSessionEntity.Status.LOCKED) {
            throw new IllegalStateException("SESSION_WAITING");
        }

        if (session.getStatus() == ExamSessionEntity.Status.WAITING) {
            throw new IllegalStateException("SESSION_WAITING");
        }

        if (session.getStatus() == ExamSessionEntity.Status.TERMINATED) {
            throw new IllegalStateException("SESSION_TERMINATED");
        }
        if (session.getStatus() == ExamSessionEntity.Status.SUBMITTED) {
            throw new IllegalStateException("EXAM_ALREADY_SUBMITTED");
        }
        System.out.println(session.getWarning());
        if (session.getWarning() != null && !session.getWarning().isBlank()) {
            String warning=session.getWarning();
            session.setWarning(null);
            session.setLastHeartbeat(LocalDateTime.now());
            sessionRepository.save(session);
            throw new ExamWarningException(warning);
        }



        session.setLastHeartbeat(LocalDateTime.now());
        sessionRepository.save(session);

    }

}
