package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AdminActionEntity;
import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Repository.AdminActionRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminActionService {

    private final ExamSessionRepository sessionRepository;
    private final AdminActionRepository actionRepository;
    private final ExamSubmissionService submissionService;
    private final com.example.ProctorX.Repository.ExamSubmissionRepository submissionRepository;

    @org.springframework.transaction.annotation.Transactional
    public void performAction(
            Long sessionId,
            AuthEntity admin,
            AdminActionEntity.ActionType action,
            String remark
    ) {
        ExamSessionEntity session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        if (action == AdminActionEntity.ActionType.REVOKE_SUBMISSION) {
            revokeSubmission(sessionId, admin, remark);
            return;
        }

        if (action == AdminActionEntity.ActionType.RESET_ATTEMPT) {
            resetAttempt(sessionId, admin, remark);
            return;
        }

        if (session.getStatus() == ExamSessionEntity.Status.SUBMITTED
                || session.getStatus() == ExamSessionEntity.Status.TERMINATED) {
            throw new IllegalStateException("Session is already closed. Use Reopen/Revoke Submission to grant re-entry.");
        }

        // Enforce action
        switch (action) {
            case LOCK, WAITING -> {
                session.setStatus(ExamSessionEntity.Status.WAITING);
                session.setStatusMessage("You are not allowed to continue this exam. Contact your coordinator.");
            }
            case NORMAL -> {
                if (session.getStatus() == ExamSessionEntity.Status.WAITING
                        || session.getStatus() == ExamSessionEntity.Status.LOCKED) {
                    session.setStatus(ExamSessionEntity.Status.ACTIVE);
                    session.setStatusMessage("Your exam session has been reopened by the coordinator.");
                }
            }
            case TERMINATE -> {
                submissionService.forceSubmit(session, "Your exam was submitted by the coordinator.");
                session.setStatus(ExamSessionEntity.Status.TERMINATED);
                session.setStatusMessage("Your exam was submitted by the coordinator.");
            }
            case WARN -> {
                session.setWarning(remark);
                // no session state change
            }
            default -> {}
        }

        sessionRepository.save(session);

        // Audit log
        AdminActionEntity log = new AdminActionEntity();
        log.setAdmin(admin);
        log.setSession(session);
        log.setAction(action);
        log.setRemark(remark);
        log.setTimestamp(LocalDateTime.now());

        actionRepository.save(log);
    }

    /**
     * Revokes premature auto-submission or termination (e.g. from fullscreen exit or tab switches)
     * and reopens the candidate's exam attempt so they can re-enter and continue.
     */
    @org.springframework.transaction.annotation.Transactional
    public void revokeSubmission(Long sessionId, AuthEntity admin, String remark) {
        ExamSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        if (session.getExam() != null && session.getStudent() != null) {
            submissionRepository.deleteByExam_IdAndStudent_Id(
                    session.getExam().getId(),
                    session.getStudent().getId()
            );
        }

        session.setStatus(ExamSessionEntity.Status.ACTIVE);
        session.setStatusMessage("Your submission has been revoked and reopened by the coordinator. You may resume your exam.");
        session.setWarning(null);
        session.setInactiveOverLimit(false);
        // Reset disconnect count cap so they aren't immediately blocked upon entering
        if (session.getDisconnectCount() >= 3) {
            session.setDisconnectCount(2);
        }
        session.setLastHeartbeat(LocalDateTime.now());
        sessionRepository.save(session);

        AdminActionEntity log = new AdminActionEntity();
        log.setAdmin(admin);
        log.setSession(session);
        log.setAction(AdminActionEntity.ActionType.REVOKE_SUBMISSION);
        log.setRemark(remark != null && !remark.isBlank() ? remark : "Coordinator revoked submission and reopened candidate session.");
        log.setTimestamp(LocalDateTime.now());
        actionRepository.save(log);
    }

    /**
     * Completely resets a candidate's exam attempt with fresh duration, starting from now.
     */
    @org.springframework.transaction.annotation.Transactional
    public void resetAttempt(Long sessionId, AuthEntity admin, String remark) {
        ExamSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        if (session.getExam() != null && session.getStudent() != null) {
            submissionRepository.deleteByExam_IdAndStudent_Id(
                    session.getExam().getId(),
                    session.getStudent().getId()
            );
        }

        LocalDateTime now = LocalDateTime.now();
        session.setStartTime(now);
        session.setLastHeartbeat(now);
        session.setStatus(ExamSessionEntity.Status.ACTIVE);
        session.setStatusMessage("Your exam attempt has been fully reset with fresh timing by the coordinator.");
        session.setWarning(null);
        session.setDisconnectCount(0);
        session.setInactiveOverLimit(false);
        session.setCurrentScore(0);
        session.setSavedAnswersJson(null);
        sessionRepository.save(session);

        AdminActionEntity log = new AdminActionEntity();
        log.setAdmin(admin);
        log.setSession(session);
        log.setAction(AdminActionEntity.ActionType.RESET_ATTEMPT);
        log.setRemark(remark != null && !remark.isBlank() ? remark : "Coordinator granted fresh exam attempt with reset timing.");
        log.setTimestamp(now);
        actionRepository.save(log);
    }

    /**
     * Resets a candidate's attempt by examId and studentId.
     */
    @org.springframework.transaction.annotation.Transactional
    public void resetStudentAttempt(Long examId, Long studentId, AuthEntity admin, String remark) {
        submissionRepository.deleteByExam_IdAndStudent_Id(examId, studentId);

        var sessionOpt = sessionRepository.findByExam_IdAndStudent_Id(examId, studentId);
        if (sessionOpt.isEmpty()) {
            return;
        }
        ExamSessionEntity session = sessionOpt.get();

        LocalDateTime now = LocalDateTime.now();
        session.setStartTime(now);
        session.setLastHeartbeat(now);
        session.setStatus(ExamSessionEntity.Status.ACTIVE);
        session.setStatusMessage("Your exam attempt has been fully reset with fresh timing by the coordinator.");
        session.setWarning(null);
        session.setDisconnectCount(0);
        session.setInactiveOverLimit(false);
        session.setCurrentScore(0);
        session.setSavedAnswersJson(null);
        sessionRepository.save(session);

        AdminActionEntity log = new AdminActionEntity();
        log.setAdmin(admin);
        log.setSession(session);
        log.setAction(AdminActionEntity.ActionType.RESET_ATTEMPT);
        log.setRemark(remark != null && !remark.isBlank() ? remark : "Coordinator granted fresh exam attempt with reset timing.");
        log.setTimestamp(now);
        actionRepository.save(log);
    }
}
