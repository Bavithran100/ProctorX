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

    public void performAction(
            Long sessionId,
            AuthEntity admin,
            AdminActionEntity.ActionType action,
            String remark
    ) {
        ExamSessionEntity session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        if (session.getStatus() == ExamSessionEntity.Status.SUBMITTED
                || session.getStatus() == ExamSessionEntity.Status.TERMINATED) {
            throw new IllegalStateException("Session is already closed");
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
}
